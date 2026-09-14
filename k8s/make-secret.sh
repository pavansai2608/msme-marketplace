#!/usr/bin/env bash
# Creates the msme-secrets Secret from msme-backend/.env.
#
# Only genuinely secret keys are copied. The rest of .env (PORT, NODE_ENV,
# CLIENT_URL, RECOMMENDER_URL, GOOGLE_CALLBACK_URL) is deployment config and
# belongs to the ConfigMap - copying it here would let a developer's laptop
# .env silently override the cluster's own settings.
#
#   ./k8s/make-secret.sh [namespace]
#
# MSME_ENV_FILE overrides where the .env is read from. CI has no working copy
# of it - Jenkins hands the file over as a Secret file credential at a path it
# chooses - so the location has to be injectable rather than fixed.
set -euo pipefail

NS="${1:-msme}"
ENV_FILE="${MSME_ENV_FILE:-$(dirname "$0")/../msme-backend/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found" >&2
  exit 1
fi

SECRET_KEYS=(
  MONGO_URL
  JWT_SECRET
  JWT_REFRESH_SECRET
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  EMAIL_SERVICE
  EMAIL_USER
  EMAIL_PASS
  FROM_NAME
  FROM_EMAIL
  SHIPROCKET_EMAIL
  SHIPROCKET_PASSWORD
)

# Spelled out rather than `mktemp -t msme-secret`: BSD mktemp (macOS) treats the
# argument as a prefix and appends its own suffix, but GNU mktemp (the Ubuntu
# box) requires an explicit template of at least three X's and errors out with
# "too few X's in template". An explicit path with X's is correct on both.
TMP="$(mktemp "${TMPDIR:-/tmp}/msme-secret.XXXXXX")"
# Deleted on any exit path, including a failure part-way through.
trap 'rm -f "$TMP"' EXIT

for key in "${SECRET_KEYS[@]}"; do
  # Last match wins, matching dotenv's own behaviour for a duplicated key.
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -1 || true)"
  [[ -n "$line" ]] && printf '%s\n' "$line" >> "$TMP"
done

if [[ ! -s "$TMP" ]]; then
  echo "error: none of the expected secret keys were found in $ENV_FILE" >&2
  exit 1
fi

kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

# Recreated rather than patched, so a key removed from .env also disappears
# from the Secret instead of lingering.
kubectl -n "$NS" create secret generic msme-secrets \
  --from-env-file="$TMP" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "msme-secrets created in namespace '$NS' with $(wc -l < "$TMP" | tr -d ' ') key(s)"
