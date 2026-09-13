# Jenkins

CI/CD for the MSME marketplace. The whole pipeline is one file:
[`jenkinsfile`](../jenkinsfile) at the repository root. It is self-contained on
purpose — no shared library, nothing to configure in the Jenkins UI beyond the
job itself and one credential.

Jenkins runs on the Mac via `brew services` (`jenkins-lts`, `http://localhost:8080`),
so the controller *is* the build agent. It shares the developer's Docker
daemon, minikube cluster and kubeconfig, which is why there is no agent
provisioning and no kubeconfig credential.

---

## What the pipeline does

| # | Stage | What it does |
|---|-------|--------------|
| 1 | **Checkout** | `checkout scm`, records the git short SHA into `GIT_SHA` and names the build after it |
| 2 | **Lint** | `npm run lint` in `msme-frontend` and `msme-backend`, **in parallel** |
| 3 | **Unit tests** | jest and pytest **in parallel**, each publishing JUnit XML |
| 4 | **Build images** | three images via `dockerBuildAndTag`, tagged `<short-sha>` **and** `dev`, built into the minikube daemon |
| 5 | **Deploy** | recreates the Secret from `.env`, `kubectl apply -k k8s/overlays/dev`, rolls the deployments, then smoke-tests the ingress |
| 6 | **E2E** | seeds fixtures, port-forwards the ingress, runs Playwright against the deployed app |
| 7 | **Publish** | coverage (backend + recommender) and the Playwright HTML report |
| — | **Approve production release** | manual `input` gate — only offered when `DEPLOY_PROD` is ticked |
| — | **Promote to production** | rebuilds against the host daemon, pushes to GHCR, applies the prod overlay |

`post { always }` publishes every JUnit XML, archives reports and traces, then
cleans the workspace. `post { failure }` echoes where to look.

---

## 1. Install these plugins

**Manage Jenkins → Plugins**, then restart:

| Plugin ID | Shown in the UI as | Needed for |
|-----------|--------------------|-----------|
| `htmlpublisher` | **HTML Publisher** | `publishHTML` — the Playwright report |
| `coverage` | **Coverage** | `recordCoverage` — the cobertura XML from jest and pytest |

That is the whole list, and on this controller both are already installed.

Already present and used: `workflow-aggregator`, `workflow-job`, `workflow-cps`,
`workflow-multibranch`, `junit`, `credentials`, `credentials-binding`,
`plain-credentials`, `git`, `github-branch-source`, `timestamper`, `ws-cleanup`,
`build-timeout`, `pipeline-stage-view`.

> **Not needed:** `pipeline-groovy-lib` (formerly `workflow-cps-global-lib`).
> The pipeline used to require it for `@Library('msme-shared')`; the step is now
> a plain Groovy function at the bottom of the jenkinsfile. Nor does it need
> `kubernetes-cli` or `nodejs` — `kubectl`, `node` and `docker` are used
> straight from `PATH`, which the `environment` block extends with
> `/opt/homebrew/bin`. A brew-launched Jenkins starts with a bare `PATH` and
> would otherwise not find any of them.


---

## 2. Create these credentials

**Manage Jenkins → Credentials → System → Global credentials → Add Credentials.**
The IDs matter; the pipeline looks them up by ID.

| ID | Kind | Contents | Needed for |
|----|------|----------|-----------|
| `msme-backend-env` | **Secret file** | Upload your `msme-backend/.env` as-is | Every build |
| `msme-ghcr-credentials` | **Username with password** | GitHub username + a PAT with `write:packages` | Production promotion only |
| `msme-prod-kubeconfig` | **Secret file** | kubeconfig for the production cluster | Production promotion only |

Only `msme-backend-env` is required for a normal build. The other two are bound
inside the `Promote to production` stage, so a build with `DEPLOY_PROD`
unticked never touches them and will not fail if they do not exist yet.

### Why a Secret *file* and not four Secret texts

`msme-backend/.env` is already the single source of truth for MONGO_URL, the
JWT secrets and the Google OAuth pair, and `k8s/make-secret.sh` already knows
how to filter it down to the keys that belong in a Kubernetes Secret. Handing
Jenkins the same file keeps one definition instead of two that drift.

The pipeline only ever handles the *path* to that file: it is passed to
`make-secret.sh` via `MSME_ENV_FILE`, or read by a shell that has turned its own
tracing off first. No secret value is ever interpolated into a Groovy string, a
shell command line, or the build log.

### The one trap: `sh` runs with `-x`

Jenkins executes every `sh` step as `sh -xe`, so the shell traces each command
it runs. Sourcing the credential file (`set -a; . "$BACKEND_ENV"`) therefore
printed **every value in it** — the Atlas password inside MONGO_URL, JWT_SECRET
and the Google client secret — straight into the console log. A Secret *file*
binding masks the file's path, never its contents, so nothing downstream
catches it.

The E2E stage now starts that step with `set +x` before it touches the
credential, and lifts out only MONGO_URL. If you add a step that reads this
credential, do the same: **`set +x` first, then read.**

---


## 3. Create the job

**New Item → Pipeline** (name it `msme-marketplace`), then:

| Field | Value |
|-------|-------|
| Pipeline → Definition | **Pipeline script from SCM** |
| SCM | Git |
| Repository URL | `https://github.com/pavansai2608/msme-marketplace.git` |
| Branch | `*/main` (or `*/feat/ci`) |
| **Script Path** | `jenkinsfile` |

> Script Path is lowercase on purpose. The file is tracked as `jenkinsfile`,
> and macOS's case-insensitive filesystem makes renaming it to `Jenkinsfile`
> a two-step git dance. If you would rather have the conventional capital:
> `git mv jenkinsfile Jenkinsfile.tmp && git mv Jenkinsfile.tmp Jenkinsfile`,
> then set Script Path to `Jenkinsfile`.

Build parameters appear after the first run (Jenkins has to execute the
`parameters` block once to learn about them):

- `DEPLOY_PROD` — offers the manual approval gate and the GHCR push. Default off.
- `SKIP_E2E` — skips stage 6 for a quick build-only run. Default off.

---

## 4. Before the first build

The cluster has to exist; the pipeline deploys to it but does not create it.

```bash
minikube start --cpus=4 --memory=6144
minikube addons enable ingress
minikube addons enable metrics-server
```

See [`k8s/README.md`](../k8s/README.md) for the full cluster setup, including
the `/etc/hosts` entry — which the pipeline itself does **not** need.

---

## Running the stages by hand

Every stage is a plain command. To reproduce one without Jenkins:

```bash
# 2 - Lint
(cd msme-frontend && npm ci && npm run lint)
(cd msme-backend  && npm ci && npm run lint)

# 3 - Unit tests
(cd msme-backend && npm run test:ci)
(cd msme-recommender && ./.venv/bin/python -m pytest \
    --junitxml=test-results/pytest-junit.xml \
    --cov=app --cov-report=xml:coverage.xml)

# 4 - Build images into the cluster daemon
eval $(minikube docker-env)
SHA=$(git rev-parse --short HEAD)
for s in msme-backend msme-frontend msme-recommender; do
  docker build -t "$s:$SHA" -t "$s:dev" "$s"
done

# 5 - Deploy
MSME_ENV_FILE=msme-backend/.env ./k8s/make-secret.sh msme
kubectl apply -k k8s/overlays/dev
kubectl -n msme rollout restart deployment/msme-backend deployment/msme-frontend deployment/msme-recommender
kubectl -n msme rollout status deployment/msme-backend --timeout=300s

# 6 - E2E
(cd msme-backend && node scripts/seedE2E.js)
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 18088:80 &
(cd msme-frontend && E2E_HOST_MAP="msme.local 127.0.0.1:18088" npx playwright test)
```

---

## How the E2E stage reaches the app

The ingress routes on the `Host` header, so `http://msme.local` has to resolve.
Rather than require a `sudo` line in CI, the pipeline:

1. port-forwards `svc/ingress-nginx-controller` to `127.0.0.1:18088`, and
2. hands Chromium `--host-resolver-rules=MAP msme.local 127.0.0.1:18088`.

The browser then sends `Host: msme.local` to the forwarded port, nginx matches
its ingress rule, and the **real** ingress path is exercised — including the
`/` vs `/api` split — with no root access anywhere. If your `/etc/hosts` does
point `msme.local` at `minikube ip`, unset `E2E_HOST_MAP` and it works directly.

`minikube ip` is deliberately **not** curled: with the docker driver on macOS
the node IP lives on a container network the host cannot reach, so it returns
`000` no matter how healthy the cluster is.

---

## Test data

The E2E suite writes to the same Atlas database the app uses.
`msme-backend/scripts/seedE2E.js` runs before every Playwright stage and:

- **purges** anything the previous run created — accounts matching
  `e2e-run-*@msme.local`, their products, orders and carts, plus any order
  placed against the fixture buyer;
- **seeds** three fixtures: `e2e-buyer@msme.local`, `e2e-seller@msme.local`
  and the product *E2E Fixture Brass Lamp*.

The purge is exact — it matches on the run prefix and on fixture ownership,
never on a broad pattern like `/test/i` against a database that also holds real
records. `node scripts/seedE2E.js --clean` purges without reseeding.

---

## Troubleshooting

**`Could not find any definition of libraries [msme-shared]`**
An old copy of the jenkinsfile that still carries `@Library('msme-shared')` at
the top. That line is gone; `dockerBuildAndTag` is a plain Groovy function at
the bottom of the file. Make sure the branch being built has the current
jenkinsfile.

**`docker: command not found` / `kubectl: command not found`**
The `PATH` in the `environment` block does not cover where brew put them.
Check with `which docker kubectl node` in your own shell and add that directory.

**`rollout status` times out with the new pod `Pending`**
The node is out of *requested* memory. `kubectl describe node minikube` and look
at `Allocated resources`. This laptop cluster also carries a `bill-auditor`
namespace holding ~10 GB of requests, which is why the dev overlay patches the
rolling-update strategy to `maxUnavailable: 1, maxSurge: 0` — there is no room
for a surge pod, so dev rolls by replacing rather than by adding.

**`Server selection timed out after 30000 ms` in the seed step**
Atlas being slow to hand out a replica-set member. The stage already wraps the
seed in `retry(3)`; if all three fail, check Atlas rather than the script.

**The Playwright stage fails with `Login as e2e-buyer@msme.local failed`**
The fixture account is missing — the seed step did not run or did not reach
Atlas. Run `cd msme-backend && node scripts/seedE2E.js` by hand.

**Recommendations show `source: fallback` in the report**
Expected, not a failure. The recommender rebuilds its TF-IDF index on startup,
and the backend serves a newest-first list until that finishes. The test
records the source as an annotation and deliberately does not assert on it —
the fallback *is* correct behaviour.

**The build hangs at the production gate**
The `input` step waits for a human. The pipeline-level `timeout(30, MINUTES)`
covers the whole build, so an unanswered gate eventually aborts it.
