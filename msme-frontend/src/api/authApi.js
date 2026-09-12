import axios from 'axios'

// Use relative URL for Vite proxy compatibility
const API = axios.create({
  baseURL: '/api/auth',
  withCredentials: true,
  timeout: 10000, // 10 seconds
})

// Add token to headers if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — auto logout on session expiry
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const saveToken = (data) => {
  if (data && data.token) localStorage.setItem('token', data.token);
  return data;
};

export const loginUser     = (data) => API.post('/login', data).then(r => saveToken(r.data))
export const registerUser  = (data) => API.post('/register', data).then(r => saveToken(r.data))
export const getMe         = ()     => API.get('/me').then(r => saveToken(r.data))
export const updateProfile = (data) => API.put('/update-profile', data).then(r => saveToken(r.data))
export const logoutUser    = ()     => {
  localStorage.removeItem('token');
  return API.post('/logout').then(r => r.data);
}
export const pingAuth      = ()     => API.get('/ping').then(r => r.data)
export const googleAuthURL = ()     => `http://localhost:5000/api/auth/google`
