# Rules
- Never run git commit, git add, git push, git branch, git tag.
- After each change, print the exact git commands for me to run myself.
- Never add Co-Authored-By lines.
- Ask before installing any package.
- One task at a time. Small steps.
- Never print a secret value.
- I create `msme-backend/.env` myself. Do not create it.

# Project
Marketplace for MSMEs. Roles: buyer, seller, admin. Three services:

- `msme-backend/`     Express 4 + Mongoose 8, port 5000
- `msme-frontend/`    React 18 + Vite 5, dev port 3001 (its container serves on 8080)
- `msme-recommender/` FastAPI + scikit-learn, port 8000

MongoDB Atlas is the database in every environment, including local.
`docker compose up -d --build` runs all three. Needs `msme-backend/.env`.

# Tests
There **is** a test framework — three of them. Do not skip them.

- Backend     `cd msme-backend && npm test`           jest + supertest + mongodb-memory-server
- Recommender `cd msme-recommender && pytest`         needs the venv
- E2E         `cd msme-frontend && npm run test:e2e`  Playwright/chromium, against a running deployment
- Lint        `npm run lint`                          in either JS workspace
- Dead code   `npm run knip` per workspace, `npm run depcheck` at the root

The E2E suite seeds its own data via `msme-backend/scripts/seedE2E.js` and
writes to Atlas — it tags what it creates and cleans up afterwards.

# Infrastructure
- `k8s/base/` + `k8s/overlays/{dev,prod,aws}/` — kustomize. `dev` is minikube
  with ingress-nginx; `aws` is k3s with Traefik. Verify with `kubectl kustomize`.
- `scripts/aws-bootstrap.sh` — idempotent deploy to a fresh Ubuntu box. Reads
  secrets only from `/opt/msme/.env`, never arguments.
- `jenkinsfile` — declarative pipeline. No shared library: `dockerBuildAndTag`
  is inlined as a Groovy function, deliberately.
- `.github/workflows/publish-images.yml` — pushes the three images to ghcr.io
  on a push to `main`.
- Runbooks: `aws/README.md`, `k8s/README.md`, `jenkins/README.md`.

# Gotchas
- `k8s/make-secret.sh` and `scripts/aws-bootstrap.sh` run on **Linux**, not
  macOS. GNU/BSD differences have already bitten twice: `mktemp` templates need
  at least three `X`s on GNU, and `stat -c` is GNU-only.
- `kubectl wait --all` does not wait for a resource to *exist* — with nothing
  matching it fails instantly. Poll for the object first.
- The AWS node has ~480 MiB spare. Rolling updates are `maxSurge: 0` because a
  surge pod will not schedule.
- Jenkins `sh` runs as `sh -xe`. Never let tracing touch a line that reads
  `.env` — that leaked Atlas credentials into a build log once already.
