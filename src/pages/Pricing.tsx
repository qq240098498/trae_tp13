import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import type { ServiceItem } from '../../shared/types'

type ServiceItemForm = Omit<ServiceItem, 'id' | 'createdAt' | 'updatedAt'>

const categories = ['水洗', '干洗', '熨烫', '特殊护理']

const emptyForm: ServiceItemForm = {
  name: '', category: '水洗', unit: '件', basePrice: 0, specialPrice: undefined, description: '', isActive: true,
}

export default function Pricing() {
  const { services, fetchServices, addService, updateService, deleteService } = useAppStore()
  const [category, setCategory] = useState('全部')
  const [editing, setEditing] = useState<ServiceItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ServiceItemForm>(emptyForm)

  useEffect(() => { fetchServices() }, [fetchServices])

  const filtered = category === '全部' ? services : services.filter(s => s.category === category)

  const openEdit = (item: ServiceItem) => {
    setEditing(item)
    setForm({ name: item.name, category: item.category, unit: item.unit, basePrice: item.basePrice, specialPrice: item.specialPrice, description: item.description, isActive: item.isActive })
    setShowForm(true)
  }

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (editing) {
      await updateService(editing.id, form)
    } else {
      await addService(form)
    }
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此服务？')) return
    await deleteService(id)
  }

  const inputCls = 'w-full border border-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mint-400 focus:ring-1 focus:ring-mint-400'

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-xl font-semibold">价格管理</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mint-400 text-navy-900 hover:bg-mint-500 text-sm font-medium transition-colors">
          <Plus size={16} strokeWidth={2} /> 新增服务
        </button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {['全部', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              category === cat ? 'bg-navy-800 text-white' : 'bg-white text-navy-500 border border-navy-100 hover:bg-navy-50',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-lg border border-navy-100 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-medium text-navy-800">{item.name}</h3>
                <span className="text-xs text-navy-400">{item.category} · {item.unit}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(item)} className="p-1.5 rounded-md hover:bg-navy-50 text-navy-400 hover:text-navy-700 transition-colors">
                  <Pencil size={14} strokeWidth={2} />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-md hover:bg-red-50 text-navy-400 hover:text-red-600 transition-colors">
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-navy-800">¥{item.basePrice}</span>
              {item.specialPrice != null && <span className="text-sm text-mint-600 line-through">¥{item.specialPrice}</span>}
              <span className="text-xs text-navy-400">/{item.unit}</span>
            </div>
            {item.description && <p className="text-xs text-navy-400 mt-2">{item.description}</p>}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-navy-400 text-sm">暂无服务项目</div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-navy-800">{editing ? '编辑服务' : '新增服务'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-navy-50 rounded-md"><X size={18} strokeWidth={2} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-navy-600 mb-1">名称</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-navy-600 mb-1">分类</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-navy-600 mb-1">单位</label>
                  <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm text-navy-600 mb-1">基础价格</label>
                  <input type="number" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-navy-600 mb-1">特价（可选）</label>
                <input type="number" value={form.specialPrice ?? ''} onChange={e => setForm({ ...form, specialPrice: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} placeholder="留空则无特价" />
              </div>
              <div>
                <label className="block text-sm text-navy-600 mb-1">描述</label>
                <textarea value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={cn(inputCls, 'resize-none')} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-navy-200 text-navy-600 text-sm hover:bg-navy-50 transition-colors">取消</button>
              <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-mint-400 text-navy-900 text-sm font-medium hover:bg-mint-500 transition-colors">{editing ? '保存' : '创建'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
