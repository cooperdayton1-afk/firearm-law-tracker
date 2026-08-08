"""
Step 1: Prove the LegiScan connection works and inspect what getMasterList
returns for a single state.

This does NOT hit getBill yet — getMasterList is cheap and gives us the
change_hash for every bill in the state's current session, which is what
we'll use tomorrow to detect what actually changed instead of re-fetching
everything.

Usage:
    python scripts/test_masterlist.py CA
    python scripts/test_masterlist.py US    # US = federal/Congress
"""

import os
import sys
import json
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("LEGISCAN_API_KEY")
BASE_URL = "https://api.legiscan.com/"


def get_master_list(state: str) -> dict:
    if not API_KEY:
        raise RuntimeError(
            "LEGISCAN_API_KEY not set. Copy .env.example to .env and add your key."
        )

    params = {
        "key": API_KEY,
        "op": "getMasterList",
        "state": state,
    }
    resp = requests.get(BASE_URL, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    if data.get("status") != "OK":
        raise RuntimeError(f"LegiScan returned an error: {data}")

    return data["masterlist"]


def main():
    state = sys.argv[1] if len(sys.argv) > 1 else "CA"
    print(f"Fetching master bill list for state: {state}\n")

    masterlist = get_master_list(state)

    # masterlist is a dict keyed by bill_id (plus a "session" metadata entry)
    session_info = masterlist.pop("session", None)
    if session_info:
        print(f"Session: {session_info.get('session_name')} "
              f"(id={session_info.get('session_id')})\n")

    bills = list(masterlist.values())
    print(f"Total bills in master list: {len(bills)}\n")

    print("First 5 bills (this is the shape we'll store and diff daily):")
    for bill in bills[:5]:
        print(json.dumps({
            "bill_id": bill.get("bill_id"),
            "number": bill.get("number"),
            "title": bill.get("title"),
            "change_hash": bill.get("change_hash"),
            "last_action": bill.get("last_action"),
            "last_action_date": bill.get("last_action_date"),
        }, indent=2))


if __name__ == "__main__":
    main()
