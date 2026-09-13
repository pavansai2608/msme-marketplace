import axios from 'axios'

/**
 * The one configured axios instance for the whole app.
 *
 * Auth lives in httpOnly cookies, so nothing is read from or written to
 * localStorage. Two things are handled centrally:
 *
 *  1. CSRF - the readable `csrfToken` cookie is echoed back in a header on
 *     every state-changing request (double-submit).
 *  2. Silent refresh - a 401 triggers ONE call to /api/auth/refresh and the
 *     original request is retried once. Concurrent 401s share that single
 *     refresh rather than each firing their own.
 */
const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,
})

const readCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

const UNSAFE = ['post', 'put', 'patch', 'delete']

http.interceptors.request.use((config) => {
  if (UNSAFE.includes((config.method || 'get').toLowerCase())) {
    const csrf = readCookie('csrfToken')
    if (csrf) config.headers['X-CSRF-Token'] = csrf
  }
  return config
})

// Single-flight refresh: the first 401 starts a refresh, everyone else waits
// on the same promise. Without this, N concurrent 401s would fire N refreshes
// and rotation would make all but one look like token reuse - which would
// revoke the user's whole session.
let refreshPromise = null

const runRefresh = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post('/api/auth/refresh', null, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': readCookie('csrfToken') || '' },
      })
      .finally(() => {
        // Cleared only after settling, so late arrivals join THIS attempt.
        refreshPromise = null
      })
  }
  return refreshPromise
}

const onRefreshFailure = () => {
  try {
    localStorage.removeItem('user')
  } catch {
    // Private mode or blocked storage: nothing to clean up.
  }
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login'
  }
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error

    if (!response || response.status !== 401 || !config) {
      return Promise.reject(error)
    }

    // Never try to refresh the refresh call itself, and never retry twice.
    // `_retried` is the guard that makes an infinite loop impossible.
    if (config._retried || config.url?.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    // A revoked family cannot be recovered by refreshing.
    if (response.data?.code === 'token_reuse' || response.data?.code === 'token_revoked') {
      onRefreshFailure()
      return Promise.reject(error)
    }

    config._retried = true

    try {
      await runRefresh()
    } catch (refreshError) {
      onRefreshFailure()
      return Promise.reject(refreshError)
    }

    return http(config)
  }
)

export default http
export { readCookie }
