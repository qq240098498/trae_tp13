export type OrderStatus = 'pending' | 'accepted' | 'washing' | 'inspecting' | 'completed' | 'picked_up' | 'cancelled'

export type PickupMethod = 'self' | 'delivery'

export interface ServiceItem {
  id: string
  name: string
  category: string
  unit: string
  basePrice: number
  specialPrice?: number
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  serviceId: string
  serviceName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface StatusChange {
  status: OrderStatus
  timestamp: string
  operator?: string
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerAddress?: string
  items: OrderItem[]
  totalPrice: number
  status: OrderStatus
  pickupMethod: PickupMethod
  remark?: string
  statusHistory: StatusChange[]
  createdAt: string
  updatedAt: string
}

export interface AppNotification {
  id: string
  type: 'order' | 'system' | 'reminder'
  title: string
  message: string
  isRead: boolean
  orderId?: string
  createdAt: string
}
