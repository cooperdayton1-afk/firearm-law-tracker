"""
Daily progress refresh for Colorado bills.

1. Pulls Colorado's session list from LegiScan (1 query) and saves each
   session's "sine die" flag (whether it has officially adjourned) to the
   Supabase `sessions` table.
2. For every bill we still care about (not archived, not already final, and
   in a session that is still open), re-fetches the bill from LegiScan and
   updates its status, current committee, and last action.

Bills in sessions that have ended are not re-fetched, so this costs almost
nothing outside the legislative session.

Usage:
    python scripts/update_bill_progress.py
"""

import os
import sys
import time
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

STATE = "CO"
API_KEY = os.getenv("LEGISCAN_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BASE_URL = "https://api.legiscan.com/"

# LegiScan status codes that mean a bill is done: Passed, Vetoed, Failed
FINAL_STATUSES = {4, 5, 6}


def legiscan(op: str, **params) -> dict:
    query = {"key": API_KEY, "op": op, **params}
    for attempt in range(3):
        try:
            resp = requests.get(BASE_URL, params=query, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            if data.get("status") != "OK":
                raise RuntimeError(f"LegiScan error for {op}: {data}")
            return data
        except (requests.RequestException, ValueError):
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))


def fetch_all_bills(supabase) -> list[dict]:
    """Read every Colorado bill row, 1,000 at a time."""
    rows, start, page = [], 0, 1000
    while True:
        result = (
            supabase.table("bills")
            .select("id, legiscan_bill_id, session_name, session_id, status, watchlist_status")
            .eq("state", STATE)
            .range(start, start + page - 1)
            .execute()
        )
        rows += result.data
        if len(result.data) < page:
            return rows
        start += page


def current_committee(bill: dict):
    """LegiScan's `committee` field holds the committee a bill is currently in."""
    committee = bill.get("committee")
    if isinstance(committee, dict) and committee.get("name"):
        return committee["name"]
    return None


def main():
    if not API_KEY:
        raise RuntimeError("LEGISCAN_API_KEY not set")
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY not set")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # --- 1. Sessions -------------------------------------------------------
    sessions = legiscan("getSessionList", state=STATE)["sessions"]
    session_rows = [
        {
            "session_id": int(s["session_id"]),
            "state": STATE,
            "session_name": s.get("session_name"),
            "session_title": s.get("session_title"),
            "year_start": s.get("year_start"),
            "year_end": s.get("year_end"),
            "special": bool(int(s.get("special") or 0)),
            "sine_die": bool(int(s.get("sine_die") or 0)),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        for s in sessions
    ]
    supabase.table("sessions").upsert(session_rows, on_conflict="session_id").execute()
    by_name = {r["session_name"]: r for r in session_rows}
    print(f"Saved {len(session_rows)} {STATE} sessions "
          f"({sum(r['sine_die'] for r in session_rows)} adjourned).")

    # --- 2. Bills ----------------------------------------------------------
    bills = fetch_all_bills(supabase)
    refreshed = skipped = linked = failed = 0

    for row in bills:
        updates = {}
        session = by_name.get(row.get("session_name"))
        if session and row.get("session_id") != session["session_id"]:
            updates["session_id"] = session["session_id"]
            linked += 1

        session_open = session is None or not session["sine_die"]
        status = int(row.get("status") or 0)
        worth_checking = (
            session_open
            and status not in FINAL_STATUSES
            and row.get("watchlist_status") != "archived"
        )

        if worth_checking:
            try:
                bill = legiscan("getBill", id=row["legiscan_bill_id"])["bill"]
            except Exception as exc:  # keep going if one bill fails
                print(f"  ! Could not fetch bill {row['legiscan_bill_id']}: {exc}")
                failed += 1
            else:
                committee = current_committee(bill)
                updates["status"] = bill.get("status")
                updates["in_committee"] = committee is not None
                updates["committee_name"] = committee
                history = bill.get("history") or []
                if history:
                    updates["last_action"] = history[-1].get("action")
                    updates["last_action_date"] = history[-1].get("date")
                refreshed += 1
        else:
            skipped += 1

        if updates:
            supabase.table("bills").update(updates).eq("id", row["id"]).execute()

    print(f"Bills: {refreshed} refreshed from LegiScan, {skipped} skipped "
          f"(final, archived, or session over), {linked} linked to a session, "
          f"{failed} failed.")

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
