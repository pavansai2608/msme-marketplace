# Kubernetes deployment

Three services on minikube behind an nginx ingress. MongoDB is **not** in the
cluster — the app talks to MongoDB Atlas, and the connection string comes from
`msme-backend/.env`.

```
                      ┌────────────────────────────┐
  browser ──────────▶ │  ingress-nginx  msme.local │
                      └─────┬──────────────────┬───┘
                       /    │                  │  /api
                            ▼                  ▼
                   msme-frontend:80     msme-backend:5000
                   (nginx, 2 replicas)  (node, 2 replicas, HPA 1–5)
                                               │
                                               ▼
                                     msme-recommender:8000
                                     (FastAPI, 1 replica)
                                               │
                                               ▼
                                        MongoDB Atlas
```

## Layout

```
k8s/
├── base/                      # environment-independent manifests
│   ├── namespace.yaml
│   ├── configmap.yaml         # non-secret config
│   ├── secret.example.yaml    # TEMPLATE, committed, placeholders only
│   ├── backend-deployment.yaml    + backend-service.yaml
│   ├── frontend-deployment.yaml   + frontend-service.yaml
│   ├── recommender-deployment.yaml + recommender-service.yaml
│   ├── ingress.yaml           # / → frontend, /api → backend
│   ├── hpa.yaml               # backend 1–5 replicas at 70% CPU
│   └── kustomization.yaml
├── overlays/
│   ├── dev/                   # local images, 1 replica, http://msme.local
│   └── prod/                  # ghcr images, TLS, 2 replicas minimum
├── make-secret.sh             # builds msme-secrets from msme-backend/.env
└── README.md
```

## Prerequisites

- Docker running (minikube uses it as its driver)
- `minikube` and `kubectl` (kubectl ≥ 1.14 has Kustomize built in — no separate
  `kustomize` binary is needed; `kubectl apply -k` is enough)
- `msme-backend/.env` populated with at least `MONGO_URL` and `JWT_SECRET`

## Full deployment, from nothing

```bash
# 1. Start the cluster with the two addons the manifests depend on.
#    ingress serves the Ingress object; metrics-server feeds the HPA.
minikube start --driver=docker --cpus=4 --memory=6144 \
  --addons=ingress,metrics-server

# 2. Wait for the ingress controller to be ready (it pulls a ~300 MB image).
kubectl wait --namespace ingress-nginx \
  --for=condition=Ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=600s

# 3. Build the images INTO the cluster's docker daemon, not the host's.
#    Without this eval, minikube cannot see the images and every pod sits in
#    ErrImageNeverPull.
eval $(minikube docker-env)
docker build -t msme-backend:dev     ./msme-backend
docker build -t msme-frontend:dev    ./msme-frontend
docker build -t msme-recommender:dev ./msme-recommender

# 4. Create the Secret from your .env. Never committed.
./k8s/make-secret.sh msme

# 5. Apply the dev overlay.
kubectl apply -k k8s/overlays/dev

# 6. Wait for everything to be Ready.
kubectl -n msme rollout status deployment/msme-backend     --timeout=300s
kubectl -n msme rollout status deployment/msme-frontend    --timeout=300s
kubectl -n msme rollout status deployment/msme-recommender --timeout=300s
```

`eval $(minikube docker-env)` only affects the shell it runs in. A new terminal
points back at the host daemon and rebuilt images will not reach the cluster —
re-run the eval each time.

## Ingress host setup

The ingress matches on `Host: msme.local`, so the name has to resolve to the
minikube IP. Add it to `/etc/hosts` once (this is the only step that needs
sudo):

```bash
echo "$(minikube ip)  msme.local" | sudo tee -a /etc/hosts
```

Then open <http://msme.local>.

Check the IP has not drifted after a `minikube delete` / re-create:

```bash
minikube ip                      # compare against /etc/hosts
grep msme.local /etc/hosts
```

### Without touching /etc/hosts

Pass the Host header explicitly:

```bash
curl -H 'Host: msme.local' "http://$(minikube ip)/api/products/categories"
```

Or tunnel the ingress to localhost (macOS with the docker driver often needs
this, since the minikube IP is not routable from the host):

```bash
minikube tunnel     # keeps running; needs sudo; then use http://msme.local
```

## Verifying

```bash
kubectl -n msme get pods,svc,ingress,hpa
kubectl -n msme logs deployment/msme-backend --tail=50
kubectl -n msme describe hpa msme-backend

# End to end through the ingress
curl -H 'Host: msme.local' "http://$(minikube ip)/api/products/categories"
curl -H 'Host: msme.local' -I "http://$(minikube ip)/"
```

## Overlays

| | dev | prod |
|---|---|---|
| images | `msme-*:dev`, built locally | `ghcr.io/pavansai2608/msme-*:latest` |
| backend / frontend replicas | 1 each | 2 each |
| HPA | 1–3 | 2–5 |
| host | `msme.local` (http) | `msme.example.com` (https) |
| TLS | none | `msme-tls` via cert-manager |
| `NODE_ENV` | `development` | `production` |

```bash
kubectl apply -k k8s/overlays/dev
kubectl apply -k k8s/overlays/prod    # needs the ghcr images to exist first

# Render without applying, to see exactly what changes:
kubectl kustomize k8s/overlays/prod
```

`NODE_ENV` matters beyond logging: in `production` the auth cookies are issued
with `Secure`, so they are dropped by the browser over plain http. That is why
dev runs as `development` and prod is https-only.

## Secrets

`base/secret.example.yaml` is committed and contains **placeholders only**. The
real Secret is generated from `msme-backend/.env` and never written to disk as a
manifest:

```bash
./k8s/make-secret.sh msme
```

The script copies only genuinely secret keys — `MONGO_URL`, `JWT_SECRET`,
`JWT_REFRESH_SECRET`, the Google pair, and the optional email/Shiprocket
credentials. Non-secret values that also live in `.env` (`PORT`, `NODE_ENV`,
`CLIENT_URL`, `RECOMMENDER_URL`, `GOOGLE_CALLBACK_URL`) are owned by the
ConfigMap. The backend's `envFrom` lists the Secret first and the ConfigMap
second, so on any key collision the cluster's config wins over a stale laptop
`.env`.

Inspect without revealing values:

```bash
kubectl -n msme get secret msme-secrets -o jsonpath='{.data}' | tr ',' '\n' | cut -d'"' -f2
```

## Health endpoints

| service | path | notes |
|---|---|---|
| backend | `/health` | plain 200; deliberately does **not** check Atlas, so a database blip cannot crash-loop every pod |
| frontend | `/healthz` | served by nginx itself, independent of the API |
| recommender | `/health` | reports `indexed_products`, `content_ready`, `collab_ready` |

The backend and recommender both carry a `startupProbe` so a slow Atlas
handshake is not mistaken for a hung process — liveness only starts once
startup has succeeded.

## HPA

```bash
kubectl -n msme get hpa msme-backend -w
```

`averageUtilization: 70` is 70% of the CPU **request** (100m), i.e. it scales
out at ~70m per pod. The HPA reports `<unknown>` until metrics-server has
scraped twice — give it about a minute after the pods start.

## Troubleshooting

**`ErrImageNeverPull` / `ImagePullBackOff`** — the image was built against the
host daemon. Re-run `eval $(minikube docker-env)` and rebuild; confirm with
`eval $(minikube docker-env) && docker images | grep msme`.

**Ingress returns 503** — no ready endpoints behind the service. Check
`kubectl -n msme get endpoints` and the pod's readiness probe.

**`msme.local` does not resolve** — `/etc/hosts` is missing the entry, or the
minikube IP changed after a re-create.

**`msme.local` resolves but times out (macOS)** — the minikube IP is not
routable from the host on the docker driver. Run `minikube tunnel`, or use the
`curl -H 'Host: msme.local'` form against `$(minikube ip)` from inside the
cluster network.

**Pods `Pending`** — the node is out of CPU or memory. `kubectl -n msme
describe pod <name>` names the unsatisfied request; restart minikube with more
`--cpus` / `--memory`.

## Teardown

```bash
kubectl delete -k k8s/overlays/dev     # keeps the cluster
minikube stop                          # keeps the VM and its images
minikube delete                        # removes everything
```
