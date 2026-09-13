import { QueryClient } from '@tanstack/react-query'

// Atlas is intermittently flaky from this machine: a query can fail once with a
// timeout and succeed immediately after. Retrying transport failures is the
// difference between a working page and a spurious error card. A 4xx is a real
// answer from the server, though, so it is never retried - retrying a 401 just
// delays the redirect, and retrying a 403 is pointless.
const retryTransportOnly = (failureCount, error) => {
  const status = error?.response?.status
  if (status && status >= 400 && status < 500) return false
  return failureCount < 2
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: retryTransportOnly,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      // The catalogue does not change while someone is browsing it. Refetching
      // on every window focus made the grid flash for no benefit.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      // A mutation that failed has usually already changed something, or the
      // user is waiting on it. Replaying it automatically is the wrong default.
      retry: false,
    },
  },
})

// One place to name cache keys, so an invalidation cannot silently miss a
// query because two files spelled the same key differently.
export const qk = {
  products: (filters) => ['products', filters ?? {}],
  product: (id) => ['product', id],
  categories: () => ['categories'],
  wishlist: () => ['wishlist'],
  cart: () => ['cart'],
  myOrders: () => ['orders', 'mine'],
  addresses: () => ['addresses'],
  recommendations: (endpoint, k) => ['recommendations', endpoint, k],
  seller: {
    products: () => ['seller', 'products'],
    orders: () => ['seller', 'orders'],
    stats: () => ['seller', 'stats'],
    forecast: () => ['seller', 'forecast'],
    schemes: (q) => ['seller', 'schemes', q ?? ''],
  },
  admin: {
    stats: () => ['admin', 'stats'],
    users: (params) => ['admin', 'users', params ?? {}],
    orders: (params) => ['admin', 'orders', params ?? {}],
  },
}
