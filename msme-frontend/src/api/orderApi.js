import axios from 'axios'

const API = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export const getOrders         = ()      => API.get('/orders').then(r => r.data)
export const updateOrderStatus = (id, status) => API.put(`/orders/${id}`, { status }).then(r => r.data)
