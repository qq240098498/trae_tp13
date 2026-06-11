import { create } from 'zustand'
import type { ServiceItem, Order, OrderStatus, AppNotification, PerformActionRequest } from '../shared/types'
import * as api from '@/lib/api'

interface AppState {
  services: ServiceItem[]
  orders: Order[]
  currentOrder: Order | null
  notifications: AppNotification[]
  unreadCount: number

  fetchServices: () => Promise<void>
  addService: (data: Omit<ServiceItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateService: (id: string, data: Partial<ServiceItem>) => Promise<void>
  deleteService: (id: string) => Promise<void>

  fetchOrders: (status?: OrderStatus) => Promise<void>
  fetchOrderDetail: (id: string) => Promise<void>
  createOrder: (data: {
    customerName: string
    customerPhone: string
    customerAddress?: string
    items: { serviceId: string; quantity: number }[]
    pickupMethod: string
    remark?: string
  }) => Promise<Order>
  performAction: (id: string, action: PerformActionRequest) => Promise<void>
  updateStatus: (id: string, status: OrderStatus, operator?: string) => Promise<void>
  cancelOrder: (id: string) => Promise<void>

  fetchNotifications: () => Promise<void>
  markRead: (id: string) => Promise<void>
  fetchUnreadCount: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  services: [],
  orders: [],
  currentOrder: null,
  notifications: [],
  unreadCount: 0,

  fetchServices: async () => {
    try { const services = await api.fetchServices(); set({ services }) } catch {}
  },

  addService: async (data) => {
    const service = await api.createService(data)
    set({ services: [...get().services, service] })
  },

  updateService: async (id, data) => {
    const updated = await api.updateService(id, data)
    set({ services: get().services.map(s => s.id === id ? updated : s) })
  },

  deleteService: async (id) => {
    await api.deleteService(id)
    set({ services: get().services.filter(s => s.id !== id) })
  },

  fetchOrders: async (status) => {
    try { const orders = await api.fetchOrders(status); set({ orders }) } catch {}
  },

  fetchOrderDetail: async (id) => {
    try { const order = await api.fetchOrder(id); set({ currentOrder: order }) } catch {}
  },

  createOrder: async (data) => {
    const pricing = await api.calculatePricing(data.items)
    const order = await api.createOrder({ ...data, items: pricing.items })
    set({ orders: [order, ...get().orders] })
    return order
  },

  performAction: async (id, action) => {
    const updated = await api.performAction(id, action)
    set({
      orders: get().orders.map(o => o.id === id ? updated : o),
      currentOrder: get().currentOrder?.id === id ? updated : get().currentOrder,
    })
  },

  updateStatus: async (id, status, operator) => {
    const updated = await api.updateOrderStatus(id, status, operator)
    set({
      orders: get().orders.map(o => o.id === id ? updated : o),
      currentOrder: get().currentOrder?.id === id ? updated : get().currentOrder,
    })
  },

  cancelOrder: async (id) => {
    const updated = await api.cancelOrder(id)
    set({
      orders: get().orders.map(o => o.id === id ? updated : o),
      currentOrder: get().currentOrder?.id === id ? updated : get().currentOrder,
    })
  },

  fetchNotifications: async () => {
    try { const notifications = await api.fetchNotifications(); set({ notifications }) } catch {}
  },

  markRead: async (id) => {
    await api.markNotificationRead(id)
    set({
      notifications: get().notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, get().unreadCount - 1),
    })
  },

  fetchUnreadCount: async () => {
    try { const count = await api.fetchUnreadCount(); set({ unreadCount: count }) } catch {}
  },
}))
