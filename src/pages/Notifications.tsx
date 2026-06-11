import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Settings, Clock, CheckCheck } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import type { AppNotification } from '../../shared/types'

const typeIcons: Record<AppNotification['type'], typeof Bell> = {
  order: Bell,
  system: Settings,
  reminder: Clock,
}

export default function Notifications() {
  const navigate = useNavigate()
  const { notifications, fetchNotifications, markRead } = useAppStore()

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const handleMarkAll = async () => {
    const unread = notifications.filter(n => !n.isRead)
    for (const n of unread) {
      await markRead(n.id)
    }
  }

  const handleClick = async (n: AppNotification) => {
    if (!n.isRead) await markRead(n.id)
    if (n.orderId) navigate(`/orders/${n.orderId}`)
  }

  const hasUnread = notifications.some(n => !n.isRead)

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-xl font-semibold">通知中心</h1>
        {hasUnread && (
          <button onClick={handleMarkAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-navy-600 border border-navy-200 hover:bg-navy-50 transition-colors">
            <CheckCheck size={14} strokeWidth={2} /> 全部已读
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg border border-navy-100 p-10 text-center text-navy-400 text-sm">
          暂无通知
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-navy-100 divide-y divide-navy-100">
          {notifications.map(n => {
            const Icon = typeIcons[n.type]
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-navy-50 transition-colors"
              >
                <div className={cn('mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0', n.isRead ? 'bg-navy-50 text-navy-300' : 'bg-mint-50 text-mint-600')}>
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm', n.isRead ? 'text-navy-500' : 'text-navy-800 font-semibold')}>{n.title}</span>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-mint-400 shrink-0" />}
                  </div>
                  <p className={cn('text-xs mt-0.5', n.isRead ? 'text-navy-300' : 'text-navy-500')}>{n.message}</p>
                  <p className="text-xs text-navy-300 mt-1">{new Date(n.createdAt).toLocaleString('zh-CN')}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
