import { useQuery } from '@tanstack/react-query'
import { qk } from '../lib/queryClient'
import * as productApi from '../api/productApi'

// The catalogue is effectively static while someone browses it: a seller
// adding a product mid-session is not worth a refetch on every keystroke.
const CATALOGUE_STALE = 60_000

export function useProducts({ search = '', category = 'All' } = {}) {
  return useQuery({
    queryKey: qk.products({ search, category }),
    queryFn: () => productApi.getProducts({ search, category }),
    select: (res) => res.data ?? [],
    staleTime: CATALOGUE_STALE,
    // Keeps the previous page's rows on screen while a new search loads,
    // instead of collapsing the grid to a skeleton on every keystroke.
    placeholderData: (previous) => previous,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: qk.categories(),
    queryFn: productApi.getCategories,
    select: (res) => res.data ?? [],
    // Categories change when a whole new product category is introduced -
    // roughly never during a session.
    staleTime: 60 * 60_000,
  })
}

export function useProduct(id) {
  return useQuery({
    queryKey: qk.product(id),
    queryFn: () => productApi.getProduct(id),
    select: (res) => res.data,
    enabled: Boolean(id),
    staleTime: CATALOGUE_STALE,
  })
}

export function useSimilarProducts(id, k = 10) {
  return useQuery({
    queryKey: [...qk.product(id), 'similar', k],
    queryFn: () => productApi.getSimilarProducts(id, k),
    select: (res) => res.data ?? [],
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
    // An optional row. If the recommender is down the page must still work,
    // so a failure here is silent rather than retried hard.
    retry: 1,
  })
}
