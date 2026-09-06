"""
Daily sync: pull a state's master bill list, detect what's new or changed
since the last run (via change_hash), filter changed bills by keyword match
on title, and fetch full bill details (with subjects) only for matches.

This is designed to stay well within LegiScan's 30,000 query/month free
tier: getMasterList costs 1 query per state per day; getBill is only
called for bills that are both (a) new/changed AND (b) keyword-matched.

Usage:
    python scripts/sync_bills.py CA
    python scripts/sync_bills.py US
"""

import os
import sys
import json
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("LEGISCAN_API_KEY")
BASE_URL = "https://api.legiscan.com/"
KEYWORDS_PATH = "keywords.txt"
CACHE_DIR = "data"
CACHE_PATH_TEMPLATE = os.path.join(CACHE_DIR, "last_seen_hashes_{state}.json")
OUTPUT_PATH_TEMPLATE = "filtered_bills_{state}.json"
REVIEW_PATH_TEMPLATE = "needs_review_{state}.json"

# Stronger, less ambiguous terms used to corroborate a title match against
# the bill's subjects/description. If a title match (e.g. "background check")
# is ambiguous on its own, we only keep it if one of these also shows up.
CONFIRMING_TERMS = [
    "firearm", "firearms", "gun", "guns", "ammunition", "ammo",
    "handgun", "rifle", "shotgun", "assault weapon", "assault rifle",
    "concealed carry", "open carry", "ghost gun", "nfa",
    "national firearms act", "federal firearms license",
]


def load_keywords(path: str) -> list[str]:
    keywords = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            keywords.append(line.lower())
    return keywords


def load_hash_cache(state: str) -> dict:
    path = CACHE_PATH_TEMPLATE.format(state=state)
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_hash_cache(state: str, cache: dict) -> None:
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = CACHE_PATH_TEMPLATE.format(state=state)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2)


def get_master_list(state: str) -> dict:
    if not API_KEY:
        raise RuntimeError(
            "LEGISCAN_API_KEY not set. Copy .env.example to .env and add your key."
        )
    params = {"key": API_KEY, "op": "getMasterList", "state": state}
    resp = requests.get(BASE_URL, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "OK":
        raise RuntimeError(f"LegiScan returned an error: {data}")
    return data["masterlist"]


def get_bill(bill_id: int) -> dict:
    params = {"key": API_KEY, "op": "getBill", "id": bill_id}
    resp = requests.get(BASE_URL, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "OK":
        raise RuntimeError(f"LegiScan returned an error for bill {bill_id}: {data}")
    return data["bill"]


import re


def matches_keywords(title: str, keywords: list[str]) -> list[str]:
    title_lower = title.lower()
    hits = []
    for kw in keywords:
        # Word-boundary match so short terms like "nfa" or "ffl" don't match
        # as substrings inside unrelated words (e.g. "unfair", "infants").
        pattern = r"\b" + re.escape(kw) + r"s?\b"
        if re.search(pattern, title_lower):
            hits.append(kw)
    return hits


def main():
    state = sys.argv[1] if len(sys.argv) > 1 else "CA"
    keywords = load_keywords(KEYWORDS_PATH)
    old_hashes = load_hash_cache(state)

    print(f"Loaded {len(keywords)} keywords")
    print(f"Loaded {len(old_hashes)} previously seen bill hashes for {state}\n")

    masterlist = get_master_list(state)
    session_info = masterlist.pop("session", None)
    session_name = session_info.get("session_name") if session_info else None
    bills = list(masterlist.values())
    print(f"Total bills in master list for {state}: {len(bills)}")

    # Step 1: figure out what's new or changed since last run
    changed_bills = []
    new_hashes = {}
    for bill in bills:
        bill_id = str(bill.get("bill_id"))
        change_hash = bill.get("change_hash")
        new_hashes[bill_id] = change_hash
        if old_hashes.get(bill_id) != change_hash:
            changed_bills.append(bill)

    print(f"New or changed since last sync: {len(changed_bills)}\n")

    # Step 2: filter changed bills by title keyword match (free, local, no API cost)
    keyword_matches = []
    for bill in changed_bills:
        hits = matches_keywords(bill.get("title", ""), keywords)
        if hits:
            keyword_matches.append((bill, hits))

    print(f"Of those, matched by title keyword: {len(keyword_matches)}\n")

    # Step 3: fetch full bill details (with subjects), then corroborate the
    # title match against subjects + description before trusting it.
    confirmed = []
    needs_review = []
    for bill, hits in keyword_matches:
        bill_id = bill.get("bill_id")
        print(f"Fetching full details for bill {bill_id} ({bill.get('number')})...")
        full_bill = get_bill(bill_id)

        subjects = full_bill.get("subjects", [])
        subject_names = " ".join(s.get("subject_name", "") for s in subjects).lower()
        description = (full_bill.get("description") or "").lower()
        corroboration_text = subject_names + " " + description

        corroborating_hits = [
            term for term in CONFIRMING_TERMS
            if re.search(r"\b" + re.escape(term) + r"s?\b", corroboration_text)
        ]

        record = {
            "bill_id": bill_id,
            "number": bill.get("number"),
            "title": bill.get("title"),
            "session_name": session_name,
            "matched_keywords": hits,
            "corroborating_terms": corroborating_hits,
            "change_hash": bill.get("change_hash"),
            "last_action": bill.get("last_action"),
            "last_action_date": bill.get("last_action_date"),
            "subjects": subjects,
            "description": full_bill.get("description"),
            "status": full_bill.get("status"),
            "status_date": full_bill.get("status_date"),
            "sponsors": full_bill.get("sponsors", []),
            "url": full_bill.get("url"),
        }

        # If the title match itself was already an unambiguous firearm term,
        # or subjects/description corroborate it, trust it. Otherwise flag
        # for manual review rather than silently keeping or dropping it.
        title_hit_is_strong = any(hit in CONFIRMING_TERMS for hit in hits)
        if title_hit_is_strong or corroborating_hits:
            confirmed.append(record)
        else:
            needs_review.append(record)

    out_path = OUTPUT_PATH_TEMPLATE.format(state=state)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(confirmed, f, indent=2)
    print(f"\nSaved {len(confirmed)} confirmed matches to {out_path}")

    review_path = REVIEW_PATH_TEMPLATE.format(state=state)
    with open(review_path, "w", encoding="utf-8") as f:
        json.dump(needs_review, f, indent=2)
    print(f"Saved {len(needs_review)} ambiguous matches to {review_path} for manual review")

    # Step 4: update the hash cache for next run (only after everything succeeded)
    save_hash_cache(state, new_hashes)
    print(f"Updated hash cache: {CACHE_PATH_TEMPLATE.format(state=state)}")


if __name__ == "__main__":
    main()
