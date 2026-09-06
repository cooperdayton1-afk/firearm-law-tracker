"""
Upload filtered_bills_<state>.json (confirmed matches) and
needs_review_<state>.json (ambiguous matches) into the Supabase bills table.

Uses upsert on legiscan_bill_id, so re-running this after a fresh
sync_bills.py run safely updates existing rows instead of duplicating them.

Usage:
    python scripts/upload_to_supabase.py CA
"""

import os
import sys
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

FILTERED_PATH_TEMPLATE = "filtered_bills_{state}.json"
REVIEW_PATH_TEMPLATE = "needs_review_{state}.json"


def load_json(path: str) -> list[dict]:
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def to_row(record: dict, state: str, reviewed: bool, is_gun_related) -> dict:
    """Map our script's field names to the actual Supabase column names."""
    return {
        "legiscan_bill_id": record.get("bill_id"),
        "state": state,
        "session_name": record.get("session_name"),
        "bill_number": record.get("number"),
        "title": record.get("title"),
        "description": record.get("description"),
        "status": record.get("status"),
        "last_action": record.get("last_action"),
        "last_action_date": record.get("last_action_date"),
        "change_hash": record.get("change_hash"),
        "url": record.get("url"),
        "matched_keywords": record.get("matched_keywords"),
        "corroborating_terms": record.get("corroborating_terms"),
        "subjects": record.get("subjects"),
        "sponsors": record.get("sponsors"),
        "is_gun_related": is_gun_related,
        "reviewed": reviewed,
    }


def main():
    state = sys.argv[1] if len(sys.argv) > 1 else "CA"

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY not set in .env")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    confirmed = load_json(FILTERED_PATH_TEMPLATE.format(state=state))
    review = load_json(REVIEW_PATH_TEMPLATE.format(state=state))

    rows = []
    rows += [to_row(r, state, reviewed=True, is_gun_related=True) for r in confirmed]
    rows += [to_row(r, state, reviewed=False, is_gun_related=None) for r in review]

    if not rows:
        print(f"No new or changed bills for {state}, skipping upload.")
        return

    print(f"Uploading {len(rows)} rows for {state} "
          f"({len(confirmed)} confirmed, {len(review)} needs review)...")

    result = supabase.table("bills").upsert(
        rows, on_conflict="legiscan_bill_id"
    ).execute()

    print(f"Upload complete. {len(result.data)} rows affected.")


if __name__ == "__main__":
    main()
