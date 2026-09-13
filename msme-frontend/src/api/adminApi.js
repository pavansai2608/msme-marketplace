import http from './http'

// All four endpoints sit behind requireRole('admin') on the server. The shared
// http client carries the cookies and the CSRF header; a non-admin gets a 403
// here, which the caller surfaces rather than swallowing.

export const getStats = () => http.get('/admin/stats').then((r) => r.data)

export const getUsers = ({ page = 1, limit = 20, search = '', role = '' } = {}) =>
  http.get('/admin/users', { params: { page, limit, search, role } }).then((r) => r.data)

export const setUserStatus = (id, isActive) =>
  http.patch(`/admin/users/${id}/status`, { isActive }).then((r) => r.data)

export const getOrders = ({ page = 1, limit = 20, status = '' } = {}) =>
  http.get('/admin/orders', { params: { page, limit, status } }).then((r) => r.data)
