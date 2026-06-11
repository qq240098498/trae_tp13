import type { OrderItem } from '../../shared/types'
import { User, Truck } from 'lucide-react'

interface Props {
  name: string
  phone: string
  address: string
  remark: string
  pickupMethod: string
  items: OrderItem[]
  total: number
}

export default function OrderConfirm({ name, phone, address, remark, pickupMethod, items, total }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-navy-100 rounded-lg p-4">
        <h3 className="font-medium text-navy-700 mb-3">客户信息</h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-navy-400">姓名</span><span className="text-navy-800">{name}</span>
          <span className="text-navy-400">电话</span><span className="text-navy-800">{phone}</span>
          {pickupMethod === 'delivery' && (
            <><span className="text-navy-400">地址</span><span className="text-navy-800">{address}</span></>
          )}
          {remark && <><span className="text-navy-400">备注</span><span className="text-navy-800">{remark}</span></>}
        </div>
        <div className="flex items-center gap-2 mt-3 text-sm text-navy-500">
          {pickupMethod === 'self' ? <User size={16} strokeWidth={2} /> : <Truck size={16} strokeWidth={2} />}
          <span>{pickupMethod === 'self' ? '自送' : '上门取送'}</span>
        </div>
      </div>

      <div className="bg-white border border-navy-100 rounded-lg p-4">
        <h3 className="font-medium text-navy-700 mb-3">服务项目</h3>
        <table className="w-full text-sm">
          <thead className="bg-navy-50">
            <tr>
              <th className="text-left px-3 py-2 text-navy-600 font-medium">服务</th>
              <th className="text-center px-3 py-2 text-navy-600 font-medium">数量</th>
              <th className="text-right px-3 py-2 text-navy-600 font-medium">小计</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.serviceId} className="border-t border-navy-50">
                <td className="px-3 py-2">{item.serviceName}</td>
                <td className="text-center px-3 py-2">{item.quantity}</td>
                <td className="text-right px-3 py-2 font-medium">¥{item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-navy-100 mt-2 pt-3 flex justify-end">
          <span className="font-semibold text-navy-800">合计: ¥{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
