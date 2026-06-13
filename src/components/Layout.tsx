import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Home, PlusCircle, ListOrdered, Tag, Bell, Menu, X, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/order/new', label: '新建订单', icon: PlusCircle },
  { path: '/orders', label: '订单列表', icon: ListOrdered },
  { path: '/pricing', label: '价格管理', icon: Tag },
  { path: '/compensation-standard', label: '赔偿标准', icon: Scale },
  { path: '/notifications', label: '通知中心', icon: Bell },
]

export default function Layout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { unreadCount, fetchUnreadCount } = useAppStore()

  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-60 bg-navy-900 text-white flex flex-col transition-transform duration-200 md:relative md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-navy-700">
          <div className="w-8 h-8 rounded-lg bg-mint-400 flex items-center justify-center">
            <span className="text-navy-900 font-bold text-sm">洗</span>
          </div>
          <span className="font-serif font-semibold text-lg">洗衣店管理</span>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex items-center gap-3 px-6 py-3 text-sm transition-colors',
                  active
                    ? 'bg-navy-800 text-mint-400 border-l-4 border-mint-400'
                    : 'text-navy-200 hover:bg-navy-800 hover:text-white border-l-4 border-transparent',
                )}
              >
                <Icon size={18} strokeWidth={2} />
                <span>{label}</span>
                {path === '/notifications' && unreadCount > 0 && (
                  <span className="ml-auto bg-mint-400 text-navy-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="px-6 py-4 border-t border-navy-700 text-xs text-navy-400">
          洗衣店订单管理系统 v1.0
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-navy-100 flex items-center justify-between px-4 md:px-6 shrink-0">
          <button className="md:hidden p-1" onClick={() => setMobileOpen(true)}>
            <Menu size={22} strokeWidth={2} />
          </button>
          <div className="hidden md:block" />
          <Link to="/notifications" className="relative p-1 md:hidden">
            <Bell size={20} strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-mint-400 text-navy-900 text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
