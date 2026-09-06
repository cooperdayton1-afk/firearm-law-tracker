"""
Backstop pass for Colorado + federal legislation: uses LegiScan's getSearch
(which indexes more than just bill titles) to catch gun-related bills whose
official titles don't contain any of our keywords, but whose content/subjects
do. Meant to run twice daily via GitHub Actions.

Usage:
    python scripts/search_backstop.py
"""

import os
import re
import json
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("LEGISCAN_API_KEY")
BASE_URL = "https://api.legiscan.com/"
STATES = ["CO"]
KEYWORDS_PATH = "keywords.txt"
SEEN_CACHE_TEMPLATE = "data/backstop_seen_{state}.json"
CONFIRMED_OUT_TEMPLATE = "backstop_confirmed_{state}.json"
REVIEW_OUT_TEMPLATE = "backstop_needs_review_{state}.json"

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

def has_reached_committee(full_bill: dict) -> bool:
    history = full_bill.get("history", [])
    return any("committee" in (event.get("action") or "").lower() for event in history)

def load_seen_cache(state: str) -> dict:
    path = SEEN_CACHE_TEMPLATE.format(state=state)
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_seen_cache(state: str, cache: dict) -> None:
    os.makedirs("data", exist_ok=True)
    path = SEEN_CACHE_TEMPLATE.format(state=state)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2)


def search_bills(state: str, query: str) -> list[dict]:
    all_results = []
    page = 1
    while True:
        params = {"key": API_KEY, "op": "getSearch", "state": state, "query": query, "page": page}
        resp = requests.get(BASE_URL, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "OK":
            raise RuntimeError(f"LegiScan search error for '{query}' in {state}: {data}")

        results = data.get("searchresult", {})
        summary = results.get("summary", {})
        page_results = [v for k, v in results.items() if k != "summary"]

        if not page_results:
            break

        all_results.extend(page_results)

        page_count = int(summary.get("page_current", page))
        count = int(summary.get("count", 0))
        page_size = int(summary.get("page_size", 50))
        total_pages = (count + page_size - 1) // page_size if page_size else 1
        if page_count >= total_pages or not summary:
            break

        page += 1

    return all_results


def get_bill(bill_id: int) -> dict:
    params = {"key": API_KEY, "op": "getBill", "id": bill_id}
    resp = requests.get(BASE_URL, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "OK":
        raise RuntimeError(f"LegiScan error for bill {bill_id}: {data}")
    return data["bill"]


def run_for_state(state: str, keywords: list[str]) -> None:
    print(f"\n{'=' * 60}")
    print(f"Backstop search: {state}")
    print("=" * 60)

    seen = load_seen_cache(state)

    candidate_bills = {}  # bill_id -> change_hash
    matched_keywords_by_bill = {}  # bill_id -> set of keywords that matched it

    for kw in keywords:
        results = search_bills(state, kw)
        for r in results:
            bill_id = r.get("bill_id")
            change_hash = r.get("change_hash")
            if bill_id:
                bid = str(bill_id)
                candidate_bills[bid] = change_hash
                matched_keywords_by_bill.setdefault(bid, set()).add(kw)

    print(f"Found {len(candidate_bills)} unique candidate bills")

    new_or_changed = {
        bid: chash for bid, chash in candidate_bills.items()
        if seen.get(bid) != chash
    }
    print(f"New or changed since last backstop run: {len(new_or_changed)}")

    confirmed = []
    needs_review = []

    for bill_id, change_hash in new_or_changed.items():
        print(f"Fetching full details for bill {bill_id}...")
        full_bill = get_bill(int(bill_id))

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
            "number": full_bill.get("bill_number"),
            "title": full_bill.get("title"),
            "session_name": (full_bill.get("session") or {}).get("session_name"),
            "matched_keywords": sorted(matched_keywords_by_bill.get(bill_id, [])),
            "corroborating_terms": corroborating_hits,
            "change_hash": change_hash,
            "last_action": full_bill.get("last_action"),
            "last_action_date": full_bill.get("last_action_date"),
            "subjects": subjects,
            "description": full_bill.get("description"),
            "status": full_bill.get("status"),
            "sponsors": full_bill.get("sponsors", []),
            "url": full_bill.get("url"),
        }

        if state == "US" and not has_reached_committee(full_bill):
            continue  # skip federal bills that never made it to committee

        matched_kws = matched_keywords_by_bill.get(bill_id, set())
        keyword_hit_is_strong = any(kw in CONFIRMING_TERMS for kw in matched_kws)

        if keyword_hit_is_strong or corroborating_hits:
            confirmed.append(record)
        else:
            needs_review.append(record)
    confirmed_path = CONFIRMED_OUT_TEMPLATE.format(state=state)
    with open(confirmed_path, "w", encoding="utf-8") as f:
        json.dump(confirmed, f, indent=2)
    print(f"Saved {len(confirmed)} confirmed matches to {confirmed_path}")

    review_path = REVIEW_OUT_TEMPLATE.format(state=state)
    with open(review_path, "w", encoding="utf-8") as f:
        json.dump(needs_review, f, indent=2)
    print(f"Saved {len(needs_review)} ambiguous matches to {review_path}")

    save_seen_cache(state, candidate_bills)


def main():
    if not API_KEY:
        raise RuntimeError("LEGISCAN_API_KEY not set")

    keywords = load_keywords(KEYWORDS_PATH)
    print(f"Loaded {len(keywords)} keyword terms")

    for state in STATES:
        run_for_state(state, keywords)


if __name__ == "__main__":
    main()