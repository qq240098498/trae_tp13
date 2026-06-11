import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'
import type { OrderStatus } from '../../shared/types'

const tabs: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'accepted', label: '已接单' },
  { value: 'washing', label: '洗涤中' },
  { value: 'inspecting', label: '质检中' },
  { value: 'completed', label: '已完成' },
  { value: 'picked_up', label: '已取衣' },
  { value: 'cancelled', label: '已取消' },
]

export default function OrderList() {
  const { orders, fetchOrders } = useAppStore()
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all')

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const filtered = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab)

  const pickupLabel = (m: string) => m === 'self' ? '自送' : '上门取送'

  return (
    <div className="max-w-4xl">
      <h1 className="font-serif text-xl font-semibold mb-4">订单列表</h1>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              activeTab === tab.value ? 'bg-navy-800 text-white' : 'bg-white text-navy-500 border border-navy-100 hover:bg-navy-50',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-navy-100 p-10 text-center text-navy-400 text-sm">
          暂无订单
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block bg-white rounded-lg border border-navy-100 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-navy-800">{order.orderNumber}</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-navy-500">
                  <span>{order.customerName}</span>
                  <span>{pickupLabel(order.pickupMethod)}</span>
                  <span className="text-navy-300">{new Date(order.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy-800">¥{order.totalPrice.toFixed(2)}</span>
                  <ChevronRight size={16} className="text-navy-300" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
