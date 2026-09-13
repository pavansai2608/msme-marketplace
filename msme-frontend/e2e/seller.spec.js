import { test, expect, register, openAccountDrawer, searchCatalogue } from './fixtures.js'

/**
 * The conversion path: a buyer becomes a seller, lists a product, and that
 * product turns up in the public catalogue.
 *
 * It registers its own account because becoming a seller is a one-way change
 * to the user's role - reusing the shared fixture buyer would break every
 * other spec that relies on it still being a buyer.
 */
test('a new user can become a seller, list a product and find it in the catalogue', async ({
  page,
  runUser,
}) => {
  const productName = `E2E Listing ${Date.now().toString(36)}`

  // ── Start as an ordinary buyer ────────────────────────────────────────────
  await register(page, runUser)
  await page.waitForURL('**/buyer', { timeout: 30_000 })

  // ── Become a seller ───────────────────────────────────────────────────────
  // Reached through the account drawer, the same way a shopper would find it.
  // A non-seller is sent to /become-seller, since /seller is role-gated and
  // onboarding is what grants the role.
  await openAccountDrawer(page)
  await page.getByRole('button', { name: /seller hub/i }).click()
  await page.waitForURL('**/become-seller')

  await page.getByPlaceholder('e.g. Acme MSME Solutions').fill(`${runUser.name} Crafts`)

  // States and districts are fetched at runtime, and the district list only
  // populates after a state is chosen - so each select waits for its own
  // options rather than for a fixed delay.
  const [stateSelect, districtSelect] = [
    page.locator('select').first(),
    page.locator('select').nth(1),
  ]
  await expect(stateSelect.locator('option', { hasText: 'Karnataka' })).toHaveCount(1)
  await stateSelect.selectOption('Karnataka')

  await expect(districtSelect.locator('option')).not.toHaveCount(1)
  await districtSelect.selectOption({ index: 1 })

  await page.getByPlaceholder('Full name as registered').fill(runUser.name)
  await page.getByRole('button', { name: /complete registration/i }).click()

  await page.waitForURL('**/seller', { timeout: 45_000 })

  // ── List a product ────────────────────────────────────────────────────────
  await page.getByText('Boutique Inventory', { exact: true }).first().click()
  await page.getByRole('button', { name: /list new item/i }).click()
  await expect(page.getByRole('heading', { name: /list new product/i })).toBeVisible()

  await page.getByPlaceholder('e.g. Silk Saree').fill(productName)
  // Typing the category regenerates the size rows for that category, so it
  // has to be filled before the stock value below.
  await page.getByPlaceholder('e.g. Saree, Shirt...').fill('Metalwork')
  await page
    .getByTestId('product-description')
    .fill(
      'Listed by the automated end-to-end suite to prove a seller can publish ' +
        'a product and have it appear in the public catalogue.'
    )
  await page.getByTestId('product-price').fill('2499')
  await page.getByPlaceholder('https://image-url.com').first().fill('https://example.com/e2e.jpg')

  // Stock must be non-zero: the model auto-delists a product whose total
  // stock is zero, and a delisted product would never reach the catalogue -
  // the test would then fail at the last step for the wrong reason.
  await page.getByTestId('product-size-stock').first().fill('25')

  await page.getByRole('button', { name: /create listing/i }).click()

  // The modal closes on success, and the new row appears in the inventory.
  await expect(page.getByRole('heading', { name: /list new product/i })).toBeHidden()
  await expect(page.getByText(productName).first()).toBeVisible()

  // ── It is publicly visible ────────────────────────────────────────────────
  await page.goto('/buyer')
  await searchCatalogue(page, productName)
  await expect(page.getByTestId('product-card').filter({ hasText: productName })).toHaveCount(1)
})
