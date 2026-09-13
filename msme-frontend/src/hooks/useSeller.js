import { useQuery } from '@tanstack/react-query'
import { qk } from '../lib/queryClient'
import * as productApi from '../api/productApi'
import http from '../api/http'

// The seller workspace is a working tool, not a dashboard someone leaves open:
// a minute of cache keeps tab switching instant without showing stale stock.
const SELLER_STALE = 60_000

export function useSellerProducts({ enabled = true } = {}) {
  return useQuery({
    queryKey: qk.seller.products(),
    queryFn: productApi.getSellerProducts,
    select: (res) => res.data ?? [],
    enabled,
    staleTime: SELLER_STALE,
  })
}

export function useSellerOrders({ enabled = true } = {}) {
  return useQuery({
    queryKey: qk.seller.orders(),
    queryFn: () => http.get('/orders/seller').then((r) => r.data),
    select: (res) => res.data ?? [],
    enabled,
    staleTime: SELLER_STALE,
  })
}

export function useSellerStats({ enabled = true } = {}) {
  return useQuery({
    queryKey: qk.seller.stats(),
    queryFn: () => http.get('/orders/seller/stats').then((r) => r.data),
    select: (res) => res.data ?? { totalSales: 0, activeOrders: 0 },
    enabled,
    staleTime: SELLER_STALE,
  })
}

export function useSellerForecast({ enabled = true } = {}) {
  return useQuery({
    queryKey: qk.seller.forecast(),
    queryFn: () => http.get('/orders/seller/forecast').then((r) => r.data),
    enabled,
    // The forecast calls the recommender, which is the slowest dependency
    // here and changes least often.
    staleTime: 5 * 60_000,
  })
}
