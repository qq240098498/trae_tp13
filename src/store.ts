import { create } from 'zustand'
import type { ServiceItem, Order, OrderStatus, AppNotification, PerformActionRequest, LaundryProduct, OrderProduct, ProductPackage } from '../shared/types'
import * as api from '@/lib/api'

interface AppState {
  services: ServiceItem[]
  products: LaundryProduct[]
  packages: ProductPackage[]
  orders: Order[]
  currentOrder: Order | null
  notifications: AppNotification[]
  unreadCount: number

  fetchServices: () => Promise<void>
  addService: (data: Omit<ServiceItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateService: (id: string, data: Partial<ServiceItem>) => Promise<void>
  deleteService: (id: string) => Promise<void>

  fetchProducts: () => Promise<void>
  addProduct: (data: Omit<LaundryProduct, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateProduct: (id: string, data: Partial<LaundryProduct>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>

  fetchPackages: () => Promise<void>
  addPackage: (data: Omit<ProductPackage, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updatePackage: (id: string, data: Partial<ProductPackage>) => Promise<void>
  deletePackage: (id: string) => Promise<void>

  fetchOrders: (status?: OrderStatus) => Promise<void>
  fetchOrderDetail: (id: string) => Promise<void>
  createOrder: (data: {
    customerName: string
    customerPhone: string
    customerAddress?: string
    items: { serviceId: string; quantity: number }[]
    products?: { productId: string; quantity: number }[]
    packages?: { packageId: string; quantity: number }[]
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
  products: [],
  packages: [],
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

  fetchProducts: async () => {
    try { const products = await api.fetchProducts(); set({ products }) } catch {}
  },

  addProduct: async (data) => {
    const product = await api.createProduct(data)
    set({ products: [...get().products, product] })
  },

  updateProduct: async (id, data) => {
    const updated = await api.updateProduct(id, data)
    set({ products: get().products.map(p => p.id === id ? updated : p) })
  },

  deleteProduct: async (id) => {
    await api.deleteProduct(id)
    set({ products: get().products.filter(p => p.id !== id) })
  },

  fetchPackages: async () => {
    try { const packages = await api.fetchPackages(); set({ packages }) } catch {}
  },

  addPackage: async (data) => {
    const pkg = await api.createPackage(data)
    set({ packages: [...get().packages, pkg] })
  },

  updatePackage: async (id, data) => {
    const updated = await api.updatePackage(id, data)
    set({ packages: get().packages.map(p => p.id === id ? updated : p) })
  },

  deletePackage: async (id) => {
    await api.deletePackage(id)
    set({ packages: get().packages.filter(p => p.id !== id) })
  },

  fetchOrders: async (status) => {
    try { const orders = await api.fetchOrders(status); set({ orders }) } catch {}
  },

  fetchOrderDetail: async (id) => {
    try { const order = await api.fetchOrder(id); set({ currentOrder: order }) } catch {}
  },

  createOrder: async (data) => {
    const pricing = await api.calculatePricingWithProducts(
      data.items,
      data.products || [],
      data.packages || [],
    )
    const order = await api.createOrder({ ...data, items: pricing.items, products: pricing.products, packages: pricing.packages })
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
