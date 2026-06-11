import { Plus, Minus } from 'lucide-react'
import type { ServiceItem } from '../../shared/types'
import { cn } from '@/lib/utils'

interface Props {
  services: ServiceItem[]
  selected: Record<string, number>
  onChange: (serviceId: string, quantity: number) => void
}

const categoryOrder = ['水洗', '干洗', '熨烫', '特殊护理']

export default function ServiceSelector({ services, selected, onChange }: Props) {
  const activeServices = services.filter(s => s.isActive)
  const grouped = categoryOrder.map(cat => ({
    category: cat,
    items: activeServices.filter(s => s.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div className="space-y-6">
      {grouped.map(({ category, items }) => (
        <div key={category}>
          <h3 className="font-medium text-navy-700 mb-3">{category}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map(item => {
              const qty = selected[item.id] || 0
              return (
                <div key={item.id} className={cn(
                  'border rounded-lg p-3 flex items-center justify-between transition-colors',
                  qty > 0 ? 'border-mint-400 bg-mint-50' : 'border-navy-100 bg-white',
                )}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-800 truncate">{item.name}</p>
                    <p className="text-xs text-navy-400">
                      ¥{item.specialPrice ?? item.basePrice}/{item.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => onChange(item.id, Math.max(0, qty - 1))}
                      className="w-7 h-7 rounded-md border border-navy-200 flex items-center justify-center hover:bg-navy-50 disabled:opacity-30"
                      disabled={qty === 0}
                    >
                      <Minus size={14} strokeWidth={2} />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{qty}</span>
                    <button
                      onClick={() => onChange(item.id, qty + 1)}
                      className="w-7 h-7 rounded-md bg-navy-800 text-white flex items-center justify-center hover:bg-navy-700"
                    >
                      <Plus size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {activeServices.length === 0 && (
        <p className="text-center text-navy-400 text-sm py-8">暂无可用服务</p>
      )}
    </div>
  )
}
