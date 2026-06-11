import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, MapPin, Clock, CheckCircle2, Circle, XCircle, User, Truck } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import StatusBadge, { statusLabels } from '@/components/StatusBadge'
import type { OrderStatus } from '../../shared/types'

const nextActions: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  pending: { status: 'accepted', label: '接单' },
  accepted: { status: 'washing', label: '开始洗涤' },
  washing: { status: 'inspecting', label: '质检' },
  inspecting: { status: 'completed', label: '完成' },
  completed: { status: 'picked_up', label: '确认取衣' },
}

const timelineOrder: OrderStatus[] = ['pending', 'accepted', 'washing', 'inspecting', 'completed', 'picked_up']

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentOrder, fetchOrderDetail, updateStatus, cancelOrder } = useAppStore()

  useEffect(() => {
    if (id) fetchOrderDetail(id)
  }, [id, fetchOrderDetail])

  if (!currentOrder) {
    return <div className="text-center py-10 text-navy-400">加载中...</div>
  }

  const order = currentOrder
  const action = nextActions[order.status]
  const canCancel = order.status === 'pending'

  const currentIdx = timelineOrder.indexOf(order.status)
  const isCancelled = order.status === 'cancelled'

  const handleAction = async () => {
    if (!action || !id) return
    await updateStatus(id, action.status)
  }

  const handleCancel = async () => {
    if (!id || !confirm('确认取消此订单？')) return
    await cancelOrder(id)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-navy-500 hover:text-navy-700 text-sm mb-4 transition-colors">
        <ArrowLeft size={16} strokeWidth={2} /> 返回
      </button>

      <div className="bg-white rounded-xl border border-navy-100 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-serif text-lg font-semibold">{order.orderNumber}</h1>
          <StatusBadge status={order.status} />
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="flex items-center gap-2 text-navy-500"><User size={14} strokeWidth={2} />{order.customerName}</div>
          <div className="flex items-center gap-2 text-navy-500"><Phone size={14} strokeWidth={2} />{order.customerPhone}</div>
          {order.customerAddress && (
            <div className="flex items-center gap-2 text-navy-500 col-span-2"><MapPin size={14} strokeWidth={2} />{order.customerAddress}</div>
          )}
          <div className="flex items-center gap-2 text-navy-500">
            {order.pickupMethod === 'self' ? <User size={14} strokeWidth={2} /> : <Truck size={14} strokeWidth={2} />}
            {order.pickupMethod === 'self' ? '自送' : '上门取送'}
          </div>
          <div className="flex items-center gap-2 text-navy-500"><Clock size={14} strokeWidth={2} />{new Date(order.createdAt).toLocaleString('zh-CN')}</div>
        </div>
        {order.remark && <div className="mt-3 text-sm text-navy-500 bg-navy-50 rounded-lg px-3 py-2">备注: {order.remark}</div>}
      </div>

      <div className="bg-white rounded-xl border border-navy-100 p-6 mb-4">
        <h2 className="font-medium text-navy-700 mb-4">订单进度</h2>
        <div className="space-y-0">
          {timelineOrder.map((status, idx) => {
            const historyEntry = order.statusHistory.find(h => h.status === status)
            const reached = isCancelled ? (idx <= currentIdx && currentIdx >= 0) : idx <= currentIdx
            return (
              <div key={status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {reached ? (
                    <CheckCircle2 size={18} className="text-mint-400" />
                  ) : (
                    <Circle size={18} className="text-navy-200" />
                  )}
                  {idx < timelineOrder.length - 1 && <div className={cn('w-0.5 h-8', reached && idx < currentIdx ? 'bg-mint-400' : 'bg-navy-100')} />}
                </div>
                <div className="pb-4">
                  <p className={cn('text-sm font-medium', reached ? 'text-navy-800' : 'text-navy-300')}>{statusLabels[status]}</p>
                  {historyEntry && (
                    <p className="text-xs text-navy-400">{new Date(historyEntry.timestamp).toLocaleString('zh-CN')}</p>
                  )}
                </div>
              </div>
            )
          })}
          {isCancelled && (
            <div className="flex gap-3">
              <XCircle size={18} className="text-red-500" />
              <p className="text-sm font-medium text-red-600">已取消</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 p-6 mb-4">
        <h2 className="font-medium text-navy-700 mb-3">服务项目</h2>
        <table className="w-full text-sm">
          <thead className="bg-navy-50">
            <tr>
              <th className="text-left px-3 py-2 text-navy-600 font-medium">服务</th>
              <th className="text-center px-3 py-2 text-navy-600 font-medium">数量</th>
              <th className="text-right px-3 py-2 text-navy-600 font-medium">单价</th>
              <th className="text-right px-3 py-2 text-navy-600 font-medium">小计</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => (
              <tr key={item.serviceId} className="border-t border-navy-50">
                <td className="px-3 py-2">{item.serviceName}</td>
                <td className="text-center px-3 py-2">{item.quantity}</td>
                <td className="text-right px-3 py-2">¥{item.unitPrice.toFixed(2)}</td>
                <td className="text-right px-3 py-2 font-medium">¥{item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-navy-100 mt-2 pt-3 flex justify-end">
          <span className="text-lg font-semibold text-navy-800">¥{order.totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {(action || canCancel) && (
        <div className="flex gap-3">
          {canCancel && (
            <button onClick={handleCancel} className="px-5 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors">
              取消订单
            </button>
          )}
          {action && (
            <button onClick={handleAction} className="px-5 py-2.5 rounded-lg bg-mint-400 text-navy-900 hover:bg-mint-500 text-sm font-medium transition-colors">
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
