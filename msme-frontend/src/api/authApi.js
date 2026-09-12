import axios from 'axios'

// Use relative URL for Vite proxy compatibility
const API = axios.create({
  baseURL: '/api/auth',
  withCredentials: true,
  timeout: 10000, // 10 seconds
})

// The JWT lives only in the httpOnly `token` cookie, which the browser
// attaches automatically because of withCredentials. Nothing is read from or
// written to localStorage, so an XSS cannot exfiltrate the session.

// Handle 401 globally — auto logout on session expiry
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const loginUser     = (data) => API.post('/login', data).then(r => r.data)
export const registerUser  = (data) => API.post('/register', data).then(r => r.data)
export const getMe         = ()     => API.get('/me').then(r => r.data)
export const updateProfile = (data) => API.put('/update-profile', data).then(r => r.data)
export const becomeSeller  = (data) => API.post('/become-seller', data).then(r => r.data)
export const logoutUser    = ()     => API.post('/logout').then(r => r.data)
export const pingAuth      = ()     => API.get('/ping').then(r => r.data)
export const googleAuthURL = ()     => `/api/auth/google`
