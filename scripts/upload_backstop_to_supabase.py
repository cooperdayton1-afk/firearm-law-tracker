"""
Upload backstop_confirmed_<state>.json and backstop_needs_review_<state>.json
(from search_backstop.py) into the same Supabase bills table used by the
daily sync. Uses the same upsert-on-legiscan_bill_id approach.

Usage:
    python scripts/upload_backstop_to_supabase.py
"""

import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

STATES = ["CO"]
CONFIRMED_PATH_TEMPLATE = "backstop_confirmed_{state}.json"
REVIEW_PATH_TEMPLATE = "backstop_needs_review_{state}.json"


def load_json(path: str) -> list[dict]:
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def to_row(record: dict, state: str, reviewed: bool, is_gun_related) -> dict:
    return {
        "legiscan_bill_id": int(record.get("bill_id")),
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


def upload_for_state(supabase, state: str) -> None:
    confirmed = load_json(CONFIRMED_PATH_TEMPLATE.format(state=state))
    review = load_json(REVIEW_PATH_TEMPLATE.format(state=state))

    rows = []
    rows += [to_row(r, state, reviewed=True, is_gun_related=True) for r in confirmed]
    rows += [to_row(r, state, reviewed=False, is_gun_related=None) for r in review]

    if not rows:
        print(f"No backstop rows for {state}, skipping upload.")
        return

        print(f"Uploading {len(rows)} backstop rows for {state} "
          f"({len(confirmed)} confirmed, {len(review)} needs review)...")

    BATCH_SIZE = 250
    total_affected = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        print(f"  Uploading batch {batch_num} ({len(batch)} rows)...")
        result = supabase.table("bills").upsert(
            batch, on_conflict="legiscan_bill_id"
        ).execute()
        total_affected += len(result.data)

    print(f"Upload complete for {state}. {total_affected} rows affected.")


def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY not set in .env")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    for state in STATES:
        upload_for_state(supabase, state)


if __name__ == "__main__":
    main()