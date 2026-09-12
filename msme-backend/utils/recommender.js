/**
 * HTTP client for the Python recommender service.
 *
 * Every call is best-effort. The recommender is an enhancement, never a
 * dependency: if it is slow, down, or returns something unexpected, the
 * caller falls back to newest-first so the storefront still works.
 */
const axios = require('axios')

const TIMEOUT_MS = 2000

const baseURL = () => process.env.RECOMMENDER_URL || 'http://localhost:8000'

const client = () => axios.create({ baseURL: baseURL(), timeout: TIMEOUT_MS })

/**
 * @returns {Promise<string[]|null>} product ids, or null if unavailable.
 */
const fetchIds = async (path, k) => {
  try {
    const { data } = await client().get(path, { params: { k } })
    const results = data?.results
    if (!Array.isArray(results)) return null
    return results.map((r) => r.product_id).filter(Boolean)
  } catch (err) {
    console.warn(`[recommender] ${path} unavailable: ${err.message}`)
    return null
  }
}

exports.similarToProduct = (productId, k = 10) =>
  fetchIds(`/recommend/product/${encodeURIComponent(productId)}`, k)

exports.recommendForUser = (userId, k = 10) =>
  fetchIds(`/recommend/user/${encodeURIComponent(userId)}`, k)

exports.trending = (k = 10) => fetchIds('/recommend/trending', k)

exports.TIMEOUT_MS = TIMEOUT_MS
