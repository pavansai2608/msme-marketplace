import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qk } from '../lib/queryClient'
import * as userApi from '../api/userApi'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export function useAddresses() {
  const { user } = useAuth()
  return useQuery({
    queryKey: qk.addresses(),
    queryFn: userApi.getAddresses,
    select: (res) => res.data ?? [],
    enabled: Boolean(user),
    staleTime: 60_000,
  })
}

export function useSaveAddress() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, values }) =>
      id ? userApi.updateAddress(id, values) : userApi.addAddress(values),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: qk.addresses() })
      toast.success(id ? 'Address updated' : 'Address saved')
    },
    onError: (err) => {
      // The server returns the specific validator message ("Pincode must be
      // exactly 6 digits"), which is more useful than a generic failure.
      toast.error(err?.response?.data?.message || 'Could not save that address')
    },
  })
}

export function useDeleteAddress() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (id) => userApi.deleteAddress(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: qk.addresses() })
      const previous = queryClient.getQueryData(qk.addresses())
      queryClient.setQueryData(qk.addresses(), (old) =>
        old ? { ...old, data: (old.data ?? []).filter((a) => a._id !== id) } : old
      )
      return { previous }
    },

    onError: (err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(qk.addresses(), context.previous)
      }
      toast.error(err?.response?.data?.message || 'Could not delete that address')
    },

    onSuccess: () => toast.success('Address deleted'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.addresses() }),
  })
}
