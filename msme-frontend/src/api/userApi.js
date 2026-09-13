import http from './http'

export const getWishlist = () => http.get('/user/wishlist').then((r) => r.data)
export const toggleWishlist = (productId) =>
  http.post('/user/wishlist/toggle', { productId }).then((r) => r.data)
export const removeFromWishlist = (id) => http.delete(`/user/wishlist/${id}`).then((r) => r.data)

export const getAddresses = () => http.get('/user/addresses').then((r) => r.data)
export const addAddress = (data) => http.post('/user/addresses', data).then((r) => r.data)
export const updateAddress = (id, data) =>
  http.put(`/user/addresses/${id}`, data).then((r) => r.data)
export const deleteAddress = (id) => http.delete(`/user/addresses/${id}`).then((r) => r.data)

export const getMyOrders = () => http.get('/orders/my-orders').then((r) => r.data)
export const placeOrder = (payload) => http.post('/orders/checkout', payload).then((r) => r.data)
