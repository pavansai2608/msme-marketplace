import http from './http'

export const getCart = () => http.get('/cart').then((r) => r.data)
export const addToCart = (payload) => http.post('/cart/add', payload).then((r) => r.data)
export const updateCartItem = (payload) => http.put('/cart/update', payload).then((r) => r.data)
export const removeFromCart = (payload) =>
  http.delete('/cart/remove', { data: payload }).then((r) => r.data)
