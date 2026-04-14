/**
 * React Query hooks for Orders system
 * Provides data fetching and mutation for orderreeksen and orders
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  OrderType,
  OrderreeksCreate,
  OrderreeksUpdate,
  OrderreeksResponse,
  OrderResponse,
  OrderDetailResponse,
  OrderAssign,
  LinkPosnummersRequest
} from '@/types/database'

// =====================================================
// Order Types Queries
// =====================================================

export function useOrderTypes() {
  return useQuery({
    queryKey: ['orderTypes'],
    queryFn: async () => {
      const response = await api.get<OrderType[]>('/api/order-types')
      return response.data
    },
    staleTime: 1000 * 60 * 60, // 1 hour (order types rarely change)
  })
}

// =====================================================
// Orderreeks Queries
// =====================================================

export function useOrderreeksen(faseId: string, includeInactive = false) {
  return useQuery({
    queryKey: ['orderreeksen', faseId, includeInactive],
    queryFn: async () => {
      const response = await api.get<OrderreeksResponse[]>(
        `/api/fases/${faseId}/orderreeksen`,
        { params: { include_inactive: includeInactive } }
      )
      return response.data
    },
    enabled: !!faseId,
  })
}

export function useOrderreeks(orderreeksId: string | undefined) {
  return useQuery({
    queryKey: ['orderreeks', orderreeksId],
    queryFn: async () => {
      if (!orderreeksId) throw new Error('No orderreeks ID provided')
      const response = await api.get<OrderreeksResponse>(`/api/orderreeksen/${orderreeksId}`)
      return response.data
    },
    enabled: !!orderreeksId,
  })
}

// =====================================================
// Orderreeks Mutations
// =====================================================

export function useCreateOrderreeks(faseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: OrderreeksCreate) => {
      const response = await api.post<OrderreeksResponse>('/api/orderreeksen', data)
      return response.data
    },
    onSuccess: () => {
      // Invalidate orderreeksen list for this fase
      queryClient.invalidateQueries({ queryKey: ['orderreeksen', faseId] })
      // Invalidate fase statistics
      queryClient.invalidateQueries({ queryKey: ['faseStatistics', faseId] })
    },
  })
}

export function useUpdateOrderreeks(orderreeksId: string, faseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: OrderreeksUpdate) => {
      const response = await api.put<OrderreeksResponse>(
        `/api/orderreeksen/${orderreeksId}`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      // Invalidate this specific orderreeks
      queryClient.invalidateQueries({ queryKey: ['orderreeks', orderreeksId] })
      // Invalidate orderreeksen list for this fase
      queryClient.invalidateQueries({ queryKey: ['orderreeksen', faseId] })
    },
  })
}

export function useDeleteOrderreeks(faseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderreeksId: string) => {
      await api.delete(`/api/orderreeksen/${orderreeksId}`)
    },
    onSuccess: () => {
      // Invalidate orderreeksen list
      queryClient.invalidateQueries({ queryKey: ['orderreeksen', faseId] })
      // Invalidate fase statistics
      queryClient.invalidateQueries({ queryKey: ['faseStatistics', faseId] })
    },
  })
}

// =====================================================
// Order Queries
// =====================================================

export function useOrders(filters?: {
  statusFilter?: string
  assignedToMe?: boolean
}) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const response = await api.get<OrderResponse[]>('/api/orders', {
        params: filters,
      })
      return response.data
    },
  })
}

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('No order ID provided')
      const response = await api.get<OrderDetailResponse>(`/api/orders/${orderId}`)
      return response.data
    },
    enabled: !!orderId,
  })
}

// =====================================================
// Order Mutations
// =====================================================

export function useAssignOrder(orderId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: OrderAssign) => {
      const response = await api.put<OrderResponse>(
        `/api/orders/${orderId}/assign`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      // Invalidate this specific order
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useLinkPosnummers(orderId: string, faseId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: LinkPosnummersRequest) => {
      const response = await api.post(
        `/api/orders/${orderId}/link-posnummers`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      // Invalidate this specific order to refresh posnummer count
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      if (faseId) {
        queryClient.invalidateQueries({ queryKey: ['orderreeksen', faseId] })
      }
    },
  })
}

export function useUnlinkPosnummers(orderId: string, faseId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: LinkPosnummersRequest) => {
      const response = await api.delete(
        `/api/orders/${orderId}/link-posnummers`,
        { data }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      if (faseId) {
        queryClient.invalidateQueries({ queryKey: ['orderreeksen', faseId] })
      }
    },
  })
}
