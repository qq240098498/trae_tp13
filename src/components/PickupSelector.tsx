import type { ServiceItem, OrderItem } from '../../shared/types'
import { cn } from '@/lib/utils'
import { Truck, User } from 'lucide-react'

interface Props {
  services: ServiceItem[]
  selectedItems: Record<string, number>
  pickupMethod: string
  onPickupChange: (method: string) => void
  pricingItems: OrderItem[]
  total: number
}

export default function PickupSelector({
  services, selectedItems, pickupMethod, onPickupChange, pricingItems, total,
}: Props) {
  const hasItems = Object.values(selectedItems).some(q => q > 0)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-navy-700 mb-3">价格明细</h3>
        {!hasItems ? (
          <p className="text-sm text-navy-400">请先选择服务项目</p>
        ) : (
          <div className="bg-white border border-navy-100 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-navy-50">
                <tr>
                  <th className="text-left px-4 py-2 text-navy-600 font-medium">服务</th>
                  <th className="text-center px-4 py-2 text-navy-600 font-medium">数量</th>
                  <th className="text-right px-4 py-2 text-navy-600 font-medium">单价</th>
                  <th className="text-right px-4 py-2 text-navy-600 font-medium">小计</th>
                </tr>
              </thead>
              <tbody>
                {pricingItems.map(item => (
                  <tr key={item.serviceId} className="border-t border-navy-50">
                    <td className="px-4 py-2">{item.serviceName}</td>
                    <td className="text-center px-4 py-2">{item.quantity}</td>
                    <td className="text-right px-4 py-2">¥{item.unitPrice.toFixed(2)}</td>
                    <td className="text-right px-4 py-2 font-medium">¥{item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-navy-100 px-4 py-3 flex justify-end bg-navy-50">
              <span className="font-semibold text-navy-800">合计: ¥{total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-medium text-navy-700 mb-3">取送方式</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: 'self', label: '自送', desc: '客户自行送取', icon: User },
            { value: 'delivery', label: '上门取送', desc: '提供上门取送服务', icon: Truck },
          ].map(({ value, label, desc, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onPickupChange(value)}
              className={cn(
                'border-2 rounded-lg p-4 flex flex-col items-center gap-2 transition-colors',
                pickupMethod === value ? 'border-mint-400 bg-mint-50' : 'border-navy-100 bg-white hover:border-navy-200',
              )}
            >
              <Icon size={24} strokeWidth={2} className={pickupMethod === value ? 'text-mint-600' : 'text-navy-400'} />
              <span className="font-medium text-sm">{label}</span>
              <span className="text-xs text-navy-400">{desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
