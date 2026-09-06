"""
One-off: fetch a state's master list and print titles for specific bill
numbers, to investigate why a keyword match changed between script runs.

Usage:
    python scripts/lookup_titles.py CA AB1596 AB2302 AB2721 AR140 SB1151 SR135
"""

import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("LEGISCAN_API_KEY")
BASE_URL = "https://api.legiscan.com/"


def main():
    state = sys.argv[1]
    wanted_numbers = {n.upper() for n in sys.argv[2:]}

    params = {"key": API_KEY, "op": "getMasterList", "state": state}
    resp = requests.get(BASE_URL, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    masterlist = data["masterlist"]
    masterlist.pop("session", None)

    for bill in masterlist.values():
        number = (bill.get("number") or "").upper()
        if number in wanted_numbers:
            print(f"{number}: {bill.get('title')}")


if __name__ == "__main__":
    main()
