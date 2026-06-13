import { Check, Gift, Sparkles, Package } from 'lucide-react'
import type { ProductPackage } from '../../shared/types'
import { cn } from '@/lib/utils'

interface Props {
  packages: ProductPackage[]
  selected: Record<string, number>
  onChange: (packageId: string, quantity: number) => void
}

export default function PackageSelector({ packages, selected, onChange }: Props) {
  const activePackages = packages.filter(p => p.isActive)

  const freePackages = activePackages.filter(p => p.category === 'free')
  const paidPackages = activePackages.filter(p => p.category === 'paid')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-navy-700 mb-1 flex items-center gap-2">
          <Gift size={18} className="text-emerald-500" />
          免费套餐
        </h3>
        <p className="text-xs text-navy-400 mb-3">随服务免费提供，可根据需要选择</p>
        {freePackages.length === 0 ? (
          <p className="text-sm text-navy-400 py-2">暂无免费套餐</p>
        ) : (
          <div className="space-y-3">
            {freePackages.map(pkg => {
              const isSelected = (selected[pkg.id] || 0) > 0
              return (
                <button
                  key={pkg.id}
                  onClick={() => onChange(pkg.id, isSelected ? 0 : 1)}
                  className={cn(
                    'w-full border-2 rounded-lg p-4 text-left transition-all',
                    isSelected
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-navy-100 bg-white hover:border-navy-200',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                      isSelected ? 'bg-emerald-400 text-white' : 'bg-navy-50 text-navy-300',
                    )}>
                      {isSelected ? <Check size={18} strokeWidth={3} /> : <Package size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-navy-800 truncate">{pkg.name}</p>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 shrink-0">
                          免费
                        </span>
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-navy-400 mb-2">{pkg.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.items.map((item, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded text-xs bg-navy-50 text-navy-500">
                            {item.productName} × {item.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-medium text-navy-700 mb-1 flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" />
          升级套餐
        </h3>
        <p className="text-xs text-navy-400 mb-3">付费升级套餐，享受更专业的洗护体验</p>
        {paidPackages.length === 0 ? (
          <p className="text-sm text-navy-400 py-2">暂无升级套餐</p>
        ) : (
          <div className="space-y-3">
            {paidPackages.map(pkg => {
              const qty = selected[pkg.id] || 0
              const savings = pkg.originalPrice - pkg.packagePrice
              return (
                <div
                  key={pkg.id}
                  className={cn(
                    'border-2 rounded-lg p-4 transition-all',
                    qty > 0 ? 'border-amber-400 bg-amber-50' : 'border-navy-100 bg-white',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-medium text-navy-800 truncate">{pkg.name}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-amber-600">¥{pkg.packagePrice.toFixed(2)}</span>
                          {pkg.originalPrice > pkg.packagePrice && (
                            <span className="text-xs text-navy-300 line-through">¥{pkg.originalPrice.toFixed(2)}</span>
                          )}
                          {savings > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600">
                              省¥{savings.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-navy-400 mb-2">{pkg.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.items.map((item, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded text-xs bg-navy-50 text-navy-500">
                            {item.productName} × {item.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {qty === 0 ? (
                        <button
                          onClick={() => onChange(pkg.id, 1)}
                          className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 transition-colors"
                        >
                          选择
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => onChange(pkg.id, Math.max(0, qty - 1))}
                            className="w-7 h-7 rounded-md border border-navy-200 flex items-center justify-center hover:bg-navy-50 text-navy-500"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{qty}</span>
                          <button
                            onClick={() => onChange(pkg.id, qty + 1)}
                            className="w-7 h-7 rounded-md bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600"
                          >
                            +
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {activePackages.length === 0 && (
        <p className="text-center text-navy-400 text-sm py-8">暂无可用套餐</p>
      )}
    </div>
  )
}
