import type { OrderStatus } from '../../shared/types'
import { cn } from '@/lib/utils'

const statusLabels: Record<OrderStatus, string> = {
  pending: '待处理',
  accepted: '已接单',
  washing: '洗涤中',
  inspecting: '质检中',
  completed: '已完成',
  picked_up: '已取衣',
  cancelled: '已取消',
}

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  washing: 'bg-purple-100 text-purple-700',
  inspecting: 'bg-orange-100 text-orange-700',
  completed: 'bg-mint-50 text-mint-600',
  picked_up: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

export { statusLabels, statusColors }

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', statusColors[status])}>
      {statusLabels[status]}
    </span>
  )
}
