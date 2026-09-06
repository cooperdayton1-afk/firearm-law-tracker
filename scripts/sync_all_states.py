"""
Runs sync_bills.py and upload_to_supabase.py for every state + federal
legislation, one at a time. Meant to be run daily via GitHub Actions.

Usage:
    python scripts/sync_all_states.py
"""

import subprocess
import sys

STATES = ["CO"]


def run_for_state(state: str) -> bool:
    print(f"\n{'=' * 60}")
    print(f"Syncing {state}")
    print("=" * 60)

    sync_result = subprocess.run(
        [sys.executable, "scripts/sync_bills.py", state]
    )
    if sync_result.returncode != 0:
        print(f"sync_bills.py failed for {state}, skipping upload")
        return False

    upload_result = subprocess.run(
        [sys.executable, "scripts/upload_to_supabase.py", state]
    )
    if upload_result.returncode != 0:
        print(f"upload_to_supabase.py failed for {state}")
        return False

    return True


def main():
    failed_states = []
    for state in STATES:
        success = run_for_state(state)
        if not success:
            failed_states.append(state)

    print(f"\n{'=' * 60}")
    print(f"Done. {len(STATES) - len(failed_states)}/{len(STATES)} succeeded.")
    if failed_states:
        print(f"Failed: {', '.join(failed_states)}")
        sys.exit(1)


if __name__ == "__main__":
    main()