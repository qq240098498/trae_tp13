import type { OrderItem, OrderProduct, OrderPackage } from '../../shared/types'
import { User, Truck, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  name: string
  phone: string
  address: string
  remark: string
  pickupMethod: string
  items: OrderItem[]
  products?: OrderProduct[]
  packages?: OrderPackage[]
  total: number
}

export default function OrderConfirm({ name, phone, address, remark, pickupMethod, items, products, packages, total }: Props) {
  const hasProducts = products && products.length > 0
  const hasPackages = packages && packages.length > 0

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
      </div>

      {hasPackages && (
        <div className="bg-white border border-navy-100 rounded-lg p-4">
          <h3 className="font-medium text-navy-700 mb-3 flex items-center gap-2">
            <Package size={16} className="text-amber-500" />
            洗护套餐
          </h3>
          <div className="space-y-3">
            {packages!.map(pkg => (
              <div key={pkg.packageId} className="border border-navy-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-navy-800">{pkg.packageName}</span>
                    {pkg.unitPrice === 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                        免费
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-navy-500">× {pkg.quantity}</span>
                    <span className="text-sm font-medium text-navy-800">¥{pkg.subtotal.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pkg.items.map((item, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-xs bg-navy-50 text-navy-500">
                      {item.productName} × {item.quantity}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasProducts && (
        <div className="bg-white border border-navy-100 rounded-lg p-4">
          <h3 className="font-medium text-navy-700 mb-3">洗衣产品</h3>
          <table className="w-full text-sm">
            <thead className="bg-navy-50">
              <tr>
                <th className="text-left px-3 py-2 text-navy-600 font-medium">产品</th>
                <th className="text-center px-3 py-2 text-navy-600 font-medium">数量</th>
                <th className="text-right px-3 py-2 text-navy-600 font-medium">小计</th>
              </tr>
            </thead>
            <tbody>
              {products!.map(product => (
                <tr key={product.productId} className="border-t border-navy-50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span>{product.productName}</span>
                      {product.unitPrice === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                          免费
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center px-3 py-2">{product.quantity}</td>
                  <td className="text-right px-3 py-2 font-medium">¥{product.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white border border-navy-100 rounded-lg p-4">
        <div className="flex justify-end items-center">
          <span className="text-sm text-navy-500 mr-3">总计金额</span>
          <span className="text-xl font-bold text-navy-800">¥{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
