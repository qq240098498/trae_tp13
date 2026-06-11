import type { OrderStatus, PickupMethod, AvailableAction, ActionCategory } from './types'

export { }

export const statusLabels: Record<OrderStatus, string> = {
  pending: '待处理',
  accepted: '已接单',
  washing: '洗涤中',
  inspecting: '质检中',
  completed: '已完成',
  picked_up: '已取衣',
  cancelled: '已取消',
}

export const actionCategoryLabels: Record<ActionCategory, string> = {
  status_primary: '状态流转',
  status_rollback: '状态回退',
  business: '业务操作',
  note: '备注记录',
}
