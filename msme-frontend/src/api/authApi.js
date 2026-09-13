import http from './http'

// Everything goes through the shared client, which attaches the CSRF header
// and performs the single-flight refresh-and-retry on a 401.

export const loginUser = (data) => http.post('/auth/login', data).then((r) => r.data)
export const registerUser = (data) => http.post('/auth/register', data).then((r) => r.data)
export const getMe = () => http.get('/auth/me').then((r) => r.data)

// The boot-time session check. It still attempts a refresh on a 401, so an
// expired access token backed by a live refresh token restores the session as
// usual - but if there is genuinely no session it simply rejects instead of
// redirecting, leaving the caller free to render the page anonymously.
export const probeSession = () =>
  http.get('/auth/me', { skipAuthRedirect: true }).then((r) => r.data)
export const updateProfile = (data) => http.put('/auth/update-profile', data).then((r) => r.data)
export const becomeSeller = (data) => http.post('/auth/become-seller', data).then((r) => r.data)
export const logoutUser = () => http.post('/auth/logout').then((r) => r.data)
export const refreshSession = () => http.post('/auth/refresh').then((r) => r.data)
export const pingAuth = () => http.get('/auth/ping').then((r) => r.data)
export const googleAuthURL = () => `/api/auth/google`
