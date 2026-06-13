import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const steps = ['选择服务', '选择产品', '取送方式', '客户信息', '确认订单']

export default function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                i < current
                  ? 'bg-mint-400 border-mint-400 text-navy-900'
                  : i === current
                    ? 'border-navy-800 text-navy-800 bg-white'
                    : 'border-navy-200 text-navy-300 bg-white',
              )}
            >
              {i < current ? <Check size={16} strokeWidth={2} /> : i + 1}
            </div>
            <span className={cn('text-xs mt-1.5 whitespace-nowrap', i <= current ? 'text-navy-800 font-medium' : 'text-navy-300')}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('w-12 sm:w-20 h-0.5 mb-5', i < current ? 'bg-mint-400' : 'bg-navy-100')} />
          )}
        </div>
      ))}
    </div>
  )
}
