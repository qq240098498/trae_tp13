import { cn } from '@/lib/utils'

interface Props {
  name: string
  phone: string
  address: string
  remark: string
  pickupMethod: string
  onNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onAddressChange: (v: string) => void
  onRemarkChange: (v: string) => void
}

export default function CustomerForm({
  name, phone, address, remark, pickupMethod,
  onNameChange, onPhoneChange, onAddressChange, onRemarkChange,
}: Props) {
  const inputCls = 'w-full border border-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mint-400 focus:ring-1 focus:ring-mint-400 transition-colors'

  return (
    <div className="max-w-md space-y-4">
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1">客户姓名 *</label>
        <input type="text" value={name} onChange={e => onNameChange(e.target.value)} placeholder="请输入客户姓名" className={inputCls} />
      </div>
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1">联系电话 *</label>
        <input type="tel" value={phone} onChange={e => onPhoneChange(e.target.value)} placeholder="请输入联系电话" className={inputCls} />
      </div>
      {pickupMethod === 'delivery' && (
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">取送地址 *</label>
          <input type="text" value={address} onChange={e => onAddressChange(e.target.value)} placeholder="请输入取送地址" className={inputCls} />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1">备注</label>
        <textarea value={remark} onChange={e => onRemarkChange(e.target.value)} placeholder="请输入备注信息（可选）" rows={3} className={cn(inputCls, 'resize-none')} />
      </div>
    </div>
  )
}
