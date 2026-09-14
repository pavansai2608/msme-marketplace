# Deploying to AWS — one EC2 box running k3s

Console steps in order, then verification, then how to stop paying for it.

**What you end up with:** the full stack (frontend, backend, recommender) on a
single t3.small, behind Traefik with a real Let's Encrypt
certificate, reachable at `https://msme.<your-elastic-ip-dashed>.nip.io`, with
MongoDB Atlas unchanged.

**Roughly $23/month running, ~$6/month stopped.** Full table at the bottom.

---

## Why Traefik and not nginx-ingress

The manifests in `k8s/base/` target ingress-nginx, and `k8s/overlays/aws/`
switches to Traefik. **Traefik wins here**, for two reasons:

1. **k3s already ships it and it is already running.** Choosing nginx means
   `--disable=traefik` at install time plus installing and maintaining
   ingress-nginx — more moving parts in a bootstrap script that has to work
   unattended on a fresh box.
2. **Memory.** ingress-nginx runs around 100–180 MiB; k3s's Traefik sits
   around 50–70 MiB. On a box with ~1.9 GiB usable that difference is roughly
   the whole headroom budget for the recommender.

So the AWS overlay **removes** the two nginx annotations rather than leaving
them in place. That matters: an Ingress carrying annotations for a controller
that isn't installed is a trap — they're silently ignored, so the body-size
and timeout limits you think are set simply aren't. Neither has a per-Ingress
Traefik equivalent, and neither is needed: Traefik applies no request body
limit by default, and its read timeout is static entrypoint config.

`base`, `dev` and `prod` stay on nginx — dev is minikube with the nginx addon
and prod assumes a normal cloud cluster. Picking the controller is the
overlay's job; the base just describes the routes.

---

## 1. Launch the instance

**EC2 → Instances → Launch an instance**

| Field | Value |
|---|---|
| Name | `msme-marketplace` |
| AMI | **Ubuntu Server 24.04 LTS (HVM), SSD Volume Type**, 64-bit (x86) |
| Instance type | `t3.small` |
| Key pair | create one, e.g. `msme-key` — download the `.pem` |
| Storage | **30 GiB**, **gp3** |
| Region | **ap-southeast-2 (Sydney)** — set this *before* anything else. Any region works; just keep every step in the same one. |

> Pick the AMI by **name** in the console, not by ID. AMI IDs are per-region
> and change with every Ubuntu rebuild, so any ID written here would be stale.

**Network settings → Edit → Security group** — create `msme-sg` with:

| Type | Port | Source | Why |
|---|---|---|---|
| SSH | 22 | **My IP** | Admin. Do not use `0.0.0.0/0`. |
| HTTP | 80 | `0.0.0.0/0` | **Required** — Let's Encrypt's HTTP-01 challenge must reach the box from the internet. Close this and TLS never issues. |
| HTTPS | 443 | `0.0.0.0/0` | The app. |

Leave outbound as the default (all traffic) — the box needs to reach Atlas,
ghcr.io and Let's Encrypt.

**Advanced details → Credit specification → `standard`.** T3 instances
default to **unlimited**, which silently bills ~$0.05/vCPU-hour once you burn
through CPU credits. `standard` throttles instead of charging. See the cost
table.

Then **Launch instance**.

## 2. Allocate and attach an elastic IP

**EC2 → Elastic IPs → Allocate Elastic IP address** → Allocate.

Select it → **Actions → Associate Elastic IP address** → choose your instance
→ Associate.

Note the address, e.g. `13.234.56.78`. Your app will be at
`https://msme.13-234-56-78.nip.io` — nip.io resolves any
`<name>.<dashed-ip>.nip.io` to that IP, which gives you a real hostname, and
therefore a real certificate, with no domain to buy.

> **The elastic IP is worth its $3.65/month.** Without it, stopping and
> starting the instance changes the public IP, which changes the nip.io
> hostname, which means a new TLS certificate *and* a new Atlas allowlist
> entry every single time.

## 3. Allow the IP in Atlas

**Atlas → Network Access → Add IP Address** → enter the elastic IP → `/32` →
Confirm.

Without this the backend starts, fails to reach Atlas, never listens on
`/health`, and the pod crash-loops. The log line is unambiguous —
`bad auth` means wrong credentials, a timeout means the allowlist.

## 4. Put the credentials on the box

Never commit these. The file lives only on the instance.

```bash
chmod 400 ~/Downloads/msme-key.pem
ssh -i ~/Downloads/msme-key.pem ubuntu@13.234.56.78

# on the box
sudo mkdir -p /opt/msme
sudo touch /opt/msme/.env && sudo chmod 600 /opt/msme/.env
sudo nano /opt/msme/.env
```

Contents — same keys as `msme-backend/.env`, plus two:

```ini
MONGO_URL=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/msme-marketplace?appName=Cluster0
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Required by the bootstrap: where Let's Encrypt sends expiry warnings.
ACME_EMAIL=you@example.com

# Optional. The script reads the public IP from instance metadata; set this
# only if you want to override it.
PUBLIC_IP=13.234.56.78
```

Only `MONGO_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` reach the cluster Secret — `k8s/make-secret.sh` filters
to exactly that list, so nothing else in this file can override what the
ConfigMap sets.

## 5. Make the ghcr images public — once

Push to `main` first so the workflow creates them, then for **each** of
`msme-backend`, `msme-frontend`, `msme-recommender`:

**github.com/<you>?tab=packages → the package → Package settings → Danger
Zone → Change visibility → Public.**

Packages are created private by default and `GITHUB_TOKEN` cannot flip that,
so it is a one-time manual step. If you skip it, pods sit in `ImagePullBackOff`.

## 6. Run the bootstrap

```bash
ssh -i ~/Downloads/msme-key.pem ubuntu@13.234.56.78

sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/pavansai2608/msme-marketplace.git
cd msme-marketplace

# Validate the whole certificate path against the staging CA first.
sudo ACME_ISSUER=letsencrypt-staging ./scripts/aws-bootstrap.sh

# Once that reports "TLS certificate issued", switch to the real CA:
sudo ./scripts/aws-bootstrap.sh
```

**Do the staging run.** Let's Encrypt's production endpoint rate-limits per
registered domain, and while nip.io has a raised allowance (250,000/week
rather than the usual 50) it is shared by everyone using nip.io and *can* be
exhausted. Staging has generous limits and issues an untrusted certificate —
perfect for proving the HTTP-01 path works before spending a real one. If
production is rate-limited anyway, `sslip.io` works identically; change the
host suffix in the overlay.

The script is idempotent. Re-run it after a failure, after a reboot, or to
pull new images — it skips whatever is already done.

It reads secrets **only** from `/opt/msme/.env`, never from arguments, and
disables shell tracing before touching the file, so nothing lands in the log.

## 7. Verify

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

kubectl -n msme get pods            # all three 1/1 Running
kubectl -n msme get ingress         # host msme.13-234-56-78.nip.io
kubectl -n msme get certificate     # msme-tls, READY=True
kubectl top nodes                   # memory headroom

curl -I  https://msme.13-234-56-78.nip.io/
curl -sS https://msme.13-234-56-78.nip.io/api/products/categories
```

Then open `https://msme.13-234-56-78.nip.io` in a browser and check the
padlock. Certificate issuance usually takes 30–90 seconds after the pods are
up; until it completes, HTTPS will fail and — because `NODE_ENV=production`
marks the auth cookies `Secure` — login over plain HTTP will appear to succeed
and then do nothing. Wait for the certificate.

If it is stuck:

```bash
kubectl -n msme describe certificate msme-tls
kubectl -n msme get challenge          # empty once solved
kubectl -n cert-manager logs deploy/cert-manager --tail=50
```

Nine times in ten it is port 80 not open to `0.0.0.0/0`.

## 8. Stop it when you are not using it

```bash
# Console: EC2 → Instances → select → Instance state → Stop instance
# Or from your laptop, with the AWS CLI configured:
aws ec2 stop-instances  --instance-ids i-xxxxxxxx --region ap-southeast-2
aws ec2 start-instances --instance-ids i-xxxxxxxx --region ap-southeast-2
```

Stopping bills no compute. The gp3 volume and the elastic IP keep billing.
On start, k3s comes back on its own (systemd) and the pods restart — the
elastic IP means the hostname and certificate survive. Give it about two
minutes, then re-check `kubectl -n msme get pods`.

To stop paying entirely: **terminate** the instance (deletes the volume),
**release** the elastic IP, and remove the IP from Atlas Network Access.
A stopped instance you forget about still costs ~$6/month.

---

## Cost

ap-south-1 (Mumbai) rates, 730 hours/month, on-demand, no Savings Plan.

> **The deployed box is in ap-southeast-2 (Sydney), where on-demand rates are
> higher.** These figures were verified for Mumbai only, so treat the table as a
> floor rather than the bill. Confirm the Sydney rate in the AWS pricing
> calculator before budgeting.

| Item | Rate | Running 24/7 | Stopped |
|---|---|---:|---:|
| EC2 t3.small | $0.0224/hr | **$16.35** | $0 |
| EBS gp3, 30 GiB | ≈$0.092/GiB-mo | **≈$2.74** | ≈$2.74 |
| Public IPv4 (elastic IP) | $0.005/hr | **$3.65** | $3.65 |
| Data transfer out | first 100 GB/mo free, then ≈$0.109/GB | **$0** | $0 |
| MongoDB Atlas M0 | free tier | **$0** | $0 |
| ghcr.io (public images) | free | **$0** | $0 |
| Let's Encrypt | free | **$0** | $0 |
| **Total** | | **≈$22.74/mo** | **≈$6.39/mo** |

gp3 in Mumbai is a little above the $0.08/GiB US rate; confirm in the AWS
calculator if the exact figure matters. The t3.small and IPv4 rates are firm
**for Mumbai**. The IPv4 charge of $0.005/hr is the same in every region.

**What to stop when idle**

| Action | Saves | Cost |
|---|---:|---|
| Stop the instance | $16.35/mo | ~2 min to come back up |
| Release the elastic IP | $3.65/mo | hostname changes → new certificate, new Atlas entry, re-run bootstrap |
| Terminate + delete volume | $22.74/mo | full rebuild from this README |

**The t3 credit trap.** T3 defaults to *unlimited* credit mode: once the CPU
credit balance is exhausted, surplus CPU is billed at roughly
$0.05/vCPU-hour rather than throttled. On a box running a build loop or a
runaway pod that is a real, unbudgeted charge. Set the credit specification to
**standard** (step 1) and the instance throttles instead — slower, never a
surprise line item.

---

## What will not work well on 2 GB — read this

Nothing here is hypothetical; these are the specific things that will bite.

**The HPA's second replica is a burst absorber, not capacity.** You asked for
`maxReplicas: 2` and that is what the overlay sets. It *will* schedule — the
backend requests only 160Mi — but the node's real headroom after k3s, Traefik,
CoreDNS, metrics-server, cert-manager and the three app pods is roughly
300–500 MiB, and a second Node process is ~130 MiB of that. Under sustained
load you are more likely to OOMKill something than to serve more traffic. If
you see `OOMKilled` in `kubectl -n msme get pods`, set `maxReplicas: 1`.

**cert-manager costs about as much RAM as your backend.** Three deployments
(controller, webhook, cainjector) for one certificate, roughly 150–250 MiB
together. It is the single biggest non-app consumer on the box. If you get
tight, Traefik has its own built-in ACME resolver that does the same job with
zero extra pods — swapping to it is the highest-value memory saving available.

**The recommender is the thing that will OOM first.** scikit-learn plus numpy
is ~150–200 MiB of RSS before it loads a single product; measured steady state
on this image is ~105 MiB with a 200-product index, and a reindex spikes above
that while it builds the TF-IDF matrix. The 400Mi limit covers roughly 1–2k
products. Past that, raise the limit and drop the HPA to 1, or move the
recommender off the box.

**You cannot build images on this instance.** `npm ci` for the frontend alone
peaks over 1 GiB. That is why the images come from ghcr.io and the workflow
builds them on GitHub's runners. Do not be tempted to `docker build` on the box
"just this once" — it will take the cluster down with it.

**Rolling updates must replace, not surge.** The base strategy
(`maxUnavailable: 0, maxSurge: 1`) needs room for a second copy of a pod
during every deploy, and that room does not exist. The overlay patches all
three to `maxUnavailable: 1, maxSurge: 0`. Without that patch a redeploy hangs
with the new pod `Pending` and the old one never terminating — which looks
exactly like a broken image.

**There is no swap, so memory pressure means OOMKill, not slowdown.** Ubuntu
EC2 images ship without it. You can add a swapfile, but kubelet needs to be
told to tolerate swap (`--kubelet-arg=fail-swap-on=false` in
`INSTALL_K3S_EXEC`) or k3s will refuse to start. I would rather you keep the
footprint honest than paper over it with swap on a gp3 volume.

**Atlas is across the public internet from the instance.** Nothing serves `/health`
until mongoose connects (`server.js` does `connectDB().then(() =>
app.listen())`), so a slow Atlas looks identical to a broken app. The overlay
raises the startup probe to 60 × 5s = 300 s to absorb that. If a pod still
crash-loops, read the log before assuming the image is wrong: `bad auth` is
credentials, a timeout is the Atlas allowlist.

**One node means no availability.** Single replicas, single box, single AZ.
Every deploy is a brief outage and a reboot is a few minutes of downtime.
That is the correct trade for a demo environment on credits — just do not
describe it as highly available.
