import { test as base, expect } from '@playwright/test'
import { BUYER_STATE, makeRunUser } from './fixture-data.js'

/**
 * Shared fixtures and page actions.
 *
 * Everything here is written against roles, labels and placeholders the user
 * can actually see. Nothing waits on a timer: each action ends on an
 * assertion or a locator, and Playwright's auto-wait does the rest. A sleep
 * anywhere in this suite would be a bug - it would either slow a green run
 * down or paper over a real race.
 *
 * One rule worth knowing: API calls go through `page.evaluate(fetch)`, never
 * through `page.request`. APIRequestContext resolves hostnames in Node, and
 * the ingress host (msme.local) only resolves inside the browser, where
 * --host-resolver-rules applies. Using page.request would work on a machine
 * with an /etc/hosts entry and fail on every other one.
 */

// ─────────────────────────────────────────────────────────────────────────────
// API helpers - run inside the page, so they share its cookies and resolver
// ─────────────────────────────────────────────────────────────────────────────

/** Calls the API as the current page's user. Returns { status, body }. */
export async function apiCall(page, method, path, body) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/)
      const csrf = match ? decodeURIComponent(match[1]) : ''

      const res = await fetch(path, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })

      let parsed = null
      try {
        parsed = await res.json()
      } catch {
        parsed = null
      }
      return { status: res.status, body: parsed }
    },
    { method, path, body }
  )
}

/**
 * Empties the signed-in buyer's cart.
 *
 * Done through the API rather than by clicking through the cart page:
 * clearing state is setup, not the thing under test, and driving it through
 * the UI would make an unrelated failure look like a checkout failure.
 */
export async function emptyCart(page) {
  const { status, body } = await apiCall(page, 'GET', '/api/cart')
  if (status !== 200) return

  for (const item of body?.data?.items || []) {
    const productId = item.product?._id ?? item.product
    await apiCall(page, 'DELETE', `/api/cart/${productId}/${encodeURIComponent(item.size)}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Signs in through the real login form and waits for the storefront.
 *
 * Races the redirect against the form's own error banner, so a wrong password
 * or a missing fixture account reports itself instead of timing out with
 * "waiting for **\/buyer", which says nothing about the cause.
 */
export async function login(page, { email, password }) {
  await page.goto('/login')
  await page.getByPlaceholder('name@gmail.com').fill(email)
  await page.getByPlaceholder('Enter your security password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  const banner = page.getByTestId('login-error')
  const outcome = await Promise.race([
    page.waitForURL('**/buyer', { timeout: 30_000 }).then(() => 'ok'),
    banner
      .waitFor({ state: 'visible', timeout: 30_000 })
      .then(() => banner.textContent())
      .then((text) => `rejected: ${text?.trim()}`),
  ])

  if (outcome !== 'ok') {
    throw new Error(
      `Login as ${email} failed - the API said "${outcome.replace('rejected: ', '')}". ` +
        'If the fixture account is missing, seed it:  cd msme-backend && node scripts/seedE2E.js'
    )
  }

  await expect(page.getByTestId('account-menu')).toBeVisible()
}

/** Registers a new account through the sign-up form. */
export async function register(page, { name, email, password }) {
  await page.goto('/register')
  await page.getByPlaceholder('Enter your name').fill(name)
  await page.getByPlaceholder('name@gmail.com').fill(email)
  await page.getByPlaceholder('Create a strong security password').fill(password)
  await page.getByRole('button', { name: /register now/i }).click()
}

/** Opens the account drawer, which holds logout and the seller entry point. */
export async function openAccountDrawer(page) {
  await page.getByTestId('account-menu').click()
  await expect(page.getByRole('button', { name: /logout securely/i })).toBeVisible()
}

/** Signs out and waits for the login page the app sends you back to. */
export async function logout(page) {
  await openAccountDrawer(page)
  await page.getByRole('button', { name: /logout securely/i }).click()
  await page.waitForURL('**/login', { timeout: 30_000 })
}

/**
 * Types into the storefront search box and waits for the grid to settle.
 *
 * The query is served by the API, so the assertion is on the rendered result
 * rather than on the request - which is what makes this reliable without
 * pinning it to a particular number of round trips.
 */
export async function searchCatalogue(page, query) {
  await page.getByPlaceholder('Search products or business names...').fill(query)
  await expect(page.getByTestId('product-card').first()).toBeVisible()
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

export const test = base.extend({
  /**
   * A page already signed in as the seeded fixture buyer.
   *
   * The session comes from the cookie jar the setup project saved, so no test
   * pays for a login it is not actually testing. Read-only: it changes no
   * server state, which is what makes it safe to share across workers.
   */
  buyerPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: BUYER_STATE })
    const page = await context.newPage()

    await use(page)

    await context.close()
  },

  /**
   * The same signed-in buyer, with an empty cart on the way in and on the way
   * out.
   *
   * Deliberately separate from buyerPage. Every spec shares one fixture
   * account, so if the plain fixture cleared the cart then an unrelated
   * read-only spec finishing in another worker would empty the cart out from
   * under a checkout that was half way through. Only the spec that actually
   * owns the cart gets to reset it.
   */
  shoppingPage: async ({ buyerPage }, use) => {
    await buyerPage.goto('/buyer')
    await emptyCart(buyerPage)

    await use(buyerPage)

    await emptyCart(buyerPage).catch(() => {})
  },

  /**
   * A throwaway identity for a test that has to own its account - signing up,
   * or converting to a seller, neither of which can reuse a shared fixture.
   * The e2e-run- prefix is what seedE2E.js purges.
   */
  runUser: async ({}, use, testInfo) => {
    const label = testInfo.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24)
    await use(makeRunUser(label || 'user'))
  },
})

export { expect }
