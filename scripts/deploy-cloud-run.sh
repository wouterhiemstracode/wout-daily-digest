#!/usr/bin/env bash
# Deploy wout.daily to Google Cloud Run and schedule the morning briefing.
# Run it in Google Cloud Shell (console.cloud.google.com → the >_ button), from the repo:
#
#   git clone https://github.com/wouterhiemstracode/wout-daily-digest && cd wout-daily-digest
#   bash scripts/deploy-cloud-run.sh            # first run creates .env.production to fill in
#
# Run it again any time to deploy the latest code. Settings live in .env.production
# (never committed); SESSION_SECRET and CRON_SECRET are generated for you.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env.production}"
SERVICE="${SERVICE:-wout-daily}"
REGION="${REGION:-europe-west1}"
JOB="${SERVICE}-morning"

if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<'EOF'
# wout.daily production settings. Fill in the empty values, then run the deploy script again.
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ALLOWED_EMAILS=
ANTHROPIC_API_KEY=
# Optional: when the morning briefing runs (cron, in TIME_ZONE)
SCHEDULE=15 6 * * *
TIME_ZONE=Europe/Amsterdam
EOF
  echo "Created $ENV_FILE. Open it (Cloud Shell: 'Open Editor'), fill in the values, and run this script again."
  exit 1
fi

# Read KEY=VALUE lines literally (not as shell code): connection strings contain "&".
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in "" | \#*) continue ;; esac
  key="${line%%=*}"
  value="${line#*=}"
  case "$value" in \"*\") value="${value:1:${#value}-2}" ;; \'*\') value="${value:1:${#value}-2}" ;; esac
  export "$key=$value"
done < "$ENV_FILE"

missing=()
for name in DATABASE_URL GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET ALLOWED_EMAILS ANTHROPIC_API_KEY; do
  [ -n "${!name:-}" ] || missing+=("$name")
done
if [ ${#missing[@]} -gt 0 ]; then
  echo "Fill in these values in $ENV_FILE first: ${missing[*]}" >&2
  exit 1
fi

# Secrets the app needs but nobody has to type: generated once, kept in the env file.
for name in SESSION_SECRET CRON_SECRET; do
  if [ -z "${!name:-}" ]; then
    value="$(openssl rand -hex 32)"
    printf '%s=%s\n' "$name" "$value" >> "$ENV_FILE"
    export "$name=$value"
  fi
done

PROJECT="$(gcloud config get-value project 2>/dev/null)"
if [ -z "$PROJECT" ]; then
  echo "No Google Cloud project selected. Run: gcloud config set project <your-project-id>" >&2
  exit 1
fi
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
# Cloud Run's address is known before the first deploy, so sign-in works straight away.
APP_URL="https://${SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app"

echo "→ Project $PROJECT, region $REGION, app $APP_URL"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com cloudscheduler.googleapis.com --quiet

# New projects build with the Compute Engine default service account, which can't
# build yet: give it the Cloud Run builder role (harmless if it already has it).
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/run.builder" --condition=None --quiet >/dev/null

vars_file="$(mktemp)"
trap 'rm -f "$vars_file"' EXIT
python3 - "$vars_file" <<'PY'
import json, os, sys
names = ["DATABASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "ALLOWED_EMAILS",
         "ANTHROPIC_API_KEY", "SESSION_SECRET", "CRON_SECRET", "APP_URL", "WEBHOOK_SECRET"]
with open(sys.argv[1], "w") as f:
    for n in names:
        if os.environ.get(n):
            f.write(f"{n}: {json.dumps(os.environ[n])}\n")
PY
export APP_URL

echo "→ Building and deploying (takes a few minutes the first time)"
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --env-vars-file "$vars_file" \
  --timeout 900 \
  --memory 512Mi \
  --max-instances 1 \
  --quiet

actual_url="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
if [ "$actual_url" != "$APP_URL" ]; then
  echo "→ Cloud Run gave the address $actual_url; updating APP_URL"
  APP_URL="$actual_url"
  gcloud run services update "$SERVICE" --region "$REGION" --update-env-vars "APP_URL=$APP_URL" --quiet
fi

echo "→ Scheduling the morning briefing (${SCHEDULE:-15 6 * * *}, ${TIME_ZONE:-Europe/Amsterdam})"
schedule_args=(
  --location "$REGION"
  --schedule "${SCHEDULE:-15 6 * * *}"
  --time-zone "${TIME_ZONE:-Europe/Amsterdam}"
  --uri "$APP_URL/api/jobs/daily"
  --http-method POST
  --attempt-deadline 900s
  --quiet
)
if gcloud scheduler jobs describe "$JOB" --location "$REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$JOB" "${schedule_args[@]}" --update-headers "x-cron-secret=$CRON_SECRET"
else
  gcloud scheduler jobs create http "$JOB" "${schedule_args[@]}" --headers "x-cron-secret=$CRON_SECRET"
fi

cat <<EOF

✓ wout.daily is live: $APP_URL

In Google Auth Platform, if you haven't yet:
  Clients → your client → Authorized redirect URIs:  $APP_URL/api/auth/google/callback
  Branding → App home page:                          $APP_URL
  Branding → Privacy policy link:                    $APP_URL/privacy
EOF
