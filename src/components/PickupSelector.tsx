import type { ServiceItem, OrderItem, OrderProduct, OrderPackage } from '../../shared/types'
import { cn } from '@/lib/utils'
import { Truck, User, Package, Gift } from 'lucide-react'

interface Props {
  services: ServiceItem[]
  selectedItems: Record<string, number>
  pickupMethod: string
  onPickupChange: (method: string) => void
  pricingItems: OrderItem[]
  products: OrderProduct[]
  packages?: OrderPackage[]
  total: number
}

export default function PickupSelector({
  services, selectedItems, pickupMethod, onPickupChange, pricingItems, products, packages, total,
}: Props) {
  const hasItems = Object.values(selectedItems).some(q => q > 0)
  const hasProducts = products.length > 0
  const hasPackages = packages && packages.length > 0
  const serviceTotal = pricingItems.reduce((sum, i) => sum + i.subtotal, 0)
  const productTotal = products.reduce((sum, p) => sum + p.subtotal, 0)
  const packageTotal = (packages || []).reduce((sum, p) => sum + p.subtotal, 0)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-navy-700 mb-3">价格明细</h3>
        {!hasItems && !hasProducts && !hasPackages ? (
          <p className="text-sm text-navy-400">请先选择服务项目</p>
        ) : (
          <div className="bg-white border border-navy-100 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-navy-50">
                <tr>
                  <th className="text-left px-4 py-2 text-navy-600 font-medium">项目</th>
                  <th className="text-center px-4 py-2 text-navy-600 font-medium">数量</th>
                  <th className="text-right px-4 py-2 text-navy-600 font-medium">单价</th>
                  <th className="text-right px-4 py-2 text-navy-600 font-medium">小计</th>
                </tr>
              </thead>
              <tbody>
                {pricingItems.map(item => (
                  <tr key={`svc-${item.serviceId}`} className="border-t border-navy-50">
                    <td className="px-4 py-2">{item.serviceName}</td>
                    <td className="text-center px-4 py-2">{item.quantity}</td>
                    <td className="text-right px-4 py-2">¥{item.unitPrice.toFixed(2)}</td>
                    <td className="text-right px-4 py-2 font-medium">¥{item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
                {hasPackages && packages!.map(pkg => (
                  <tr key={`pkg-${pkg.packageId}`} className="border-t border-navy-50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <Package size={14} className="text-amber-500 shrink-0" />
                        <span>{pkg.packageName}</span>
                        {pkg.unitPrice === 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">免费</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pkg.items.map((item, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-navy-50 text-navy-400">
                            {item.productName}×{item.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-center px-4 py-2">{pkg.quantity}</td>
                    <td className="text-right px-4 py-2">¥{pkg.unitPrice.toFixed(2)}</td>
                    <td className="text-right px-4 py-2 font-medium">¥{pkg.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
                {hasProducts && products.map(product => (
                  <tr key={`prod-${product.productId}`} className="border-t border-navy-50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <Gift size={14} className="text-emerald-500 shrink-0" />
                        <span>{product.productName}</span>
                        {product.unitPrice === 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">免费</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center px-4 py-2">{product.quantity}</td>
                    <td className="text-right px-4 py-2">¥{product.unitPrice.toFixed(2)}</td>
                    <td className="text-right px-4 py-2 font-medium">¥{product.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-navy-100 px-4 py-3 bg-navy-50 space-y-1">
              {(serviceTotal > 0 || productTotal > 0 || packageTotal > 0) && (
                <div className="flex justify-end text-xs text-navy-400 space-x-4">
                  {serviceTotal > 0 && <span>服务 ¥{serviceTotal.toFixed(2)}</span>}
                  {packageTotal > 0 && <span>套餐 ¥{packageTotal.toFixed(2)}</span>}
                  {productTotal > 0 && <span>产品 ¥{productTotal.toFixed(2)}</span>}
                </div>
              )}
              <div className="flex justify-end">
                <span className="font-semibold text-navy-800">合计: ¥{total.toFixed(2)}</span>
              </div>
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
