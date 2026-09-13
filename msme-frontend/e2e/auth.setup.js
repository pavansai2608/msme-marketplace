import { test as setup } from '@playwright/test'
import { login } from './fixtures.js'
import { BUYER, BUYER_STATE } from './fixture-data.js'

/**
 * Signs the fixture buyer in once per run and saves the session.
 *
 * Auth is an httpOnly cookie, so there is nothing to fake: this drives the
 * real login form and stores the resulting cookie jar. Every later spec that
 * needs a signed-in buyer loads it instead of logging in again.
 *
 * login() raises a pointed error if the fixture account is missing, which is
 * the failure a fresh checkout is most likely to hit.
 */
setup('authenticate the fixture buyer', async ({ page }) => {
  await login(page, BUYER)
  await page.context().storageState({ path: BUYER_STATE })
})
