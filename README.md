# Gun Law Tracker — Step 1: Prove the connection

## Setup

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env and paste your real LegiScan API key
```

## Run

```bash
python scripts/test_masterlist.py CA
```

Swap `CA` for any two-letter state code, or `US` for federal/Congress.

## What to look for

- It should print a session name and a bill count for that state.
- Each sample bill has a `change_hash`. That hash is the whole trick for
  staying inside the free API tier: tomorrow, we fetch the master list
  again, compare hashes to what we stored today, and only call `getBill`
  (the expensive detail call) for bills whose hash changed.
- If this runs cleanly for one state, the pattern works for all 51 (50
  states + Congress) — next step is looping over all of them and storing
  results in Postgres instead of just printing them.

## Next steps (not built yet)

1. Loop over all 51 jurisdictions, store master list + change_hash in Postgres (Supabase).
2. Add the classifier (LegiScan subject tags + keyword backstop) to flag gun-related bills.
3. Daily cron via GitHub Actions to run the diff-and-fetch job.
4. React dashboard reading from Supabase, state toggle + review queue for low-confidence matches.
