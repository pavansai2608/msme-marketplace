import { test, expect, apiCall } from './fixtures.js'

/**
 * A buyer must not reach the seller workspace or the admin dashboard.
 *
 * Checked at both layers, because they fail differently and only one of them
 * is security:
 *
 *   the router  - redirects before the page mounts, so a buyer never sees a
 *                 half-rendered dashboard firing requests it will be refused.
 *   the API     - refuses regardless of what the browser did. This is the
 *                 control; the redirect is only the courtesy.
 */
test.describe('a buyer is kept out of the privileged areas', () => {
  test('the seller workspace redirects back to the storefront', async ({ buyerPage: page }) => {
    await page.goto('/seller')

    await expect(page).toHaveURL(/\/buyer$/)
    // Not merely "not on /seller": the workspace must not have rendered at all.
    await expect(page.getByText('SellerHub')).toHaveCount(0)
  })

  test('the admin dashboard redirects back to the storefront', async ({ buyerPage: page }) => {
    await page.goto('/admin')

    await expect(page).toHaveURL(/\/buyer$/)
    await expect(page.getByRole('heading', { name: /total revenue/i })).toHaveCount(0)
  })

  test('the API refuses the same routes, whatever the browser did', async ({ buyerPage: page }) => {
    await page.goto('/buyer')

    // requireRole('admin') - a signed-in buyer is authenticated but not
    // authorised, which is 403 rather than 401.
    for (const path of ['/api/admin/stats', '/api/admin/users', '/api/admin/orders']) {
      const { status } = await apiCall(page, 'GET', path)
      expect(status, `${path} should refuse a buyer`).toBe(403)
    }

    // Product creation is the seller-side equivalent.
    const { status } = await apiCall(page, 'POST', '/api/products', { name: 'nope' })
    expect(status).toBe(403)
  })
})
