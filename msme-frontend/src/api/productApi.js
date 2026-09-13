import http from './http'

export const getProducts = ({ search = '', category = 'All' } = {}) => {
  const params = new URLSearchParams()
  if (search) params.append('search', search)
  if (category && category !== 'All') params.append('category', category)
  const qs = params.toString()
  return http.get(`/products${qs ? `?${qs}` : ''}`).then((r) => r.data)
}

export const getProduct = (id) => http.get(`/products/${id}`).then((r) => r.data)
export const getCategories = () => http.get('/products/categories').then((r) => r.data)
export const getSimilarProducts = (id, k = 10) =>
  http.get(`/products/${id}/similar?k=${k}`).then((r) => r.data)
export const getSellerProducts = () => http.get('/products/seller/me').then((r) => r.data)
export const addProduct = (data) => http.post('/products', data).then((r) => r.data)
export const updateProduct = (id, data) => http.put(`/products/${id}`, data).then((r) => r.data)
export const deleteProduct = (id) => http.delete(`/products/${id}`).then((r) => r.data)
export const updateProfile = (data) => http.put('/auth/update-profile', data).then((r) => r.data)
