import type { ServiceItem, Order, OrderStatus, AppNotification, OrderItem, PerformActionRequest, LaundryProduct, OrderProduct, ProductPackage, OrderPackage, PackageItem } from '../../shared/types'

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

function normalizeOrderProduct(item: any): OrderProduct {
  return {
    ...item,
    productId: String(item.productId),
    quantity: parseNumber(item.quantity),
    unitPrice: parseNumber(item.unitPrice),
    subtotal: parseNumber(item.subtotal),
  }
}

function normalizeLaundryProduct(item: any): LaundryProduct {
  return {
    ...item,
    id: String(item.id),
    price: parseNumber(item.price),
    isActive: Boolean(item.isActive),
  }
}

function normalizePackageItem(item: any): PackageItem {
  return {
    productId: String(item.productId),
    productName: String(item.productName),
    quantity: parseNumber(item.quantity),
  }
}

function normalizeProductPackage(item: any): ProductPackage {
  return {
    ...item,
    id: String(item.id),
    packagePrice: parseNumber(item.packagePrice),
    originalPrice: parseNumber(item.originalPrice),
    isActive: Boolean(item.isActive),
    items: (item.items || []).map(normalizePackageItem),
  }
}

function normalizeOrderPackage(item: any): OrderPackage {
  return {
    ...item,
    packageId: String(item.packageId),
    quantity: parseNumber(item.quantity),
    unitPrice: parseNumber(item.unitPrice),
    subtotal: parseNumber(item.subtotal),
    items: (item.items || []).map(normalizePackageItem),
  }
}

function normalizeOrder(order: any): Order {
  return {
    ...order,
    id: String(order.id),
    totalPrice: parseNumber(order.totalPrice),
    serviceTotal: parseNumber(order.serviceTotal),
    productTotal: parseNumber(order.productTotal),
    packageTotal: parseNumber(order.packageTotal),
    items: (order.items || []).map(normalizeOrderItem),
    products: (order.products || []).map(normalizeOrderProduct),
    packages: (order.packages || []).map(normalizeOrderPackage),
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
  products?: OrderProduct[]
  packages?: OrderPackage[]
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

export async function calculatePricing(items: { serviceId: string; quantity: number }[]): Promise<{ total: number; items: OrderItem[]; products: OrderProduct[] }> {
  const result = await request<any>('/pricing/calculate', { method: 'POST', body: JSON.stringify({ items }) })
  return {
    total: parseNumber(result.total),
    items: (result.items || []).map(normalizeOrderItem),
    products: (result.products || []).map(normalizeOrderProduct),
  }
}

export async function calculatePricingWithProducts(items: { serviceId: string; quantity: number }[], products: { productId: string; quantity: number }[], packages?: { packageId: string; quantity: number }[]): Promise<{ total: number; items: OrderItem[]; products: OrderProduct[]; packages: OrderPackage[] }> {
  const result = await request<any>('/pricing/calculate', { method: 'POST', body: JSON.stringify({ items, products, packages }) })
  return {
    total: parseNumber(result.total),
    items: (result.items || []).map(normalizeOrderItem),
    products: (result.products || []).map(normalizeOrderProduct),
    packages: (result.packages || []).map(normalizeOrderPackage),
  }
}

export async function fetchProducts(): Promise<LaundryProduct[]> {
  const data = await request<any[]>('/services/products')
  return data.map(normalizeLaundryProduct)
}

export async function createProduct(data: Omit<LaundryProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<LaundryProduct> {
  const result = await request<any>('/services/products', { method: 'POST', body: JSON.stringify(data) })
  return normalizeLaundryProduct(result)
}

export async function updateProduct(id: string, data: Partial<LaundryProduct>): Promise<LaundryProduct> {
  const result = await request<any>(`/services/products/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  return normalizeLaundryProduct(result)
}

export async function deleteProduct(id: string): Promise<void> {
  await request<void>(`/services/products/${id}`, { method: 'DELETE' })
}

export async function fetchPackages(): Promise<ProductPackage[]> {
  const data = await request<any[]>('/services/packages')
  return data.map(normalizeProductPackage)
}

export async function createPackage(data: Omit<ProductPackage, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductPackage> {
  const result = await request<any>('/services/packages', { method: 'POST', body: JSON.stringify(data) })
  return normalizeProductPackage(result)
}

export async function updatePackage(id: string, data: Partial<ProductPackage>): Promise<ProductPackage> {
  const result = await request<any>(`/services/packages/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  return normalizeProductPackage(result)
}

export async function deletePackage(id: string): Promise<void> {
  await request<void>(`/services/packages/${id}`, { method: 'DELETE' })
}
