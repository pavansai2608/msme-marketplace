import http from './http'

export const getProducts = () => http.get('/products').then((r) => r.data)
export const getSellerProducts = () => http.get('/products/seller/me').then((r) => r.data)
export const addProduct = (data) => http.post('/products', data).then((r) => r.data)
export const updateProduct = (id, data) => http.put(`/products/${id}`, data).then((r) => r.data)
export const deleteProduct = (id) => http.delete(`/products/${id}`).then((r) => r.data)
export const updateProfile = (data) => http.put('/auth/update-profile', data).then((r) => r.data)
