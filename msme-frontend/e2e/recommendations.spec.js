import { test, expect } from './fixtures.js'

/**
 * The recommender surfaces.
 *
 * What is asserted is what the shopper is promised: a row of related products
 * on a product page. Which engine answered is recorded as an annotation, not
 * asserted - the backend deliberately falls back to a newest-first list when
 * the recommender is cold or reindexing, and a fallback is correct behaviour,
 * not a failure. Asserting on it would turn a documented degradation into a
 * red build.
 */
test.describe('recommendations', () => {
  test('a product page shows a row of related products', async ({ page }, testInfo) => {
    await page.goto('/buyer')

    // Whichever product is first - the row must work for any of them, so
    // there is nothing to gain from pinning this to a particular item.
    const firstCard = page.getByTestId('product-card').first()
    await expect(firstCard).toBeVisible()

    // Arm the listener before navigating, or the response is missed.
    const similarResponse = page.waitForResponse(
      (res) => res.url().includes('/similar') && res.status() === 200
    )

    await firstCard.click()
    await page.waitForURL('**/product/**')

    const row = page.getByTestId('recommendation-row')
    await expect(row).toBeVisible()
    await expect(page.getByRole('heading', { name: 'You may also like' })).toBeVisible()
    await expect(page.getByTestId('recommendation-card').first()).toBeVisible()

    const body = await (await similarResponse).json()
    testInfo.annotations.push({
      type: 'recommendation source',
      description: `${body.source} (${body.count} items)`,
    })
    expect(body.count).toBeGreaterThan(0)
  })

  test('a recommended product can be opened from the row', async ({ page }) => {
    await page.goto('/buyer')
    await page.getByTestId('product-card').first().click()
    await page.waitForURL('**/product/**')

    const firstProductUrl = page.url()

    const recommendation = page.getByTestId('recommendation-card').first()
    await expect(recommendation).toBeVisible()
    await recommendation.click()

    // The row links somewhere real, and somewhere other than where we were.
    await expect(page).toHaveURL(/\/product\//)
    await expect(page).not.toHaveURL(firstProductUrl)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('the storefront shows a recommended row', async ({ page }) => {
    await page.goto('/buyer')

    await expect(page.getByRole('heading', { name: /recommended for you/i })).toBeVisible()
    await expect(page.getByTestId('recommendation-card').first()).toBeVisible()
  })
})
