import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qk } from '../lib/queryClient'
import * as userApi from '../api/userApi'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export function useWishlist() {
  const { user } = useAuth()
  return useQuery({
    queryKey: qk.wishlist(),
    queryFn: userApi.getWishlist,
    select: (res) => res.data ?? [],
    // Anonymous visitors have no wishlist; asking would just 401.
    enabled: Boolean(user),
    staleTime: 30_000,
  })
}

// Just the ids, which is all a product grid needs to fill in the hearts.
export function useWishlistIds() {
  const { data = [] } = useWishlist()
  return data.map((item) => item._id)
}

/**
 * Optimistic wishlist toggle.
 *
 * The heart flips the instant it is clicked. If the request then fails the
 * cache is put back exactly as it was - the snapshot taken in onMutate - so
 * the UI never disagrees with the server for longer than the round trip.
 */
export function useToggleWishlist() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (product) => userApi.toggleWishlist(product._id ?? product),

    onMutate: async (product) => {
      const id = product._id ?? product
      // Any refetch in flight would land after the optimistic write and undo
      // it, so it has to be cancelled first.
      await queryClient.cancelQueries({ queryKey: qk.wishlist() })
      const previous = queryClient.getQueryData(qk.wishlist())

      queryClient.setQueryData(qk.wishlist(), (old) => {
        if (!old) return old
        const items = old.data ?? []
        const already = items.some((i) => i._id === id)
        return {
          ...old,
          data: already
            ? items.filter((i) => i._id !== id)
            : // A full product object gives the wishlist page something to
              // render immediately; an id alone would show a blank card.
              [...items, typeof product === 'object' ? product : { _id: id }],
        }
      })

      return { previous }
    },

    onError: (err, _product, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(qk.wishlist(), context.previous)
      }
      toast.error(err?.response?.data?.message || 'Could not update your wishlist')
    },

    // Re-sync with the server either way: on success to pick up the canonical
    // list, on failure to be certain the rollback matched reality.
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.wishlist() }),
  })
}
