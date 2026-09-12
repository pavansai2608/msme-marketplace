import axios from 'axios'

const API = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 10000,
})

// Auth travels in the httpOnly `token` cookie via withCredentials.
// No Authorization header, no localStorage.

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

export const getProducts        = ()      => API.get('/products').then(r => r.data)
export const getSellerProducts  = ()      => API.get('/products/seller/me').then(r => r.data)
export const addProduct         = (data)  => API.post('/products', data).then(r => r.data)
export const updateProduct      = (id, data) => API.put(`/products/${id}`, data).then(r => r.data)
export const deleteProduct      = (id)      => API.delete(`/products/${id}`).then(r => r.data)
export const updateProfile      = (data)  => API.put('/auth/update-profile', data).then(r => r.data)
