import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qk } from '../lib/queryClient'
import * as cartApi from '../api/cartApi'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export function useCart({ enabled } = {}) {
  const { user } = useAuth()
  return useQuery({
    queryKey: qk.cart(),
    queryFn: cartApi.getCart,
    select: (res) => res.data,
    enabled: enabled ?? Boolean(user),
    // A cart is the one thing that must not be stale: stock and price are
    // re-read at checkout and a wrong line total is immediately visible.
    staleTime: 10_000,
  })
}

const matches = (item, productId, size) =>
  (item.product?._id ?? item.product) === productId && item.size === size

/**
 * Optimistic quantity change.
 *
 * Writes the new quantity into the cached cart straight away so the line total
 * and the bag badge move with the click, and restores the snapshot if the
 * server refuses (out of stock, for instance).
 */
export function useUpdateCartQuantity() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ productId, size, quantity }) =>
      cartApi.updateCartItem({ productId, size, quantity }),

    onMutate: async ({ productId, size, quantity }) => {
      await queryClient.cancelQueries({ queryKey: qk.cart() })
      const previous = queryClient.getQueryData(qk.cart())

      queryClient.setQueryData(qk.cart(), (old) => {
        if (!old?.data?.items) return old
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.map((item) =>
              matches(item, productId, size) ? { ...item, quantity } : item
            ),
          },
        }
      })

      return { previous }
    },

    onError: (err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(qk.cart(), context.previous)
      }
      toast.error(err?.response?.data?.message || 'Could not update the quantity')
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.cart() }),
  })
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ productId, size }) => cartApi.removeFromCart({ productId, size }),

    onMutate: async ({ productId, size }) => {
      await queryClient.cancelQueries({ queryKey: qk.cart() })
      const previous = queryClient.getQueryData(qk.cart())

      queryClient.setQueryData(qk.cart(), (old) => {
        if (!old?.data?.items) return old
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.filter((item) => !matches(item, productId, size)),
          },
        }
      })

      return { previous }
    },

    onError: (err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(qk.cart(), context.previous)
      }
      toast.error(err?.response?.data?.message || 'Could not remove that item')
    },

    onSuccess: () => toast.success('Removed from your bag'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.cart() }),
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (payload) => cartApi.addToCart(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cart() })
      toast.success('Added to your bag')
    },
    onError: (err) => {
      // The API answers 401 for a signed-out caller; say the useful thing
      // rather than echoing "Not authorized".
      if (!user || err?.response?.status === 401) {
        toast.info('Sign in to start shopping')
        return
      }
      toast.error(err?.response?.data?.message || 'Could not add that to your bag')
    },
  })
}
