# MSME Platform — AI-Enabled District-Level Marketplace

A full-stack marketplace that lets Micro, Small and Medium Enterprises sell
beyond their local district, with a recommendation service and seller-facing
analytics on top of the usual catalogue, cart and checkout.

## Architecture

Three services, each independently built and deployed:

| Service | Stack | Port | Purpose |
|---|---|---|---|
| `msme-backend/` | Express 4, Mongoose 8 | 5000 | REST API, auth, orders, admin |
| `msme-frontend/` | React 18, Vite 5 | 3001 dev / 8080 in container | SPA, PWA |
| `msme-recommender/` | FastAPI, scikit-learn | 8000 | Content, collaborative and hybrid recommenders |

MongoDB Atlas is the database in every environment, including local development.
The backend is the only service that talks to the frontend; it proxies to the
recommender internally, so the recommender is never exposed publicly.

## Features

**Marketplace** — product discovery by category and district, wishlist, cart,
checkout, and a seller hub for inventory and order status.

**Recommendations** — trending products (`/api/products/recommended`) and
similar-item suggestions on a product page (`/api/products/:id/similar`), both
served by the FastAPI service.

**Seller analytics** — revenue and sales-volume charts (Recharts), demand
signals and production advisory.

**Logistics** — Shiprocket integration for carrier assignment and shipment
tracking (`msme-backend/utils/shiprocket.js`).

**Auth** — JWT access tokens (15 min) with refresh tokens, Google OAuth 2.0,
CSRF protection, and in-memory rate limiting on the auth endpoints. Roles are
`buyer`, `seller`, `admin`.

**Schemes and micro-loans** — discovery of government MSME subsidies.

## Tech stack

**Frontend** — React 18, Vite, React Router 6, TanStack Query 5, react-hook-form
with Zod validation, Recharts, react-window, plain CSS (`src/index.css`).

**Backend** — Node, Express, Mongoose, Passport (Google OAuth), Helmet, CORS.

**Recommender** — FastAPI, scikit-learn, NumPy, SciPy, PyMongo, Pydantic.

**Infrastructure** — Docker Compose locally, Kubernetes (kustomize) for
minikube and k3s, Jenkins for CI, GitHub Actions for image publishing, GHCR for
image hosting, cert-manager plus Let's Encrypt for TLS.

## Project structure

```text
├── msme-backend/        Express API — routes, controllers, models, tests
├── msme-frontend/       React SPA — src/, e2e/ (Playwright)
├── msme-recommender/    FastAPI service — app/, tests/
├── k8s/
│   ├── base/            Deployments, services, ingress, HPA, ConfigMap
│   └── overlays/        dev (minikube + nginx), prod, aws (k3s + Traefik)
├── scripts/             aws-bootstrap.sh — one-shot deploy to a fresh box
├── jenkins/             Jenkins setup notes
├── aws/                 AWS deployment runbook and cost table
├── docs/                audit-baseline.md — read-only code audit (data model, routes, findings)
├── .github/workflows/   publish-images.yml — builds images to ghcr.io
├── docker-compose.yml   Local all-in-one
└── jenkinsfile          Declarative CI pipeline
```

## Running locally

### Prerequisites

- Node.js 18+
- Python 3.11+ (for the recommender)
- Docker and Docker Compose (for the all-in-one path)
- A MongoDB Atlas connection string

### Configuration

Create `msme-backend/.env`. It is gitignored and must never be committed:

```env
PORT=5000
NODE_ENV=development
MONGO_URL=mongodb+srv://<username>:<password>@<cluster>/msme-marketplace
JWT_SECRET=a_long_random_string
JWT_REFRESH_SECRET=a_different_long_random_string
JWT_EXPIRE=15m
CLIENT_URL=http://localhost:3001
RECOMMENDER_URL=http://localhost:8000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

`JWT_REFRESH_SECRET` is optional — it falls back to `${JWT_SECRET}:refresh`,
which works but means one leaked secret compromises both token families.
Without all three Google values, Google sign-in is disabled at boot and
`/api/auth/google` answers 503 rather than crashing.

### Everything at once

```bash
docker compose up -d --build
```

Frontend on `http://localhost:3001`, backend on `:5000`, recommender on `:8000`.

> The Compose file also starts a Redis container. Nothing in the application
> currently reads from it — there is no `redis` dependency in any
> `package.json` and no reference in the Kubernetes manifests.

### Service by service

```bash
cd msme-backend      && npm install && npm run dev    # :5000
cd msme-frontend     && npm install && npm run dev    # :3001
cd msme-recommender  && pip install -r requirements.txt \
                     && uvicorn app.main:app --port 8000
```

## Tests

```bash
cd msme-backend     && npm test            # jest + supertest + mongodb-memory-server
cd msme-recommender && pytest              # content / collaborative / hybrid / api / eval
cd msme-frontend    && npm run test:e2e    # Playwright, chromium
```

The Playwright suite covers registration and login, search → product → cart →
checkout, role-based access control, the become-seller and create-product flow,
and recommendations on a product page. It runs against a **deployed**
application, seeds its own data through `msme-backend/scripts/seedE2E.js`, and
tags and removes what it creates.

Other checks:

```bash
npm run lint      # in either JS workspace
npm run knip      # unused files, exports and dependencies
npm run depcheck  # at the repo root
```

## Deployment

### Kubernetes

Manifests are kustomize, with three overlays:

```bash
kubectl kustomize k8s/overlays/dev     # minikube + ingress-nginx
kubectl kustomize k8s/overlays/prod    # a normal cloud cluster
kubectl kustomize k8s/overlays/aws     # single-node k3s + Traefik
```

The `aws` overlay is sized for a 2 GiB node: one replica each, HPA max 2,
`imagePullPolicy: Always`, images from GHCR, and `maxSurge: 0` on rollouts
because there is no room for a surge pod. See `k8s/README.md`.

### AWS — one EC2 box with k3s

`aws/README.md` is the full runbook: instance and security-group settings,
elastic IP, Atlas allowlisting, TLS via cert-manager, a cost table, and what
does and does not fit in 2 GiB. Short version, on a fresh Ubuntu box:

```bash
sudo ACME_ISSUER=letsencrypt-staging ./scripts/aws-bootstrap.sh   # validate first
sudo ./scripts/aws-bootstrap.sh                                    # then the real CA
```

The script is idempotent and reads secrets only from `/opt/msme/.env` — never
from arguments, and never into the log.

### CI

`jenkinsfile` is a declarative pipeline: checkout, lint (parallel), unit tests
(jest and pytest in parallel, JUnit XML published), build three images tagged
with the git short SHA, deploy to the dev overlay, Playwright E2E, then publish
coverage and the HTML report. A manual approval gate guards the production
stages. See `jenkins/README.md` for the plugins and credential IDs.

`.github/workflows/publish-images.yml` builds and pushes the three images to
`ghcr.io` on every push to `main`, tagged `latest` and with the short SHA.

> GHCR packages are created **private**, and `GITHUB_TOKEN` cannot change that.
> After the first push, set each of the three to Public in the package settings,
> or pods will sit in `ImagePullBackOff`.

## Creating an admin

There is **no HTTP route that can grant the admin role**.
`/api/auth/update-profile` strips `role` out of the request body and
`/api/auth/become-seller` hardcodes `'seller'`, so the role cannot be reached by
any request a client can make.

The only way to create one is the seeding script, run against the database
directly:

```bash
cd msme-backend
node scripts/seedAdmin.js someone@example.com
```

The account **must already exist** — register through the app first, then
promote that email. The script also forces `isActive: true`, since a suspended
admin would be promoted and then blocked at the door by `verifyToken`.

Sign out and back in afterwards for an already-open session to pick up the new
role in the UI. (The server reads the role from the database on every request,
so the API grants admin access immediately; it is only the cached user object in
the browser that is stale.)

### Admin endpoints

All four sit behind `verifyToken` + `requireRole('admin')` and answer 403 for
anyone else:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/admin/stats` | User counts by role, product count, order count, total revenue, orders in the last 7 days |
| GET | `/api/admin/users` | Paginated user list; `?search=` matches name and email, `?page=`, `?limit=` (max 100), `?role=` |
| PATCH | `/api/admin/users/:id/status` | Body `{ "isActive": true \| false }` — activate or deactivate an account |
| GET | `/api/admin/orders` | Paginated order list; `?status=` filters on the Order status enum |

`totalRevenue` is the sum of `totalAmount` across every order **except**
`Cancelled` ones, including orders still in flight.

Deactivating a user takes effect on their **next request**: `verifyToken` reads
`isActive` from the database each time and answers 403 `account_inactive`, so an
access token already in their browser stops working without waiting for its
15-minute expiry. An admin cannot deactivate their own account — that would lock
every admin route behind a 403 with nobody left to lift it.

## Security notes

- `msme-backend/.env` is gitignored. Secrets reach Kubernetes through
  `k8s/make-secret.sh`, which copies only `MONGO_URL`, `JWT_SECRET`,
  `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — so
  nothing else in `.env` can override what the ConfigMap sets.
- `k8s/base/secret.example.yaml` is a template. It must never hold real values.
- In production `NODE_ENV=production` marks the auth cookies `Secure`, so the
  app must be served over HTTPS or login will appear to succeed and then do
  nothing. The AWS overlay redirects HTTP to HTTPS for this reason.

## License

No `LICENSE` file is currently committed.
