import { test, expect, searchCatalogue } from './fixtures.js'
import { FIXTURE_PRODUCT } from './fixture-data.js'

/**
 * The buying path, end to end: find a product, open it, put it in the bag and
 * pay for it.
 *
 * Runs against the seeded fixture product rather than whatever happens to be
 * first in the catalogue, so "one result" is a real assertion and not a
 * coincidence of the current data.
 *
 * The shoppingPage fixture empties the cart on the way in and on the way out,
 * so this can be re-run without the totals drifting.
 */
test('a buyer can search, open a product, add it to the bag and check out', async ({
  shoppingPage: page,
}) => {
  // ── Search ────────────────────────────────────────────────────────────────
  await page.goto('/buyer')
  await searchCatalogue(page, FIXTURE_PRODUCT.name)

  const card = page.getByTestId('product-card').filter({ hasText: FIXTURE_PRODUCT.name })
  await expect(card).toHaveCount(1)

  // ── Open it ───────────────────────────────────────────────────────────────
  await card.click()
  await page.waitForURL('**/product/**')
  await expect(page.getByRole('heading', { name: FIXTURE_PRODUCT.name })).toBeVisible()

  // ── Add to bag ────────────────────────────────────────────────────────────
  // The page selects the first in-stock size itself, so the button is armed
  // as soon as the product has loaded.
  const addToBag = page.getByRole('button', { name: /add to bag/i })
  await expect(addToBag).toBeEnabled()
  await expect(page.getByTestId('cart-count')).toHaveText('0')
  await addToBag.click()

  // Wait for the badge to move before navigating. The click only STARTS the
  // request; leaving the page immediately would abort it in flight and the
  // bag would be empty for reasons that have nothing to do with the app.
  await expect(page.getByTestId('cart-count')).toHaveText('1')

  // ── The bag ───────────────────────────────────────────────────────────────
  await page.goto('/cart')
  await expect(page.getByText(FIXTURE_PRODUCT.name).first()).toBeVisible()

  await page.getByRole('button', { name: /checkout now/i }).click()
  await page.waitForURL('**/checkout')

  // ── Shipping ──────────────────────────────────────────────────────────────
  // Values chosen to satisfy the same rules the API enforces: 10-digit phone,
  // 6-digit pincode. A near-miss here would surface as a 400, not a form error.
  await page.getByPlaceholder('Full name').fill('E2E Buyer')
  await page.getByPlaceholder('10-digit mobile').fill('9876543210')
  await page.getByPlaceholder('6-digit PIN').fill('560001')
  await page.getByPlaceholder('Building, Street, Area').fill('4th Cross, Indiranagar')
  await page.getByPlaceholder('City').fill('Bengaluru')

  // The state list is fetched at runtime, so wait for a real option to exist
  // before selecting one - selectOption would otherwise race the fetch.
  const stateSelect = page.locator('select')
  await expect(stateSelect.locator('option', { hasText: 'Karnataka' })).toHaveCount(1)
  await stateSelect.selectOption('Karnataka')

  await page.getByRole('button', { name: /continue to summary/i }).click()

  // ── Review and pay ────────────────────────────────────────────────────────
  await expect(page.getByRole('heading', { name: /review order/i })).toBeVisible()
  await page.getByRole('button', { name: /continue to payment/i }).click()

  await expect(page.getByRole('heading', { name: /^payment$/i })).toBeVisible()
  await page.getByRole('button', { name: /complete purchase/i }).click()

  // ── Order placed ──────────────────────────────────────────────────────────
  await page.waitForURL('**/order-success', { timeout: 45_000 })
  await expect(page.getByRole('heading', { name: /securely placed/i })).toBeVisible()

  // And it is a real order, not just a routed page: it shows up in the
  // buyer's own order history.
  await page.goto('/my-orders')
  await expect(page.getByText(FIXTURE_PRODUCT.name).first()).toBeVisible()
})
