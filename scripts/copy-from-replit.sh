#!/usr/bin/env bash
# One-time move of your wout.daily data (sources, emails, editions, stories, ratings)
# from Replit's database to the new one (Neon). Run it in the Replit Shell:
#
#   TARGET_DATABASE_URL='postgresql://…(Neon → Connection string)' bash scripts/copy-from-replit.sh
#
# Deploy the app first: it creates the tables on startup. Gmail tokens are not copied:
# you sign in with Google again on the new app.
set -euo pipefail

SOURCE="${SOURCE_DATABASE_URL:-${DATABASE_URL:?Run this in the Replit Shell, where DATABASE_URL is the Replit database}}"
TARGET="${TARGET_DATABASE_URL:?Set TARGET_DATABASE_URL to the new database (Neon connection string)}"
TABLES=(senders emails digests digest_sections stories feedback)

if ! existing=$(psql "$TARGET" -Atc "select count(*) from digests" 2>/dev/null); then
  echo "The new database has no wout.daily tables yet. Deploy the app first; it creates them." >&2
  exit 1
fi
if [ "$existing" != "0" ]; then
  echo "The new database already has $existing editions; not copying over them." >&2
  exit 1
fi

pg_dump "$SOURCE" --data-only --no-owner --no-privileges "${TABLES[@]/#/--table=}" \
  | psql -q -v ON_ERROR_STOP=1 "$TARGET" > /dev/null

for t in "${TABLES[@]}"; do
  printf '%-16s %6s → %s\n' "$t" "$(psql "$SOURCE" -Atc "select count(*) from $t")" "$(psql "$TARGET" -Atc "select count(*) from $t")"
done
echo "Done. Open the app and sign in with Google."
