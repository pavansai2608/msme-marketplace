/**
 * The fixture accounts and product the suite expects to already exist.
 *
 * These MIRROR the FIXTURE block in msme-backend/scripts/seedE2E.js, which is
 * what actually writes them. That script is the writer, this file is the
 * reader; if you change one, change the other. `node scripts/seedE2E.js
 * --print` dumps the authoritative values for comparison.
 *
 * Nothing here is secret: it is a throwaway account in a development
 * database, created by a script that lives in the repo. Real credentials
 * never appear in test code.
 */

export const BUYER = {
  email: process.env.E2E_BUYER_EMAIL || 'e2e-buyer@msme.local',
  password: process.env.E2E_PASSWORD || 'E2ePassw0rd!',
  name: 'E2E Buyer',
}

/** The one product the shopping flow searches for, added by seedE2E.js. */
export const FIXTURE_PRODUCT = {
  name: 'E2E Fixture Brass Lamp',
  category: 'Metalwork',
  price: 1499,
}

/**
 * Accounts a test registers for itself use this prefix. seedE2E.js purges
 * every account matching it, so a run that crashes half way through still
 * leaves the database clean for the next one.
 */
export const RUN_PREFIX = 'e2e-run-'

/** Where the signed-in buyer's cookie jar is parked by the setup project. */
export const BUYER_STATE = 'e2e/.auth/buyer.json'

/** A unique, purgeable identity for a test that needs its own account. */
export function makeRunUser(label) {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
  return {
    name: `E2E ${label} ${stamp}`,
    email: `${RUN_PREFIX}${label}-${stamp}@msme.local`.toLowerCase(),
    password: 'E2ePassw0rd!',
  }
}
