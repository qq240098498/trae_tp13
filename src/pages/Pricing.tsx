import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Gift, Package } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import type { ServiceItem, LaundryProduct, ProductPackage, PackageItem } from '../../shared/types'

type TabKey = 'services' | 'products' | 'packages'

const serviceCategories = ['水洗', '干洗', '熨烫', '特殊护理']
const productCategories = ['free', 'paid'] as const
const packageCategories = ['free', 'paid'] as const

type ServiceForm = Omit<ServiceItem, 'id' | 'createdAt' | 'updatedAt'>
type ProductForm = Omit<LaundryProduct, 'id' | 'createdAt' | 'updatedAt'>
type PackageForm = Omit<ProductPackage, 'id' | 'createdAt' | 'updatedAt'>

const emptyServiceForm: ServiceForm = {
  name: '', category: '水洗', unit: '件', basePrice: 0, specialPrice: undefined, description: '', isActive: true,
}
const emptyProductForm: ProductForm = {
  name: '', category: 'free', price: 0, description: '', isActive: true,
}
const emptyPackageForm: PackageForm = {
  name: '', category: 'free', packagePrice: 0, originalPrice: 0, description: '', items: [], isActive: true,
}

const inputCls = 'w-full border border-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mint-400 focus:ring-1 focus:ring-mint-400'

export default function Pricing() {
  const {
    services, fetchServices, addService, updateService, deleteService,
    products, fetchProducts, addProduct, updateProduct, deleteProduct,
    packages, fetchPackages, addPackage, updatePackage, deletePackage,
  } = useAppStore()

  const [tab, setTab] = useState<TabKey>('services')
  const [category, setCategory] = useState('全部')

  const [editingService, setEditingService] = useState<ServiceItem | null>(null)
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm)

  const [editingProduct, setEditingProduct] = useState<LaundryProduct | null>(null)
  const [showProductForm, setShowProductForm] = useState(false)
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm)

  const [editingPackage, setEditingPackage] = useState<ProductPackage | null>(null)
  const [showPackageForm, setShowPackageForm] = useState(false)
  const [packageForm, setPackageForm] = useState<PackageForm>(emptyPackageForm)

  useEffect(() => { fetchServices() }, [fetchServices])
  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { fetchPackages() }, [fetchPackages])

  useEffect(() => { setCategory('全部') }, [tab])

  const filteredServices = category === '全部' ? services : services.filter(s => s.category === category)
  const filteredProducts = category === '全部' ? products : products.filter(p => p.category === category)
  const filteredPackages = category === '全部' ? packages : packages.filter(p => p.category === category)

  const openEditService = (item: ServiceItem) => {
    setEditingService(item)
    setServiceForm({ name: item.name, category: item.category, unit: item.unit, basePrice: item.basePrice, specialPrice: item.specialPrice, description: item.description, isActive: item.isActive })
    setShowServiceForm(true)
  }
  const openNewService = () => { setEditingService(null); setServiceForm(emptyServiceForm); setShowServiceForm(true) }
  const handleServiceSubmit = async () => {
    if (editingService) await updateService(editingService.id, serviceForm)
    else await addService(serviceForm)
    setShowServiceForm(false)
  }
  const handleDeleteService = async (id: string) => { if (!confirm('确认删除此服务？')) return; await deleteService(id) }

  const openEditProduct = (item: LaundryProduct) => {
    setEditingProduct(item)
    setProductForm({ name: item.name, category: item.category, price: item.price, description: item.description, isActive: item.isActive })
    setShowProductForm(true)
  }
  const openNewProduct = () => { setEditingProduct(null); setProductForm(emptyProductForm); setShowProductForm(true) }
  const handleProductSubmit = async () => {
    if (editingProduct) await updateProduct(editingProduct.id, productForm)
    else await addProduct(productForm)
    setShowProductForm(false)
  }
  const handleDeleteProduct = async (id: string) => { if (!confirm('确认删除此产品？')) return; await deleteProduct(id) }

  const openEditPackage = (item: ProductPackage) => {
    setEditingPackage(item)
    setPackageForm({ name: item.name, category: item.category, packagePrice: item.packagePrice, originalPrice: item.originalPrice, description: item.description, items: [...item.items], isActive: item.isActive })
    setShowPackageForm(true)
  }
  const openNewPackage = () => { setEditingPackage(null); setPackageForm(emptyPackageForm); setShowPackageForm(true) }
  const handlePackageSubmit = async () => {
    if (editingPackage) await updatePackage(editingPackage.id, packageForm)
    else await addPackage(packageForm)
    setShowPackageForm(false)
  }
  const handleDeletePackage = async (id: string) => { if (!confirm('确认删除此套餐？')) return; await deletePackage(id) }

  const addPackageItem = () => {
    setPackageForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', productName: '', quantity: 1 }],
    }))
  }
  const removePackageItem = (idx: number) => {
    setPackageForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
  }
  const updatePackageItem = (idx: number, field: keyof PackageItem, value: string | number) => {
    setPackageForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }))
  }

  const tabs: { key: TabKey; label: string; icon: typeof Gift }[] = [
    { key: 'services', label: '服务项目', icon: Gift },
    { key: 'products', label: '洗衣产品', icon: Gift },
    { key: 'packages', label: '洗护套餐', icon: Package },
  ]

  const categoryOptions = tab === 'services'
    ? ['全部', ...serviceCategories]
    : ['全部', 'free', 'paid']

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-xl font-semibold">价格管理</h1>
        <button
          onClick={tab === 'services' ? openNewService : tab === 'products' ? openNewProduct : openNewPackage}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-mint-400 text-navy-900 hover:bg-mint-500 text-sm font-medium transition-colors"
        >
          <Plus size={16} strokeWidth={2} />
          {tab === 'services' ? '新增服务' : tab === 'products' ? '新增产品' : '新增套餐'}
        </button>
      </div>

      <div className="flex gap-1 mb-4 border-b border-navy-100">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === key
                ? 'border-navy-800 text-navy-800'
                : 'border-transparent text-navy-400 hover:text-navy-600',
            )}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {categoryOptions.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              category === cat ? 'bg-navy-800 text-white' : 'bg-white text-navy-500 border border-navy-100 hover:bg-navy-50',
            )}
          >
            {cat === 'free' ? '免费' : cat === 'paid' ? '付费' : cat}
          </button>
        ))}
      </div>

      {tab === 'services' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map(item => (
              <div key={item.id} className="bg-white rounded-lg border border-navy-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-navy-800">{item.name}</h3>
                    <span className="text-xs text-navy-400">{item.category} · {item.unit}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditService(item)} className="p-1.5 rounded-md hover:bg-navy-50 text-navy-400 hover:text-navy-700 transition-colors"><Pencil size={14} strokeWidth={2} /></button>
                    <button onClick={() => handleDeleteService(item.id)} className="p-1.5 rounded-md hover:bg-red-50 text-navy-400 hover:text-red-600 transition-colors"><Trash2 size={14} strokeWidth={2} /></button>
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
          {filteredServices.length === 0 && <div className="text-center py-10 text-navy-400 text-sm">暂无服务项目</div>}
        </>
      )}

      {tab === 'products' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(item => (
              <div key={item.id} className="bg-white rounded-lg border border-navy-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-navy-800">{item.name}</h3>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      item.category === 'free' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                    )}>
                      {item.category === 'free' ? '免费' : '付费'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditProduct(item)} className="p-1.5 rounded-md hover:bg-navy-50 text-navy-400 hover:text-navy-700 transition-colors"><Pencil size={14} strokeWidth={2} /></button>
                    <button onClick={() => handleDeleteProduct(item.id)} className="p-1.5 rounded-md hover:bg-red-50 text-navy-400 hover:text-red-600 transition-colors"><Trash2 size={14} strokeWidth={2} /></button>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-navy-800">¥{item.price.toFixed(2)}</span>
                  <span className="text-xs text-navy-400">/份</span>
                </div>
                {item.description && <p className="text-xs text-navy-400 mt-2">{item.description}</p>}
              </div>
            ))}
          </div>
          {filteredProducts.length === 0 && <div className="text-center py-10 text-navy-400 text-sm">暂无洗衣产品</div>}
        </>
      )}

      {tab === 'packages' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredPackages.map(pkg => {
              const savings = pkg.originalPrice - pkg.packagePrice
              return (
                <div key={pkg.id} className="bg-white rounded-lg border border-navy-100 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-navy-800">{pkg.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          pkg.category === 'free' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                        )}>
                          {pkg.category === 'free' ? '免费' : '付费'}
                        </span>
                        {savings > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600">省¥{savings.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditPackage(pkg)} className="p-1.5 rounded-md hover:bg-navy-50 text-navy-400 hover:text-navy-700 transition-colors"><Pencil size={14} strokeWidth={2} /></button>
                      <button onClick={() => handleDeletePackage(pkg.id)} className="p-1.5 rounded-md hover:bg-red-50 text-navy-400 hover:text-red-600 transition-colors"><Trash2 size={14} strokeWidth={2} /></button>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-lg font-semibold text-navy-800">¥{pkg.packagePrice.toFixed(2)}</span>
                    {pkg.originalPrice > pkg.packagePrice && (
                      <span className="text-sm text-navy-300 line-through">¥{pkg.originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                  {pkg.description && <p className="text-xs text-navy-400 mb-2">{pkg.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {pkg.items.map((item, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-xs bg-navy-50 text-navy-500">
                        {item.productName} × {item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          {filteredPackages.length === 0 && <div className="text-center py-10 text-navy-400 text-sm">暂无洗护套餐</div>}
        </>
      )}

      {showServiceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-navy-800">{editingService ? '编辑服务' : '新增服务'}</h2>
              <button onClick={() => setShowServiceForm(false)} className="p-1 hover:bg-navy-50 rounded-md"><X size={18} strokeWidth={2} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-navy-600 mb-1">名称</label>
                <input value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-navy-600 mb-1">分类</label>
                <select value={serviceForm.category} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })} className={inputCls}>
                  {serviceCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-navy-600 mb-1">单位</label>
                  <input value={serviceForm.unit} onChange={e => setServiceForm({ ...serviceForm, unit: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm text-navy-600 mb-1">基础价格</label>
                  <input type="number" value={serviceForm.basePrice} onChange={e => setServiceForm({ ...serviceForm, basePrice: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-navy-600 mb-1">特价（可选）</label>
                <input type="number" value={serviceForm.specialPrice ?? ''} onChange={e => setServiceForm({ ...serviceForm, specialPrice: e.target.value ? Number(e.target.value) : undefined })} className={inputCls} placeholder="留空则无特价" />
              </div>
              <div>
                <label className="block text-sm text-navy-600 mb-1">描述</label>
                <textarea value={serviceForm.description ?? ''} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} rows={2} className={cn(inputCls, 'resize-none')} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowServiceForm(false)} className="px-4 py-2 rounded-lg border border-navy-200 text-navy-600 text-sm hover:bg-navy-50 transition-colors">取消</button>
              <button onClick={handleServiceSubmit} className="px-4 py-2 rounded-lg bg-mint-400 text-navy-900 text-sm font-medium hover:bg-mint-500 transition-colors">{editingService ? '保存' : '创建'}</button>
            </div>
          </div>
        </div>
      )}

      {showProductForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-navy-800">{editingProduct ? '编辑产品' : '新增产品'}</h2>
              <button onClick={() => setShowProductForm(false)} className="p-1 hover:bg-navy-50 rounded-md"><X size={18} strokeWidth={2} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-navy-600 mb-1">名称</label>
                <input value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-navy-600 mb-1">分类</label>
                <select value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value as 'free' | 'paid' })} className={inputCls}>
                  <option value="free">免费</option>
                  <option value="paid">付费</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-navy-600 mb-1">价格</label>
                <input type="number" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: Number(e.target.value) })} className={inputCls} />
                <p className="text-xs text-navy-300 mt-1">免费产品请设为 0</p>
              </div>
              <div>
                <label className="block text-sm text-navy-600 mb-1">描述</label>
                <textarea value={productForm.description ?? ''} onChange={e => setProductForm({ ...productForm, description: e.target.value })} rows={2} className={cn(inputCls, 'resize-none')} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowProductForm(false)} className="px-4 py-2 rounded-lg border border-navy-200 text-navy-600 text-sm hover:bg-navy-50 transition-colors">取消</button>
              <button onClick={handleProductSubmit} className="px-4 py-2 rounded-lg bg-mint-400 text-navy-900 text-sm font-medium hover:bg-mint-500 transition-colors">{editingProduct ? '保存' : '创建'}</button>
            </div>
          </div>
        </div>
      )}

      {showPackageForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-navy-800">{editingPackage ? '编辑套餐' : '新增套餐'}</h2>
              <button onClick={() => setShowPackageForm(false)} className="p-1 hover:bg-navy-50 rounded-md"><X size={18} strokeWidth={2} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-navy-600 mb-1">名称</label>
                <input value={packageForm.name} onChange={e => setPackageForm({ ...packageForm, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-navy-600 mb-1">分类</label>
                <select value={packageForm.category} onChange={e => setPackageForm({ ...packageForm, category: e.target.value as 'free' | 'paid' })} className={inputCls}>
                  <option value="free">免费</option>
                  <option value="paid">付费</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-navy-600 mb-1">套餐价格</label>
                  <input type="number" value={packageForm.packagePrice} onChange={e => setPackageForm({ ...packageForm, packagePrice: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm text-navy-600 mb-1">原价</label>
                  <input type="number" value={packageForm.originalPrice} onChange={e => setPackageForm({ ...packageForm, originalPrice: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-navy-600 mb-1">描述</label>
                <textarea value={packageForm.description ?? ''} onChange={e => setPackageForm({ ...packageForm, description: e.target.value })} rows={2} className={cn(inputCls, 'resize-none')} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-navy-600">包含产品</label>
                  <button onClick={addPackageItem} className="flex items-center gap-1 px-2 py-1 rounded-md bg-navy-50 text-navy-600 text-xs hover:bg-navy-100 transition-colors">
                    <Plus size={12} strokeWidth={2} /> 添加
                  </button>
                </div>
                {packageForm.items.length === 0 ? (
                  <p className="text-xs text-navy-300 py-2">暂未添加产品</p>
                ) : (
                  <div className="space-y-2">
                    {packageForm.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          value={item.productName}
                          onChange={e => updatePackageItem(idx, 'productName', e.target.value)}
                          placeholder="产品名称"
                          className={cn(inputCls, 'flex-1')}
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updatePackageItem(idx, 'quantity', Number(e.target.value))}
                          className={cn(inputCls, 'w-20')}
                          min={1}
                        />
                        <button onClick={() => removePackageItem(idx)} className="p-1.5 rounded-md hover:bg-red-50 text-navy-300 hover:text-red-500 transition-colors shrink-0">
                          <X size={14} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowPackageForm(false)} className="px-4 py-2 rounded-lg border border-navy-200 text-navy-600 text-sm hover:bg-navy-50 transition-colors">取消</button>
              <button onClick={handlePackageSubmit} className="px-4 py-2 rounded-lg bg-mint-400 text-navy-900 text-sm font-medium hover:bg-mint-500 transition-colors">{editingPackage ? '保存' : '创建'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
