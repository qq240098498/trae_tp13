export type OrderStatus = 'pending' | 'accepted' | 'washing' | 'inspecting' | 'completed' | 'picked_up' | 'cancelled'

export type PickupMethod = 'self' | 'delivery'

export type ActionCategory = 'status_primary' | 'status_rollback' | 'business' | 'note'

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
  id: string
  status: OrderStatus
  timestamp: string
  operator?: string
  actionCategory: ActionCategory
  actionCode: string
  actionName: string
  remark?: string
  metadata?: Record<string, any>
  fromStatus?: OrderStatus
}

export interface AvailableAction {
  code: string
  name: string
  description: string
  category: ActionCategory
  buttonStyle: 'primary' | 'secondary' | 'warning' | 'danger' | 'outline'
  icon?: string
  requiresRemark?: boolean
  requiresMetadata?: string[]
  targetStatus?: OrderStatus
}

export interface PerformActionRequest {
  code: string
  operator?: string
  remark?: string
  metadata?: Record<string, any>
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
  availableActions: AvailableAction[]
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
