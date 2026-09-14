#!/usr/bin/env bash
#
# Brings up the MSME marketplace on a fresh Ubuntu 24.04 EC2 box with k3s.
#
#   sudo ./scripts/aws-bootstrap.sh
#
# Idempotent: safe to re-run after a failure, after a reboot, or to roll out a
# new image. Each step checks whether it has already been done.
#
# Secrets come from /opt/msme/.env and nowhere else - not from arguments, not
# from the environment, and never into the log. See "Secret handling" below.
#
# Optional environment overrides:
#   ACME_ISSUER=letsencrypt-staging   use the staging CA (see aws/README.md)
#   CERT_MANAGER_VERSION=v1.21.2      pin a different cert-manager
#   ENV_FILE=/path/to/.env            read the credentials from somewhere else

# ── Secret handling ──────────────────────────────────────────────────────────
# `set +x` before anything else, and it is never turned back on. Every shell
# this script runs inherits it, so even `bash -x aws-bootstrap.sh` cannot trace
# a line that touches the credential file. This is not theoretical: tracing a
# `. .env` is exactly how MONGO_URL, JWT_SECRET and the Google client secret
# ended up in plain text in a CI log on this project once already.
set +x
set -Eeuo pipefail

ENV_FILE="${ENV_FILE:-/opt/msme/.env}"
NAMESPACE="msme"
OVERLAY="k8s/overlays/aws"
CERT_MANAGER_VERSION="${CERT_MANAGER_VERSION:-v1.21.2}"
ACME_ISSUER="${ACME_ISSUER:-letsencrypt-prod}"
KUBECONFIG_PATH="/etc/rancher/k3s/k3s.yaml"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

log()  { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '    \033[32mok\033[0m  %s\n' "$*"; }
warn() { printf '    \033[33m!!\033[0m  %s\n' "$*"; }
die()  { printf '\n\033[1;31mfailed:\033[0m %s\n' "$*" >&2; exit 1; }

# Reads ONE key out of the credential file. Values are returned on stdout for
# the caller to consume directly; nothing is exported, echoed or logged.
read_env() {
  local key="$1"
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -1 | tr -d '\r'
}

# ── 1. Preflight ─────────────────────────────────────────────────────────────
log "Preflight"

[[ $EUID -eq 0 ]] || die "run with sudo: sudo $0"
[[ -f "$ENV_FILE" ]] || die "$ENV_FILE not found. Copy it to the box first - see aws/README.md."

# A world-readable credential file on a shared box is worth stopping for.
PERMS="$(stat -c '%a' "$ENV_FILE")"
if [[ "$PERMS" != "600" && "$PERMS" != "400" ]]; then
  warn "$ENV_FILE is mode $PERMS; tightening to 600"
  chmod 600 "$ENV_FILE"
fi
ok "credential file present (mode $(stat -c '%a' "$ENV_FILE"))"

MISSING=()
for key in MONGO_URL JWT_SECRET ACME_EMAIL; do
  [[ -n "$(read_env "$key")" ]] || MISSING+=("$key")
done
[[ ${#MISSING[@]} -eq 0 ]] || die "missing from $ENV_FILE: ${MISSING[*]}"
ok "required keys present (values not shown)"

# ── 2. Public IP ─────────────────────────────────────────────────────────────
# nip.io resolves <anything>.<dashed-ip>.nip.io to that IP, which is how this
# gets a real hostname - and therefore a real TLS certificate - with no domain.
log "Resolving public IP"

PUBLIC_IP="$(read_env PUBLIC_IP)"
if [[ -z "$PUBLIC_IP" ]]; then
  # IMDSv2: token first, then the query. Ubuntu 24.04 AMIs default to v2-only.
  IMDS_TOKEN="$(curl -sS -X PUT "http://169.254.169.254/latest/api/token" \
      -H "X-aws-ec2-metadata-token-ttl-seconds: 300" --max-time 3 2>/dev/null || true)"
  if [[ -n "$IMDS_TOKEN" ]]; then
    PUBLIC_IP="$(curl -sS -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" \
        --max-time 3 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"
  fi
fi

[[ -n "$PUBLIC_IP" ]] || die "could not determine the public IP. Set PUBLIC_IP=x.x.x.x in $ENV_FILE."
[[ "$PUBLIC_IP" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]] || die "PUBLIC_IP '$PUBLIC_IP' is not an IPv4 address"

IP_DASHED="${PUBLIC_IP//./-}"
APP_HOST="msme.${IP_DASHED}.nip.io"
ok "public IP $PUBLIC_IP  ->  https://${APP_HOST}"

# ── 3. k3s ───────────────────────────────────────────────────────────────────
log "Installing k3s"

if command -v k3s >/dev/null 2>&1; then
  ok "k3s already installed ($(k3s --version 2>/dev/null | head -1))"
else
  # Traefik is left enabled: it is what this overlay's Ingress targets, and on
  # a 2 GiB node it is ~100Mi cheaper than swapping in ingress-nginx.
  # write-kubeconfig-mode 644 lets the ubuntu user run kubectl without sudo.
  # On a single-operator box that is the right trade; on a shared one it is not.
  curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644" sh -
  ok "k3s installed"
fi

export KUBECONFIG="$KUBECONFIG_PATH"
[[ -f "$KUBECONFIG" ]] || die "k3s kubeconfig not at $KUBECONFIG"

log "Waiting for the node to be Ready"
# `kubectl wait --all` does NOT wait for a resource to come into existence: with
# no node registered yet it returns "no matching resources found" and exits
# non-zero immediately. On a fresh k3s install the API server accepts
# connections a good 20s before the kubelet registers the node, so waiting for
# the object to appear has to come first, or the bootstrap dies on a healthy box.
for _ in $(seq 1 60); do
  kubectl get nodes --no-headers 2>/dev/null | grep -q . && break
  sleep 5
done
kubectl wait --for=condition=Ready node --all --timeout=300s >/dev/null \
  || die "node never became Ready. Check: journalctl -u k3s -n 100"
ok "node Ready"

# ── 4. cert-manager ──────────────────────────────────────────────────────────
log "Installing cert-manager ${CERT_MANAGER_VERSION}"

if kubectl get crd clusterissuers.cert-manager.io >/dev/null 2>&1; then
  ok "cert-manager CRDs already present"
else
  kubectl apply -f \
    "https://github.com/cert-manager/cert-manager/releases/download/${CERT_MANAGER_VERSION}/cert-manager.yaml"
  ok "cert-manager manifests applied"
fi

log "Waiting for cert-manager to be ready"
for d in cert-manager cert-manager-webhook cert-manager-cainjector; do
  kubectl -n cert-manager rollout status "deployment/$d" --timeout=300s >/dev/null \
    || die "cert-manager deployment $d never became ready"
done
ok "cert-manager running"

# ── 4b. Traefik CRDs ─────────────────────────────────────────────────────────
# The overlay ships a Traefik Middleware (the http->https redirect) using the
# traefik.io/v1alpha1 group, which is Traefik v3 - what current k3s bundles.
# Traefik v2 used traefik.containo.us/v1alpha1. Checking here turns an
# otherwise cryptic "no matches for kind Middleware" into something actionable.
log "Checking Traefik CRDs"
# k3s installs Traefik through a helm-controller Job, so on a freshly installed
# cluster the CRDs arrive up to a minute after the node goes Ready. Without this
# wait the check below reports a false negative and the overlay apply then fails
# on "no matches for kind Middleware".
for _ in $(seq 1 36); do
  kubectl get crd middlewares.traefik.io >/dev/null 2>&1 && break
  sleep 5
done
if kubectl get crd middlewares.traefik.io >/dev/null 2>&1; then
  ok "Traefik v3 CRDs present"
else
  warn "middlewares.traefik.io not found."
  warn "If this k3s bundles Traefik v2, change apiVersion in"
  warn "k8s/overlays/aws/redirect-middleware.yaml to traefik.containo.us/v1alpha1."
  warn "If Traefik was disabled entirely, this overlay's Ingress has no controller."
fi

# ── 5. Namespace ─────────────────────────────────────────────────────────────
log "Namespace"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
ok "namespace $NAMESPACE"

# ── 6. Secret ────────────────────────────────────────────────────────────────
# Delegated to k8s/make-secret.sh, which is the single definition of which keys
# are secret. It copies only those, so deployment config in .env (PORT,
# CLIENT_URL, NODE_ENV...) cannot override what the ConfigMap sets. It prints
# a key count, never a value.
log "Creating the application Secret from $ENV_FILE"
MSME_ENV_FILE="$ENV_FILE" ./k8s/make-secret.sh "$NAMESPACE"

# ── 7. Apply the overlay ─────────────────────────────────────────────────────
# The committed overlay carries placeholders so it stays reviewable and
# rendering-checkable with a plain `kubectl kustomize`. They are substituted
# here, on the way to the cluster. ACME_EMAIL is not a secret, but it is
# personal, so it lives in .env rather than in git.
log "Applying $OVERLAY for $APP_HOST (issuer: $ACME_ISSUER)"

ACME_EMAIL="$(read_env ACME_EMAIL)"

RENDERED="$(mktemp)"
# Deleted on every exit path, including a failure part-way through.
trap 'rm -f "$RENDERED"' EXIT
chmod 600 "$RENDERED"

kubectl kustomize "$OVERLAY" \
  | sed -e "s/PUBLIC-IP-PLACEHOLDER/${IP_DASHED}/g" \
        -e "s/ACME-EMAIL-PLACEHOLDER/${ACME_EMAIL}/g" \
        -e "s/cert-manager.io\/cluster-issuer: letsencrypt-prod/cert-manager.io\/cluster-issuer: ${ACME_ISSUER}/" \
  > "$RENDERED"

# Written as an explicit `if` rather than `grep ... && die`: under `set -e` the
# short form is correct but relies on the AND-list exemption, which is exactly
# the kind of subtlety that gets "simplified" into a bug later.
if grep -q 'PUBLIC-IP-PLACEHOLDER\|ACME-EMAIL-PLACEHOLDER' "$RENDERED"; then
  die "a placeholder was left unsubstituted - refusing to apply"
fi

# The cert-manager webhook can accept connections a moment before it will
# admit a ClusterIssuer. Retry rather than fail the whole bootstrap on it.
applied=0
for attempt in 1 2 3 4 5; do
  if kubectl apply -f "$RENDERED"; then
    applied=1
    break
  fi
  warn "apply failed (attempt $attempt/5), retrying in 10s - usually the cert-manager webhook still warming up"
  sleep 10
done
[[ $applied -eq 1 ]] || die "could not apply the overlay"
ok "overlay applied"

# ── 8. Wait for the app ──────────────────────────────────────────────────────
log "Waiting for the workloads"
for d in msme-backend msme-frontend msme-recommender; do
  if kubectl -n "$NAMESPACE" rollout status "deployment/$d" --timeout=420s >/dev/null; then
    ok "$d ready"
  else
    warn "$d did not become ready in time"
    kubectl -n "$NAMESPACE" logs "deployment/$d" --tail=20 2>/dev/null || true
  fi
done

# ── 9. Report ────────────────────────────────────────────────────────────────
log "Status"
kubectl -n "$NAMESPACE" get pods -o wide
echo
kubectl -n "$NAMESPACE" get ingress

echo
log "Certificate"
# Issuance needs port 80 reachable from the internet for the HTTP-01 challenge.
# cert-manager creates the Certificate from the Ingress annotation a moment
# after the Ingress lands, and `kubectl wait` on a resource that does not exist
# yet fails instantly rather than waiting - so let it appear first.
for _ in $(seq 1 24); do
  kubectl -n "$NAMESPACE" get certificate msme-tls >/dev/null 2>&1 && break
  sleep 5
done
if kubectl -n "$NAMESPACE" wait --for=condition=Ready certificate/msme-tls --timeout=300s >/dev/null 2>&1; then
  ok "TLS certificate issued"
else
  warn "certificate not ready yet. It usually takes another minute or two."
  warn "Watch it with:   kubectl -n $NAMESPACE describe certificate msme-tls"
  warn "If it is stuck, the usual cause is port 80 not open to 0.0.0.0/0 in the security group."
fi

echo
log "Done"
printf '    App:     https://%s\n' "$APP_HOST"
printf '    Health:  https://%s/api/products/categories\n' "$APP_HOST"
printf '    Pods:    kubectl -n %s get pods\n' "$NAMESPACE"
echo
