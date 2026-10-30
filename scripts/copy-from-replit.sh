#!/usr/bin/env bash
# One-time move of your wout.daily data (sources, emails, editions, stories, ratings)
# from Replit's database to Railway's. Run it in the Replit Shell:
#
#   RAILWAY_DATABASE_URL='postgresql://…(Railway → Postgres → Connect → public URL)' bash scripts/copy-from-replit.sh
#
# Deploy to Railway first, so the tables exist there. Gmail tokens are not copied:
# you sign in with Google again on the new app.
set -euo pipefail

SOURCE="${SOURCE_DATABASE_URL:-${DATABASE_URL:?Run this in the Replit Shell, where DATABASE_URL is the Replit database}}"
TARGET="${RAILWAY_DATABASE_URL:?Set RAILWAY_DATABASE_URL to the Railway Postgres public URL}"
TABLES=(senders emails digests digest_sections stories feedback)

if ! existing=$(psql "$TARGET" -Atc "select count(*) from digests" 2>/dev/null); then
  echo "The Railway database has no wout.daily tables yet. Deploy the app on Railway first." >&2
  exit 1
fi
if [ "$existing" != "0" ]; then
  echo "The Railway database already has $existing editions; not copying over them." >&2
  exit 1
fi

pg_dump "$SOURCE" --data-only --no-owner --no-privileges "${TABLES[@]/#/--table=}" \
  | psql -q -v ON_ERROR_STOP=1 "$TARGET" > /dev/null

for t in "${TABLES[@]}"; do
  printf '%-16s %6s → %s\n' "$t" "$(psql "$SOURCE" -Atc "select count(*) from $t")" "$(psql "$TARGET" -Atc "select count(*) from $t")"
done
echo "Done. Open the Railway app and sign in with Google."
