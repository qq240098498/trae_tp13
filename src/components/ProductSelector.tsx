import { Check, Gift, Sparkles } from 'lucide-react'
import type { LaundryProduct } from '../../shared/types'
import { cn } from '@/lib/utils'

interface Props {
  products: LaundryProduct[]
  selected: Record<string, number>
  onChange: (productId: string, quantity: number) => void
}

export default function ProductSelector({ products, selected, onChange }: Props) {
  const activeProducts = products.filter(p => p.isActive)

  const freeProducts = activeProducts.filter(p => p.category === 'free')
  const paidProducts = activeProducts.filter(p => p.category === 'paid')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-navy-700 mb-1 flex items-center gap-2">
          <Gift size={18} className="text-emerald-500" />
          免费产品
        </h3>
        <p className="text-xs text-navy-400 mb-3">随服务免费提供，可根据需要选择</p>
        {freeProducts.length === 0 ? (
          <p className="text-sm text-navy-400 py-2">暂无免费产品</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {freeProducts.map(product => {
              const isSelected = (selected[product.id] || 0) > 0
              return (
                <button
                  key={product.id}
                  onClick={() => onChange(product.id, isSelected ? 0 : 1)}
                  className={cn(
                    'border-2 rounded-lg p-3 flex items-center gap-3 text-left transition-all',
                    isSelected
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-navy-100 bg-white hover:border-navy-200',
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    isSelected ? 'bg-emerald-400 text-white' : 'bg-navy-50 text-navy-300',
                  )}>
                    {isSelected ? <Check size={16} strokeWidth={3} /> : <Gift size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy-800 truncate">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-navy-400 truncate">{product.description}</p>
                    )}
                  </div>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium shrink-0',
                    'bg-emerald-100 text-emerald-700',
                  )}>
                    免费
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-medium text-navy-700 mb-1 flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" />
          升级产品
        </h3>
        <p className="text-xs text-navy-400 mb-3">付费升级产品，提供更专业的护理体验</p>
        {paidProducts.length === 0 ? (
          <p className="text-sm text-navy-400 py-2">暂无升级产品</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paidProducts.map(product => {
              const qty = selected[product.id] || 0
              return (
                <div
                  key={product.id}
                  className={cn(
                    'border-2 rounded-lg p-3 flex items-center justify-between transition-all',
                    qty > 0 ? 'border-amber-400 bg-amber-50' : 'border-navy-100 bg-white',
                  )}
                >
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-navy-800 truncate">{product.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-amber-600">¥{product.price.toFixed(2)}/份</span>
                      {product.description && (
                        <span className="text-xs text-navy-400 truncate">{product.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {qty === 0 ? (
                      <button
                        onClick={() => onChange(product.id, 1)}
                        className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 transition-colors"
                      >
                        选择
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onChange(product.id, Math.max(0, qty - 1))}
                          className="w-7 h-7 rounded-md border border-navy-200 flex items-center justify-center hover:bg-navy-50 text-navy-500"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{qty}</span>
                        <button
                          onClick={() => onChange(product.id, qty + 1)}
                          className="w-7 h-7 rounded-md bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600"
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {activeProducts.length === 0 && (
        <p className="text-center text-navy-400 text-sm py-8">暂无可用产品</p>
      )}
    </div>
  )
}
