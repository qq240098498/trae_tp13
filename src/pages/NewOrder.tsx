import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Send } from 'lucide-react'
import { useAppStore } from '@/store'
import StepIndicator from '@/components/StepIndicator'
import ServiceSelector from '@/components/ServiceSelector'
import PickupSelector from '@/components/PickupSelector'
import CustomerForm from '@/components/CustomerForm'
import OrderConfirm from '@/components/OrderConfirm'

export default function NewOrder() {
  const navigate = useNavigate()
  const { services, fetchServices, createOrder } = useAppStore()

  const [step, setStep] = useState(1)
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})
  const [pickupMethod, setPickupMethod] = useState('self')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [remark, setRemark] = useState('')

  useEffect(() => { fetchServices() }, [fetchServices])

  const handleQuantityChange = (serviceId: string, quantity: number) => {
    setSelectedItems(prev => {
      const next = { ...prev }
      if (quantity === 0) delete next[serviceId]
      else next[serviceId] = quantity
      return next
    })
  }

  const pricingItems = useMemo(() => {
    return Object.entries(selectedItems)
      .filter(([, qty]) => qty > 0)
      .map(([serviceId, quantity]) => {
        const service = services.find(s => s.id === serviceId)
        const unitPrice = service?.specialPrice ?? service?.basePrice ?? 0
        return {
          serviceId,
          serviceName: service?.name ?? '',
          quantity,
          unitPrice,
          subtotal: unitPrice * quantity,
        }
      })
  }, [selectedItems, services])

  const total = useMemo(() => pricingItems.reduce((sum, i) => sum + i.subtotal, 0), [pricingItems])

  const hasItems = pricingItems.length > 0
  const canNext = () => {
    if (step === 1) return hasItems
    if (step === 2) return !!pickupMethod
    if (step === 3) return customerName.trim() !== '' && customerPhone.trim() !== '' && (pickupMethod !== 'delivery' || customerAddress.trim() !== '')
    return true
  }

  const handleSubmit = async () => {
    try {
      const order = await createOrder({
        customerName,
        customerPhone,
        customerAddress: pickupMethod === 'delivery' ? customerAddress : undefined,
        items: Object.entries(selectedItems).map(([serviceId, quantity]) => ({ serviceId, quantity })),
        pickupMethod,
        remark: remark || undefined,
      })
      navigate(`/orders/${order.id}`)
    } catch {
      alert('创建订单失败，请重试')
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <StepIndicator current={step} />

      <div className="bg-white rounded-xl border border-navy-100 p-6">
        {step === 1 && <ServiceSelector services={services} selected={selectedItems} onChange={handleQuantityChange} />}
        {step === 2 && <PickupSelector services={services} selectedItems={selectedItems} pickupMethod={pickupMethod} onPickupChange={setPickupMethod} pricingItems={pricingItems} total={total} />}
        {step === 3 && <CustomerForm name={customerName} phone={customerPhone} address={customerAddress} remark={remark} pickupMethod={pickupMethod} onNameChange={setCustomerName} onPhoneChange={setCustomerPhone} onAddressChange={setCustomerAddress} onRemarkChange={setRemark} />}
        {step === 4 && <OrderConfirm name={customerName} phone={customerPhone} address={customerAddress} remark={remark} pickupMethod={pickupMethod} items={pricingItems} total={total} />}
      </div>

      <div className="flex justify-between mt-6">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50 text-sm font-medium transition-colors">
            <ArrowLeft size={16} strokeWidth={2} /> 上一步
          </button>
        ) : <div />}

        {step < 4 ? (
          <button onClick={() => setStep(step + 1)} disabled={!canNext()} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-navy-800 text-white hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors">
            下一步 <ArrowRight size={16} strokeWidth={2} />
          </button>
        ) : (
          <button onClick={handleSubmit} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-mint-400 text-navy-900 hover:bg-mint-500 text-sm font-medium transition-colors">
            <Send size={16} strokeWidth={2} /> 提交订单
          </button>
        )}
      </div>
    </div>
  )
}
