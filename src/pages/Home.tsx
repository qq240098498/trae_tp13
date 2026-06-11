import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, ListOrdered, Tag, Droplets, Wind, Flame, Sparkles, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '../../shared/types'

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

const categories = [
  { label: '水洗', icon: Droplets, color: 'bg-blue-50 text-blue-600' },
  { label: '干洗', icon: Wind, color: 'bg-purple-50 text-purple-600' },
  { label: '熨烫', icon: Flame, color: 'bg-orange-50 text-orange-600' },
  { label: '特殊护理', icon: Sparkles, color: 'bg-mint-50 text-mint-600' },
]

const quickActions = [
  { label: '新建订单', icon: PlusCircle, path: '/order/new', color: 'bg-mint-400 text-white' },
  { label: '查看订单', icon: ListOrdered, path: '/orders', color: 'bg-navy-800 text-white' },
  { label: '价格管理', icon: Tag, path: '/pricing', color: 'bg-navy-600 text-white' },
]

export default function Home() {
  const { orders, fetchOrders, services, fetchServices } = useAppStore()

  useEffect(() => {
    fetchOrders()
    fetchServices()
  }, [fetchOrders, fetchServices])

  const recentOrders = orders.slice(0, 5)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="rounded-xl bg-gradient-to-r from-navy-800 to-navy-900 p-8 text-white">
        <h1 className="font-serif text-2xl font-semibold mb-2">欢迎回来 👋</h1>
        <p className="text-navy-200 text-sm">洗衣店订单管理系统，高效管理每一笔订单</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map(({ label, icon: Icon, path, color }) => (
          <Link
            key={path}
            to={path}
            className={cn('flex items-center gap-3 rounded-lg p-4 transition-shadow hover:shadow-md', color)}
          >
            <Icon size={22} strokeWidth={2} />
            <span className="font-medium text-sm">{label}</span>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="font-serif font-semibold text-lg mb-3">最近订单</h2>
        {recentOrders.length === 0 ? (
          <div className="bg-white rounded-lg border border-navy-100 p-6 text-center text-navy-400 text-sm">
            暂无订单
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-navy-100 divide-y divide-navy-100">
            {recentOrders.map(order => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-navy-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-navy-800">{order.orderNumber}</span>
                  <span className="text-sm text-navy-500">{order.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColors[order.status])}>
                    {statusLabels[order.status]}
                  </span>
                  <span className="text-sm font-medium text-navy-700">¥{order.totalPrice.toFixed(2)}</span>
                  <ChevronRight size={16} className="text-navy-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-serif font-semibold text-lg mb-3">服务分类</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.map(({ label, icon: Icon, color }) => {
            const count = services.filter(s => s.category === label && s.isActive).length
            return (
              <div key={label} className={cn('rounded-lg p-4 flex flex-col items-center gap-2', color)}>
                <Icon size={28} strokeWidth={2} />
                <span className="font-medium text-sm">{label}</span>
                <span className="text-xs opacity-70">{count} 项服务</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
