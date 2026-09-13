import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end configuration.
 *
 * These tests run against a DEPLOYED app - the minikube dev overlay by
 * default - not against `vite dev`. There is no webServer block for that
 * reason: the pipeline deploys first, then points this suite at the result.
 *
 * Reaching the ingress without editing /etc/hosts
 * ----------------------------------------------
 * The ingress routes on the Host header, so http://msme.local has to resolve.
 * Rather than require a sudo line on every machine, E2E_HOST_MAP is handed
 * straight to Chromium's own resolver:
 *
 *   E2E_HOST_MAP="msme.local 127.0.0.1:8088"
 *
 * paired with `kubectl port-forward -n ingress-nginx \
 *   svc/ingress-nginx-controller 8088:80`. The browser then sends
 * `Host: msme.local` to the forwarded port, the ingress matches its rule, and
 * the real ingress path is exercised - including the /api split - with no
 * root access anywhere.
 *
 * If /etc/hosts does point msme.local at `minikube ip`, leave E2E_HOST_MAP
 * unset and it all works directly.
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://msme.local'
const HOST_MAP = process.env.E2E_HOST_MAP || ''
const IS_CI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',

  // A real deployment talking to Atlas is slower than a local dev server, and
  // the recommender row in particular waits on a cross-service call.
  timeout: 60_000,
  expect: { timeout: 15_000 },

  // Files run in parallel; tests inside one file stay in order. That matters:
  // the shopping spec mutates the fixture buyer's cart step by step, and it is
  // the only file that does, so cross-file parallelism is still safe.
  fullyParallel: false,
  // Two, everywhere - not "however many cores this machine has".
  //
  // The dev overlay runs ONE backend replica capped at 500m CPU, and the app's
  // own axios client gives up after 15s. Eight parallel browsers push
  // become-seller (an unindexed regex scan over the users collection) past
  // that timeout, and the failure then looks like a broken page rather than a
  // saturated deployment. Pinning it also makes a local run and a CI run
  // reproduce each other.
  workers: 2,

  // Atlas is intermittently slow to hand out a replica-set member. One retry
  // absorbs that without hiding a genuine failure, which would fail twice.
  retries: IS_CI ? 2 : 0,

  // A stray test.only must not quietly shrink the suite on a CI run.
  forbidOnly: IS_CI,

  reporter: [
    ['list'],
    // Consumed by the junit step in stage 3/6 of the Jenkinsfile.
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
    // Archived and published by the htmlpublisher step in stage 7.
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,
    // Artefacts only where they earn their keep: a green run leaves nothing
    // behind, a red one leaves everything needed to explain it.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // The app is served over plain HTTP in dev; nothing here should trip on
    // the self-signed/absent certificate.
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      // Signs the fixture buyer in once and saves the cookie jar, so the
      // specs that need a session do not each pay for a login.
      name: 'setup',
      testMatch: /auth\.setup\.js/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: HOST_MAP ? { args: [`--host-resolver-rules=MAP ${HOST_MAP}`] } : {},
      },
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: HOST_MAP ? { args: [`--host-resolver-rules=MAP ${HOST_MAP}`] } : {},
      },
    },
  ],
})
