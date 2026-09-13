import { test, expect, register, login, logout } from './fixtures.js'
import { BUYER } from './fixture-data.js'

/**
 * Sign-up, sign-in and sign-out against the deployed app.
 *
 * Deliberately one test rather than three: the account this creates is the
 * thing the sign-in step needs, and splitting them would either share state
 * across tests or register three accounts to exercise one flow.
 */
test.describe('account lifecycle', () => {
  test('a visitor can register, sign out and sign back in', async ({ page, runUser }) => {
    // ── Register ──────────────────────────────────────────────────────────
    await register(page, runUser)

    // The form signs the new account straight in and routes to the storefront.
    await page.waitForURL('**/buyer', { timeout: 30_000 })
    await expect(page.getByTestId('account-menu')).toBeVisible()
    await expect(page.getByTestId('account-menu')).not.toContainText('Sign In')

    // ── Sign out ──────────────────────────────────────────────────────────
    await logout(page)
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    // The session cookie is httpOnly, so the only honest check is that a
    // gated page now bounces. /cart requires a session and nothing else.
    await page.goto('/cart')
    await expect(page).toHaveURL(/\/login$/)

    // ── Sign back in ──────────────────────────────────────────────────────
    await login(page, runUser)
    await expect(page.getByTestId('account-menu')).toBeVisible()
    await expect(page).toHaveURL(/\/buyer$/)
  })

  // Uses the fixture account rather than registering another one: the point
  // is that a real, existing account is still refused on a bad password.
  test('the wrong password is refused', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('name@gmail.com').fill(BUYER.email)
    await page.getByPlaceholder('Enter your security password').fill('definitely-not-it')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByTestId('login-error')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })
})
