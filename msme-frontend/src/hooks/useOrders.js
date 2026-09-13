import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { qk } from '../lib/queryClient'
import * as userApi from '../api/userApi'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { queryClient } from '../lib/queryClient'

export function useMyOrders() {
  const { user } = useAuth()
  return useQuery({
    queryKey: qk.myOrders(),
    queryFn: userApi.getMyOrders,
    select: (res) => res.data ?? [],
    enabled: Boolean(user),
    // Order status moves on the seller's schedule, not the buyer's; a minute
    // of staleness is invisible and saves a request per visit.
    staleTime: 60_000,
  })
}

export function usePlaceOrder() {
  const toast = useToast()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload) => userApi.placeOrder(payload),
    onSuccess: (data) => {
      // The cart is emptied server-side by the checkout, and the new order
      // belongs in the orders list.
      queryClient.invalidateQueries({ queryKey: qk.cart() })
      queryClient.invalidateQueries({ queryKey: qk.myOrders() })
      navigate('/order-success', { state: { order: data.data } })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Order placement failed')
    },
  })
}
