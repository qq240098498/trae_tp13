export type OrderStatus = 'pending' | 'accepted' | 'washing' | 'inspecting' | 'completed' | 'picked_up' | 'cancelled' | 'damaged' | 'compensating' | 'compensated'

export type PickupMethod = 'self' | 'delivery'

export type ActionCategory = 'status_primary' | 'status_rollback' | 'business' | 'note' | 'compensation'

export type DamageType =
  | 'tear'
  | 'stain'
  | 'discoloration'
  | 'shrinkage'
  | 'deformation'
  | 'missing'
  | 'accessory_damage'
  | 'other'

export type DamageSeverity = 'minor' | 'moderate' | 'severe'

export type ResponsibilityParty = 'store' | 'customer' | 'both' | 'unknown' | 'third_party'

export type CompensationStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'closed'

export type CompensationMethod = 'refund' | 'cash' | 'transfer' | 'service_voucher'

export interface DamageReport {
  id: string
  orderId: string
  orderItemId?: string
  damageType: DamageType
  severity: DamageSeverity
  responsibilityParty: ResponsibilityParty
  description: string
  originalValue?: number
  purchaseDate?: string
  reportedBy: string
  reportedAt: string
  photos?: string[]
  remark?: string
  isResolved?: boolean
  resolvedAt?: string
  resolutionType?: 'compensation' | 'repair' | 'waive' | 'negotiated_no_comp' | 'closed_no_responsibility'
  resolutionRemark?: string
}

export interface CompensationStandard {
  severity: DamageSeverity
  minRate: number
  maxRate: number
  description: string
}

export interface CompensationRecord {
  id: string
  orderId: string
  damageReportId: string
  status: CompensationStatus
  amount: number
  compensationMethod: CompensationMethod
  standardRate: number
  appliedValue: number
  reviewer?: string
  reviewedAt?: string
  reviewRemark?: string
  payer?: string
  paidAt?: string
  paidProof?: string
  applicant: string
  appliedAt: string
  remark?: string
}

export interface CompensationRule {
  damageType: DamageType
  standards: CompensationStandard[]
  maxCompensationAmount?: number
  depreciationRatePerYear?: number
  requirePurchaseProof?: boolean
}

export type ProductCategory = 'free' | 'paid'

export interface LaundryProduct {
  id: string
  name: string
  category: ProductCategory
  price: number
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface OrderProduct {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface PackageItem {
  productId: string
  productName: string
  quantity: number
}

export interface ProductPackage {
  id: string
  name: string
  description?: string
  category: 'free' | 'paid'
  packagePrice: number
  originalPrice: number
  items: PackageItem[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface OrderPackage {
  packageId: string
  packageName: string
  quantity: number
  unitPrice: number
  subtotal: number
  items: PackageItem[]
}

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
  buttonStyle: 'primary' | 'secondary' | 'warning' | 'danger' | 'outline' | 'success'
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
  products: OrderProduct[]
  packages: OrderPackage[]
  totalPrice: number
  serviceTotal: number
  productTotal: number
  packageTotal: number
  status: OrderStatus
  pickupMethod: PickupMethod
  remark?: string
  statusHistory: StatusChange[]
  availableActions: AvailableAction[]
  damageReports?: DamageReport[]
  compensationRecords?: CompensationRecord[]
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
