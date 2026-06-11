import type { ServiceItem, Order, OrderStatus, AppNotification, OrderItem, PerformActionRequest } from '../../shared/types'

const BASE = '/api'

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  const json: ApiResponse<T> = await res.json()
  if (!json.success) throw new Error(json.error || '请求失败')
  return json.data
}

function parseNumber(v: unknown): number {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function normalizeServiceItem(item: any): ServiceItem {
  return {
    ...item,
    id: String(item.id),
    basePrice: parseNumber(item.basePrice),
    specialPrice: item.specialPrice != null ? parseNumber(item.specialPrice) : undefined,
    isActive: Boolean(item.isActive),
  }
}

function normalizeOrderItem(item: any): OrderItem {
  return {
    ...item,
    serviceId: String(item.serviceId),
    quantity: parseNumber(item.quantity),
    unitPrice: parseNumber(item.unitPrice),
    subtotal: parseNumber(item.subtotal),
  }
}

function normalizeOrder(order: any): Order {
  return {
    ...order,
    id: String(order.id),
    totalPrice: parseNumber(order.totalPrice),
    items: (order.items || []).map(normalizeOrderItem),
    statusHistory: order.statusHistory || [],
    availableActions: order.availableActions || [],
  }
}

function normalizeNotification(n: any): AppNotification {
  return {
    ...n,
    id: String(n.id),
    orderId: n.orderId != null ? String(n.orderId) : undefined,
    isRead: Boolean(n.isRead),
  }
}

export async function fetchServices(): Promise<ServiceItem[]> {
  const data = await request<any[]>('/services')
  return data.map(normalizeServiceItem)
}

export async function createService(data: Omit<ServiceItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceItem> {
  const result = await request<any>('/services', { method: 'POST', body: JSON.stringify(data) })
  return normalizeServiceItem(result)
}

export async function updateService(id: string, data: Partial<ServiceItem>): Promise<ServiceItem> {
  const result = await request<any>(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  return normalizeServiceItem(result)
}

export async function deleteService(id: string): Promise<void> {
  await request<void>(`/services/${id}`, { method: 'DELETE' })
}

export async function fetchOrders(status?: OrderStatus): Promise<Order[]> {
  const query = status ? `?status=${status}` : ''
  const data = await request<any[]>(`/orders${query}`)
  return data.map(normalizeOrder)
}

export async function fetchOrder(id: string): Promise<Order> {
  const data = await request<any>(`/orders/${id}`)
  return normalizeOrder(data)
}

export async function createOrder(data: {
  customerName: string
  customerPhone: string
  customerAddress?: string
  items: OrderItem[]
  pickupMethod: string
  remark?: string
}): Promise<Order> {
  const result = await request<any>('/orders', { method: 'POST', body: JSON.stringify(data) })
  return normalizeOrder(result)
}

export async function performAction(id: string, action: PerformActionRequest): Promise<Order> {
  const result = await request<any>(`/orders/${id}/actions`, { method: 'POST', body: JSON.stringify(action) })
  return normalizeOrder(result)
}

export async function updateOrderStatus(id: string, status: OrderStatus, operator?: string): Promise<Order> {
  const result = await request<any>(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, operator }) })
  return normalizeOrder(result)
}

export async function cancelOrder(id: string): Promise<Order> {
  const result = await request<any>(`/orders/${id}/cancel`, { method: 'PUT' })
  return normalizeOrder(result)
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const data = await request<any[]>('/notifications')
  return data.map(normalizeNotification)
}

export async function markNotificationRead(id: string): Promise<void> {
  await request<void>(`/notifications/${id}/read`, { method: 'PUT' })
}

export async function fetchUnreadCount(): Promise<number> {
  const result = await request<{ count: number }>('/notifications/unread-count')
  return parseNumber(result.count)
}

export async function calculatePricing(items: { serviceId: string; quantity: number }[]): Promise<{ total: number; items: OrderItem[] }> {
  const result = await request<any>('/pricing/calculate', { method: 'POST', body: JSON.stringify({ items }) })
  return {
    total: parseNumber(result.total),
    items: (result.items || []).map(normalizeOrderItem),
  }
}
