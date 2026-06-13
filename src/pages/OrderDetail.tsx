import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Phone, MapPin, Clock, User, Truck, X, AlertTriangle,
  CheckCircle2, Circle, XCircle, FileText, BadgeDollarSign, Stethoscope,
  PackageCheck, ClipboardList, Wrench, MessageSquare, RotateCcw,
  AlertCircle, DollarSign, CreditCard, Calculator, Info, Shield,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import StatusBadge, { statusLabels } from '@/components/StatusBadge'
import { damageTypeLabels, damageSeverityLabels, compensationStatusLabels, compensationMethodLabels, calculateCompensationAmount, calculateDepreciatedValue, COMPENSATION_RULES, responsibilityPartyLabels, responsibilityPartyColors, resolutionTypeLabels } from '../../shared/workflow'
import type { OrderStatus, AvailableAction, StatusChange, PerformActionRequest, DamageReport, CompensationRecord, Order, DamageType, DamageSeverity, ResponsibilityParty } from '../../shared/types'

const styleClasses: Record<AvailableAction['buttonStyle'], string> = {
  primary: 'bg-mint-400 text-navy-900 hover:bg-mint-500 shadow-sm shadow-mint-200',
  secondary: 'bg-navy-100 text-navy-700 hover:bg-navy-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100',
  danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  outline: 'border border-navy-200 text-navy-600 hover:bg-navy-50',
  success: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-200',
}

const iconMap: Record<string, any> = {
  accept: CheckCircle2,
  start_wash: Wrench,
  finish_wash: Stethoscope,
  pass_inspect: PackageCheck,
  pickup: CheckCircle2,
  cancel: XCircle,
  fail_inspect: RotateCcw,
  assign_staff: User,
  contact_customer: Phone,
  add_note: MessageSquare,
  check_clothes: ClipboardList,
  report_damage: AlertTriangle,
  assign_station: BadgeDollarSign,
  record_process: FileText,
  add_detergent: BadgeDollarSign,
  record_defect: AlertTriangle,
  issue_voucher: FileText,
  schedule_delivery: Truck,
  apply_compensation: BadgeDollarSign,
  repair_then_return: Wrench,
  negotiate_no_comp: MessageSquare,
  close_no_responsibility: Shield,
  update_responsibility: AlertCircle,
  approve_compensation: CheckCircle2,
  reject_compensation: XCircle,
  confirm_payout: CheckCircle2,
  complete_order: PackageCheck,
}

const categoryLabels: Record<string, string> = {
  status_primary: '状态流转',
  status_rollback: '状态回退',
  business: '业务操作',
  note: '备注记录',
  compensation: '赔偿操作',
}

const statusTimeline: OrderStatus[] = ['pending', 'accepted', 'washing', 'inspecting', 'completed', 'picked_up']

const metadataLabels: Record<string, { label: string; type?: 'text' | 'number' | 'select' | 'date'; options?: { value: string; label: string }[] }> = {
  staffName: { label: '店员姓名' },
  clothesCount: { label: '衣物数量', type: 'number' },
  damageType: {
    label: '异常类型',
    type: 'select',
    options: Object.entries(damageTypeLabels).map(([value, label]) => ({ value, label })),
  },
  severity: {
    label: '损坏程度',
    type: 'select',
    options: Object.entries(damageSeverityLabels).map(([value, label]) => ({ value, label })),
  },
  responsibilityParty: {
    label: '责任归属',
    type: 'select',
    options: Object.entries(responsibilityPartyLabels).map(([value, label]) => ({ value, label })),
  },
  stationNo: { label: '工位编号' },
  processType: {
    label: '工艺类型',
    type: 'select',
    options: [
      { value: 'water_wash', label: '水洗' },
      { value: 'dry_clean', label: '干洗' },
      { value: 'hand_wash', label: '手洗' },
      { value: 'low_temp', label: '低温洗' },
      { value: 'special', label: '特殊洗涤' },
    ],
  },
  temperature: { label: '洗涤温度(°C)', type: 'number' },
  defectType: {
    label: '瑕疵类型',
    type: 'select',
    options: [
      { value: 'residual_stain', label: '洗涤残留污渍' },
      { value: 'not_clean', label: '未洗净' },
      { value: 'minor_damage', label: '轻微损伤' },
      { value: 'deformation', label: '变形' },
      { value: 'other', label: '其他' },
    ],
  },
  voucherNo: { label: '取衣凭证号' },
  deliveryTime: { label: '配送时间', type: 'date' },
  damageReportId: { label: '关联损坏报告' },
  compensationRecordId: { label: '赔偿记录ID' },
  compensationMethod: {
    label: '赔偿方式',
    type: 'select',
    options: Object.entries(compensationMethodLabels).map(([value, label]) => ({ value, label })),
  },
  finalAmount: { label: '最终赔偿金额(元)', type: 'number' },
  customRate: { label: '自定义赔偿比例(0-1)', type: 'number' },
  originalValue: { label: '衣物原值(元)', type: 'number' },
  purchaseDate: { label: '购买日期', type: 'date' },
  paidProof: { label: '支付凭证' },
}

interface ActionDialogProps {
  action: AvailableAction
  order: Order
  onClose: () => void
  onConfirm: (data: { remark?: string; metadata?: Record<string, any> }) => void
}

function ActionDialog({ action, order, onClose, onConfirm, currentOrderStatus }: ActionDialogProps & { currentOrderStatus: OrderStatus }) {
  const [remark, setRemark] = useState('')
  const [metadata, setMetadata] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const requiredFields = action.requiresMetadata ?? []
  const hasFormFields = requiredFields.length > 0 || action.requiresRemark
  const isStatusChange = action.category === 'status_primary' || action.category === 'status_rollback'
  const isCompensationAction = action.category === 'compensation' || action.code === 'report_damage'

  const optionalFields = useMemo(() => {
    const fields: string[] = []
    if (action.code === 'report_damage') {
      if (!requiredFields.includes('severity')) fields.push('severity')
      if (!requiredFields.includes('originalValue')) fields.push('originalValue')
      if (!requiredFields.includes('purchaseDate')) fields.push('purchaseDate')
    }
    if (action.code === 'apply_compensation') {
      if (!requiredFields.includes('customRate')) fields.push('customRate')
    }
    return fields
  }, [action.code, requiredFields])

  const damageReportForCompensation = useMemo(() => {
    if (action.code !== 'apply_compensation' || !metadata.damageReportId) return null
    return order.damageReports?.find(d => d.id === metadata.damageReportId) || null
  }, [action.code, metadata.damageReportId, order.damageReports])

  const compensationCalc = useMemo(() => {
    if (action.code === 'report_damage') {
      const damageType = metadata.damageType as DamageType || 'tear'
      const severity = metadata.severity as DamageSeverity || 'moderate'
      const originalValue = Number(metadata.originalValue) || 0
      const purchaseDate = metadata.purchaseDate
      if (!originalValue) return null
      return calculateCompensationAmount(originalValue, purchaseDate, damageType, severity)
    }
    if (action.code === 'apply_compensation' && damageReportForCompensation) {
      const customRate = metadata.customRate ? Number(metadata.customRate) : undefined
      return calculateCompensationAmount(
        damageReportForCompensation.originalValue || 0,
        damageReportForCompensation.purchaseDate,
        damageReportForCompensation.damageType,
        damageReportForCompensation.severity,
        customRate,
      )
    }
    return null
  }, [action.code, metadata, damageReportForCompensation])

  const depreciatedValue = useMemo(() => {
    if (action.code === 'report_damage') {
      const originalValue = Number(metadata.originalValue) || 0
      const purchaseDate = metadata.purchaseDate
      if (!originalValue || !purchaseDate) return null
      return calculateDepreciatedValue(originalValue, purchaseDate)
    }
    if (damageReportForCompensation?.originalValue && damageReportForCompensation.purchaseDate) {
      return calculateDepreciatedValue(
        damageReportForCompensation.originalValue,
        damageReportForCompensation.purchaseDate,
      )
    }
    return null
  }, [action.code, metadata.originalValue, metadata.purchaseDate, damageReportForCompensation])

  const handleConfirm = () => {
    const newErrors: Record<string, string> = {}

    if (action.requiresRemark && !remark.trim()) {
      newErrors.remark = '请填写备注说明'
    }

    const missing = requiredFields.filter(k => !metadata[k]?.trim())
    if (missing.length > 0) {
      missing.forEach(k => {
        newErrors[k] = `请填写${metadataLabels[k]?.label || k}`
      })
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const processedMeta: Record<string, any> = {}
    const allFields = [...requiredFields, ...optionalFields]
    for (const k of allFields) {
      if (!metadata[k]?.trim()) continue
      const def = metadataLabels[k]
      processedMeta[k] = def?.type === 'number' ? Number(metadata[k]) : metadata[k]
    }
    onConfirm({
      remark: remark.trim() || undefined,
      metadata: Object.keys(processedMeta).length > 0 ? processedMeta : undefined,
    })
  }

  const Icon = iconMap[action.code] || FileText
  const isDanger = action.buttonStyle === 'danger'
  const isWarning = action.buttonStyle === 'warning'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className={cn(
          'flex items-center justify-between p-6 border-b',
          isDanger ? 'border-red-100' : isWarning ? 'border-amber-100' : 'border-navy-100'
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              isDanger ? 'bg-red-50 text-red-600'
                : isWarning ? 'bg-amber-50 text-amber-600'
                : action.buttonStyle === 'primary' ? 'bg-mint-50 text-mint-600'
                : 'bg-navy-50 text-navy-600'
            )}>
              <Icon size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-navy-900 text-lg">{action.name}</h3>
              <p className="text-sm text-navy-400 mt-0.5">{categoryLabels[action.category]}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600 transition-colors p-1 rounded-lg hover:bg-navy-50">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {isStatusChange && action.targetStatus && (
            <div className="relative">
              <div className={cn(
                'rounded-xl p-5 flex items-center justify-center gap-3',
                isDanger ? 'bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200'
                  : isWarning ? 'bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200'
                  : 'bg-gradient-to-r from-mint-50 to-mint-100/50 border border-mint-200'
              )}>
                <div className="text-center">
                  <div className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium inline-block',
                    isDanger ? 'bg-red-100 text-red-700'
                      : isWarning ? 'bg-amber-100 text-amber-700'
                      : 'bg-white text-navy-700 border border-navy-100 shadow-sm'
                  )}>
                    {statusLabels[currentOrderStatus]}
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <ArrowRight size={20} className={cn(
                    'animate-pulse',
                    isDanger ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-mint-500'
                  )} />
                  <span className="text-[10px] text-navy-400 mt-1">状态变更</span>
                </div>
                <div className="text-center">
                  <div className={cn(
                    'px-4 py-2 rounded-lg text-sm font-semibold inline-block',
                    isDanger ? 'bg-red-200 text-red-800'
                      : isWarning ? 'bg-amber-200 text-amber-800'
                      : 'bg-mint-200 text-mint-800 shadow-sm'
                  )}>
                    {statusLabels[action.targetStatus]}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isDanger && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-red-700">⚠️ 危险操作警告</p>
                <p className="text-red-600 text-xs mt-1">此操作不可撤销，执行后订单状态将永久变更，请谨慎操作</p>
              </div>
            </div>
          )}

          {isWarning && action.category === 'status_rollback' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-700">⚠️ 状态回退提醒</p>
                <p className="text-amber-600 text-xs mt-1">订单将退回上一环节重新处理，请务必填写详细的退回原因说明</p>
              </div>
            </div>
          )}

          {isStatusChange && !isDanger && !isWarning && (
            <div className="bg-mint-50 border border-mint-200 rounded-xl px-4 py-3.5 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-mint-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-mint-700">流程推进确认</p>
                <p className="text-mint-600 text-xs mt-1">确认无误后填写相关信息，点击提交完成状态变更</p>
              </div>
            </div>
          )}

          <div className="bg-navy-50/80 border border-navy-100 rounded-xl px-4 py-3.5">
            <p className="text-sm text-navy-700 leading-relaxed">{action.description}</p>
          </div>

          {isCompensationAction && compensationCalc && (
            <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={18} className="text-rose-500" />
                <span className="font-medium text-navy-800 text-sm">赔偿金额估算</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {action.code === 'report_damage' && metadata.originalValue && (
                  <div className="bg-white/70 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-navy-500">衣物原值</p>
                    <p className="text-sm font-semibold text-navy-800">¥{Number(metadata.originalValue).toFixed(2)}</p>
                  </div>
                )}
                {damageReportForCompensation?.originalValue && (
                  <div className="bg-white/70 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-navy-500">衣物原值</p>
                    <p className="text-sm font-semibold text-navy-800">¥{damageReportForCompensation.originalValue.toFixed(2)}</p>
                  </div>
                )}
                {depreciatedValue != null && (
                  <div className="bg-white/70 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-navy-500">折旧后价值</p>
                    <p className="text-sm font-semibold text-amber-600">¥{depreciatedValue.toFixed(2)}</p>
                  </div>
                )}
                <div className="bg-white/70 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-navy-500">赔偿比例</p>
                  <p className="text-sm font-semibold text-navy-700">{Math.round(compensationCalc.rate * 100)}%</p>
                </div>
                <div className="bg-white/70 rounded-lg px-3 py-2 col-span-2">
                  <p className="text-[10px] text-navy-500">预估赔偿金额</p>
                  <p className="text-xl font-bold text-rose-600">¥{compensationCalc.amount.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-start gap-1.5 text-[10px] text-navy-500">
                <Info size={12} className="shrink-0 mt-0.5" />
                <span>金额范围：¥{compensationCalc.minAmount.toFixed(2)} ~ ¥{compensationCalc.maxAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          {requiredFields.map(fieldKey => {
            const def = metadataLabels[fieldKey] || { label: fieldKey }
            const hasError = !!errors[fieldKey]

            if (fieldKey === 'damageReportId' && order.damageReports && order.damageReports.length > 0) {
              return (
                <div key={fieldKey} className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy-800">
                    {def.label} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={metadata[fieldKey] || ''}
                    onChange={e => {
                      setMetadata({ ...metadata, [fieldKey]: e.target.value })
                      if (errors[fieldKey]) setErrors({ ...errors, [fieldKey]: '' })
                    }}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors',
                      hasError
                        ? 'border-2 border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50'
                        : 'border border-navy-200 focus:border-mint-400 focus:ring-mint-100 bg-white'
                    )}
                  >
                    <option value="">请选择损坏报告</option>
                    {order.damageReports.map(report => (
                      <option key={report.id} value={report.id}>
                        {damageTypeLabels[report.damageType] || report.damageType} - {damageSeverityLabels[report.severity]}
                        {` [${responsibilityPartyLabels[report.responsibilityParty] || report.responsibilityParty}]`}
                        {report.originalValue ? ` (原值¥${report.originalValue})` : ''}
                        {report.isResolved ? ' (已处理)' : ''}
                      </option>
                    ))}
                  </select>
                  {hasError && <p className="text-xs text-red-500">{errors[fieldKey]}</p>}
                </div>
              )
            }

            if (def.type === 'select') {
              return (
                <div key={fieldKey} className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy-800">
                    {def.label} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={metadata[fieldKey] || ''}
                    onChange={e => {
                      setMetadata({ ...metadata, [fieldKey]: e.target.value })
                      if (errors[fieldKey]) setErrors({ ...errors, [fieldKey]: '' })
                    }}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors',
                      hasError
                        ? 'border-2 border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50'
                        : 'border border-navy-200 focus:border-mint-400 focus:ring-mint-100 bg-white'
                    )}
                  >
                    <option value="">请选择{def.label}</option>
                    {def.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {fieldKey === 'responsibilityParty' && metadata[fieldKey] && metadata[fieldKey] !== 'store' && metadata[fieldKey] !== 'unknown' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-start gap-2 text-xs text-blue-700">
                      <Info size={14} className="shrink-0 mt-0.5" />
                      <span>非门店责任：可选择「非门店责任关闭」免于赔付，异常记录将保留</span>
                    </div>
                  )}
                  {hasError && <p className="text-xs text-red-500">{errors[fieldKey]}</p>}
                </div>
              )
            }
            return (
              <div key={fieldKey} className="space-y-1.5">
                <label className="block text-sm font-semibold text-navy-800">
                  {def.label} <span className="text-red-500">*</span>
                </label>
                <input
                  type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'}
                  value={metadata[fieldKey] || ''}
                  onChange={e => {
                    setMetadata({ ...metadata, [fieldKey]: e.target.value })
                    if (errors[fieldKey]) setErrors({ ...errors, [fieldKey]: '' })
                  }}
                  placeholder={`请输入${def.label}`}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors',
                    hasError
                      ? 'border-2 border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50'
                      : 'border border-navy-200 focus:border-mint-400 focus:ring-mint-100 bg-white'
                  )}
                />
                {hasError && <p className="text-xs text-red-500">{errors[fieldKey]}</p>}
              </div>
            )
          })}

          {optionalFields.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-dashed border-navy-200">
              <p className="text-xs font-medium text-navy-400 flex items-center gap-1">
                <Info size={12} />
                以下为选填项（有助于更准确的赔偿估算）
              </p>
              {optionalFields.map(fieldKey => {
                const def = metadataLabels[fieldKey] || { label: fieldKey }
                if (def.type === 'select') {
                  return (
                    <div key={fieldKey} className="space-y-1.5">
                      <label className="block text-sm font-medium text-navy-600">
                        {def.label} <span className="text-navy-400 text-xs">（选填）</span>
                      </label>
                      <select
                        value={metadata[fieldKey] || ''}
                        onChange={e => setMetadata({ ...metadata, [fieldKey]: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl text-sm border border-navy-200 focus:border-mint-400 focus:ring-2 focus:ring-mint-100 bg-white focus:outline-none transition-colors"
                      >
                        <option value="">请选择{def.label}</option>
                        {def.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  )
                }
                const inputType = def.type === 'number' ? 'number' : (def.type === 'date' ? 'date' : 'text')
                return (
                  <div key={fieldKey} className="space-y-1.5">
                    <label className="block text-sm font-medium text-navy-600">
                      {def.label} <span className="text-navy-400 text-xs">（选填）</span>
                    </label>
                    <input
                      type={inputType}
                      value={metadata[fieldKey] || ''}
                      onChange={e => setMetadata({ ...metadata, [fieldKey]: e.target.value })}
                      placeholder={`请输入${def.label}`}
                      className="w-full px-4 py-2.5 rounded-xl text-sm border border-navy-200 focus:border-mint-400 focus:ring-2 focus:ring-mint-100 bg-white focus:outline-none transition-colors"
                    />
                  </div>
                )
              })}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-navy-800">
              备注说明
              {action.requiresRemark && <span className="text-red-500 ml-1">*</span>}
              {!action.requiresRemark && <span className="text-xs font-normal text-navy-400 ml-1">（可选）</span>}
            </label>
            <textarea
              value={remark}
              onChange={e => {
                setRemark(e.target.value)
                if (errors.remark) setErrors({ ...errors, remark: '' })
              }}
              rows={action.requiresRemark ? 4 : 3}
              placeholder={action.requiresRemark
                ? '请详细填写本次操作的说明信息（如操作人、核对结果、特殊情况等）...'
                : '可选：添加本次操作的备注信息'
              }
              className={cn(
                'w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 transition-colors',
                errors.remark
                  ? 'border-2 border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50'
                  : action.requiresRemark
                    ? 'border-2 border-mint-200 focus:border-mint-400 focus:ring-mint-100 bg-mint-50/30'
                    : 'border border-navy-200 focus:border-mint-400 focus:ring-mint-100 bg-white'
              )}
            />
            {errors.remark && <p className="text-xs text-red-500">{errors.remark}</p>}
            {action.requiresRemark && !errors.remark && (
              <p className="text-xs text-mint-600 flex items-center gap-1">
                <CheckCircle2 size={12} /> 请填写操作说明以便后续追溯
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-navy-100 bg-navy-50/30 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-5 py-3 rounded-xl border border-navy-200 text-navy-700 hover:bg-white text-sm font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className={cn(
              'flex-1 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-lg active:scale-[0.98]',
              styleClasses[action.buttonStyle]
            )}
          >
            {isDanger ? '⚠️ 确认执行' : isWarning ? '↩️ 确认退回' : '✓ 提交并确认'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentOrder, fetchOrderDetail, performAction } = useAppStore()
  const [dialogAction, setDialogAction] = useState<AvailableAction | null>(null)

  useEffect(() => {
    if (id) fetchOrderDetail(id)
  }, [id, fetchOrderDetail])

  if (!currentOrder) {
    return <div className="text-center py-10 text-navy-400">加载中...</div>
  }

  const order = currentOrder
  const currentStatusIdx = statusTimeline.indexOf(order.status)
  const isCancelled = order.status === 'cancelled'

  const primaryActions = order.availableActions.filter(a => a.category === 'status_primary')
  const rollbackActions = order.availableActions.filter(a => a.category === 'status_rollback')
  const businessActions = order.availableActions.filter(a => a.category === 'business')
  const noteActions = order.availableActions.filter(a => a.category === 'note')
  const compensationActions = order.availableActions.filter(a => a.category === 'compensation')

  const handleActionClick = (action: AvailableAction) => {
    setDialogAction(action)
  }

  const handleExecute = async (code: string, data: Partial<PerformActionRequest>) => {
    if (!id) return
    try {
      await performAction(id, { code, operator: '店员', ...data })
      setDialogAction(null)
    } catch (err: any) {
      alert(err.message || '操作失败')
    }
  }

  const getHistoryIcon = (item: StatusChange) => {
    const Icon = iconMap[item.actionCode]
    if (Icon) return Icon
    if (item.actionCategory === 'status_primary') return CheckCircle2
    if (item.actionCategory === 'status_rollback') return RotateCcw
    if (item.actionCategory === 'note') return MessageSquare
    return FileText
  }

  const getHistoryDotColor = (item: StatusChange) => {
    if (item.actionCategory === 'status_primary') return 'bg-mint-400 text-white'
    if (item.actionCategory === 'status_rollback') return 'bg-amber-400 text-white'
    if (item.actionCategory === 'business') return 'bg-navy-500 text-white'
    if (item.actionCategory === 'compensation') return 'bg-rose-500 text-white'
    return 'bg-navy-200 text-navy-600'
  }

  const renderMetadata = (metadata?: Record<string, any>) => {
    if (!metadata || Object.keys(metadata).length === 0) return null
    return (
      <div className="mt-2 space-y-1">
        {Object.entries(metadata).map(([k, v]) => {
          const label = metadataLabels[k]?.label || k
          const def = metadataLabels[k]
          let displayValue = String(v)
          if (def?.type === 'select' && def.options) {
            const found = def.options.find(o => o.value === String(v))
            if (found) displayValue = found.label
          }
          return (
            <div key={k} className="text-xs text-navy-500 flex gap-2">
              <span className="text-navy-400">{label}:</span>
              <span className="font-medium text-navy-600">{displayValue}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const renderActionButton = (action: AvailableAction) => {
    const Icon = iconMap[action.code] || FileText
    return (
      <button
        key={action.code}
        onClick={() => handleActionClick(action)}
        title={action.description}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]',
          styleClasses[action.buttonStyle]
        )}
      >
        <Icon size={16} />
        <span>{action.name}</span>
      </button>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-navy-500 hover:text-navy-700 text-sm mb-4 transition-colors">
        <ArrowLeft size={16} /> 返回
      </button>

      <div className="bg-white rounded-xl border border-navy-100 p-6 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="font-serif text-lg font-semibold text-navy-800">{order.orderNumber}</h1>
            <p className="text-xs text-navy-400 mt-0.5">创建于 {new Date(order.createdAt).toLocaleString('zh-CN')}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
          <div className="flex items-center gap-2 text-navy-500">
            <User size={14} strokeWidth={2} />
            <span className="text-navy-400">客户：</span>
            <span className="text-navy-700">{order.customerName}</span>
          </div>
          <div className="flex items-center gap-2 text-navy-500">
            <Phone size={14} strokeWidth={2} />
            <span className="text-navy-400">电话：</span>
            <span className="text-navy-700">{order.customerPhone}</span>
          </div>
          {order.customerAddress && (
            <div className="flex items-center gap-2 text-navy-500 sm:col-span-2">
              <MapPin size={14} strokeWidth={2} />
              <span className="text-navy-400">地址：</span>
              <span className="text-navy-700">{order.customerAddress}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-navy-500">
            {order.pickupMethod === 'self' ? <User size={14} strokeWidth={2} /> : <Truck size={14} strokeWidth={2} />}
            <span className="text-navy-400">取送方式：</span>
            <span className="text-navy-700">{order.pickupMethod === 'self' ? '自送自提' : '上门取送'}</span>
          </div>
          <div className="flex items-center gap-2 text-navy-500">
            <Clock size={14} strokeWidth={2} />
            <span className="text-navy-400">更新时间：</span>
            <span className="text-navy-700">{new Date(order.updatedAt).toLocaleString('zh-CN')}</span>
          </div>
        </div>
        {order.remark && (
          <div className="mt-3 text-sm text-navy-600 bg-navy-50/70 rounded-lg px-3 py-2.5 border border-navy-100">
            <span className="text-navy-400">客户备注：</span>{order.remark}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-navy-100 p-6 mb-4 shadow-sm">
        <h2 className="font-medium text-navy-700 mb-4 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-mint-500" />
          订单状态进度
        </h2>
        <div className="flex flex-wrap gap-2 mb-5">
          {statusTimeline.map((s, idx) => {
            const reached = isCancelled
              ? (idx <= currentStatusIdx && currentStatusIdx >= 0)
              : idx <= currentStatusIdx
            const isCurrent = s === order.status
            return (
              <div key={s} className="flex items-center flex-1 min-w-[80px]">
                <div className="flex flex-col items-center flex-1">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                    isCurrent
                      ? 'bg-mint-400 text-navy-900 ring-4 ring-mint-100'
                      : reached
                        ? 'bg-mint-100 text-mint-600'
                        : 'bg-navy-50 text-navy-300'
                  )}>
                    {reached ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </div>
                  <div className={cn(
                    'text-xs mt-1.5 font-medium text-center',
                    isCurrent ? 'text-mint-600' : reached ? 'text-navy-700' : 'text-navy-300'
                  )}>
                    {statusLabels[s]}
                  </div>
                </div>
                {idx < statusTimeline.length - 1 && (
                  <div className={cn(
                    'h-0.5 flex-1 mx-1 mb-4',
                    reached && idx < currentStatusIdx ? 'bg-mint-300' : 'bg-navy-100'
                  )} />
                )}
              </div>
            )
          })}
        </div>
        {isCancelled && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-100 text-red-700 text-sm">
            <XCircle size={16} /> 订单已取消
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-navy-100 p-6 mb-4 shadow-sm">
        <h2 className="font-medium text-navy-700 mb-3 flex items-center gap-2">
          <ClipboardList size={18} className="text-navy-500" />
          费用明细
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50/60">
              <tr>
                <th className="text-left px-3 py-2.5 text-navy-600 font-medium rounded-l-lg">类型</th>
                <th className="text-left px-3 py-2.5 text-navy-600 font-medium">项目</th>
                <th className="text-center px-3 py-2.5 text-navy-600 font-medium">数量</th>
                <th className="text-right px-3 py-2.5 text-navy-600 font-medium">单价</th>
                <th className="text-right px-3 py-2.5 text-navy-600 font-medium rounded-r-lg">小计</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(item => (
                <tr key={`svc-${item.serviceId}`} className="border-t border-navy-50">
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">服务</span>
                  </td>
                  <td className="px-3 py-2.5 text-navy-700">{item.serviceName}</td>
                  <td className="text-center px-3 py-2.5 text-navy-700">{item.quantity}</td>
                  <td className="text-right px-3 py-2.5 text-navy-600">¥{item.unitPrice.toFixed(2)}</td>
                  <td className="text-right px-3 py-2.5 font-medium text-navy-800">¥{item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
              {order.packages && order.packages.map(pkg => (
                <tr key={`pkg-${pkg.packageId}`} className="border-t border-navy-50">
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600">套餐</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-navy-700">{pkg.packageName}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pkg.items.map((pi, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-navy-50 text-navy-400">
                          {pi.productName}×{pi.quantity}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-center px-3 py-2.5 text-navy-700">{pkg.quantity}</td>
                  <td className="text-right px-3 py-2.5 text-navy-600">
                    ¥{pkg.unitPrice.toFixed(2)}
                    {pkg.unitPrice === 0 && <span className="ml-1 text-[10px] text-emerald-500">免费</span>}
                  </td>
                  <td className="text-right px-3 py-2.5 font-medium text-navy-800">¥{pkg.subtotal.toFixed(2)}</td>
                </tr>
              ))}
              {order.products && order.products.map(product => (
                <tr key={`prod-${product.productId}`} className="border-t border-navy-50">
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-600">产品</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-navy-700">{product.productName}</span>
                      {product.unitPrice === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">免费</span>
                      )}
                    </div>
                  </td>
                  <td className="text-center px-3 py-2.5 text-navy-700">{product.quantity}</td>
                  <td className="text-right px-3 py-2.5 text-navy-600">¥{product.unitPrice.toFixed(2)}</td>
                  <td className="text-right px-3 py-2.5 font-medium text-navy-800">¥{product.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-navy-100 mt-3 pt-3 space-y-2">
          <div className="flex justify-end text-xs text-navy-400 gap-4">
            {order.serviceTotal > 0 && <span>服务 ¥{order.serviceTotal.toFixed(2)}</span>}
            {order.packageTotal > 0 && <span>套餐 ¥{order.packageTotal.toFixed(2)}</span>}
            {order.productTotal > 0 && <span>产品 ¥{order.productTotal.toFixed(2)}</span>}
          </div>
          <div className="flex items-end justify-between">
            <span className="text-xs text-navy-400">共 {order.items.reduce((s, i) => s + i.quantity, 0)} 件服务{(order.products?.length ?? 0) > 0 ? ` + ${order.products.reduce((s, p) => s + p.quantity, 0)} 份产品` : ''}{(order.packages?.length ?? 0) > 0 ? ` + ${order.packages.reduce((s, p) => s + p.quantity, 0)} 个套餐` : ''}</span>
            <div className="text-right">
              <span className="text-xs text-navy-400 mr-2">合计金额</span>
              <span className="text-xl font-semibold text-navy-800">¥{order.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {order.damageReports && order.damageReports.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-6 mb-4 shadow-sm">
          <h2 className="font-medium text-navy-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            损坏报告
            <span className="ml-auto text-xs font-normal text-navy-400">共 {order.damageReports.length} 条</span>
          </h2>
          <div className="space-y-3">
            {order.damageReports.map((report: DamageReport) => (
              <div key={report.id} className={cn(
                'rounded-xl p-4 border',
                report.isResolved
                  ? report.resolutionType === 'closed_no_responsibility'
                    ? 'bg-blue-50/30 border-blue-100'
                    : 'bg-gray-50/30 border-gray-200'
                  : 'bg-amber-50/50 border-amber-100'
              )}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                      {damageTypeLabels[report.damageType] || report.damageType}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      report.severity === 'minor' ? 'bg-green-100 text-green-700' :
                      report.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    )}>
                      {damageSeverityLabels[report.severity] || report.severity}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      responsibilityPartyColors[report.responsibilityParty] || 'bg-gray-100 text-gray-700'
                    )}>
                      {responsibilityPartyLabels[report.responsibilityParty] || report.responsibilityParty}
                    </span>
                    {report.isResolved && report.resolutionType && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                        {resolutionTypeLabels[report.resolutionType] || report.resolutionType}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-navy-400">
                    {new Date(report.reportedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <p className="text-sm text-navy-600 mb-2">{report.description}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {report.originalValue != null && (
                    <div className="flex items-center gap-1 text-navy-500">
                      <DollarSign size={12} />
                      <span>衣物原值：</span>
                      <span className="font-medium text-navy-700">¥{report.originalValue.toFixed(2)}</span>
                    </div>
                  )}
                  {report.purchaseDate && (
                    <div className="flex items-center gap-1 text-navy-500">
                      <Clock size={12} />
                      <span>购买日期：</span>
                      <span className="font-medium text-navy-700">{report.purchaseDate}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-navy-500">
                    <User size={12} />
                    <span>登记人：</span>
                    <span className="font-medium text-navy-700">{report.reportedBy}</span>
                  </div>
                </div>
                {report.isResolved && report.resolutionRemark && (
                  <div className="mt-2 pt-2 border-t border-emerald-100 text-xs text-navy-500">
                    <span>处理说明：</span>{report.resolutionRemark}
                  </div>
                )}
                {report.remark && !report.isResolved && (
                  <div className="mt-2 pt-2 border-t border-amber-100 text-xs text-navy-500">
                    <span>备注：</span>{report.remark}
                  </div>
                )}
                {report.responsibilityParty && report.responsibilityParty !== 'store' && report.responsibilityParty !== 'unknown' && !report.isResolved && (
                  <div className="mt-2 pt-2 border-t border-blue-100 bg-blue-50/50 rounded-b-lg px-2 py-1.5 flex items-center gap-1.5 text-xs text-blue-700">
                    <Info size={12} className="shrink-0" />
                    <span>非门店责任：可使用「非门店责任关闭」操作免于赔付，异常记录将保留</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {order.compensationRecords && order.compensationRecords.length > 0 && (
        <div className="bg-white rounded-xl border border-rose-200 p-6 mb-4 shadow-sm">
          <h2 className="font-medium text-navy-700 mb-4 flex items-center gap-2">
            <BadgeDollarSign size={18} className="text-rose-500" />
            赔偿记录
            <span className="ml-auto text-xs font-normal text-navy-400">共 {order.compensationRecords.length} 条</span>
          </h2>
          <div className="space-y-3">
            {order.compensationRecords.map((record: CompensationRecord) => (
              <div key={record.id} className="bg-rose-50/30 border border-rose-100 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium',
                      record.status === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                      record.status === 'approved' ? 'bg-green-100 text-green-700' :
                      record.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-navy-100 text-navy-700'
                    )}>
                      {compensationStatusLabels[record.status] || record.status}
                    </span>
                    <span className="text-2xl font-bold text-rose-600">
                      ¥{record.amount.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-xs text-navy-400">
                    申请时间：{new Date(record.appliedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-navy-400">赔偿方式</span>
                    <p className="font-medium text-navy-700 flex items-center gap-1">
                      <CreditCard size={12} />
                      {compensationMethodLabels[record.compensationMethod] || record.compensationMethod}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-navy-400">赔偿比例</span>
                    <p className="font-medium text-navy-700">{Math.round(record.standardRate * 100)}%</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-navy-400">折旧后价值</span>
                    <p className="font-medium text-navy-700">¥{record.appliedValue.toFixed(2)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-navy-400">申请人</span>
                    <p className="font-medium text-navy-700">{record.applicant}</p>
                  </div>
                </div>
                {record.reviewer && (
                  <div className="mt-3 pt-3 border-t border-rose-100 grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-navy-400">审核人</span>
                      <p className="font-medium text-navy-700">{record.reviewer}</p>
                    </div>
                    {record.reviewedAt && (
                      <div className="space-y-0.5">
                        <span className="text-navy-400">审核时间</span>
                        <p className="font-medium text-navy-700">{new Date(record.reviewedAt).toLocaleString('zh-CN')}</p>
                      </div>
                    )}
                    {record.reviewRemark && (
                      <div className="col-span-2 space-y-0.5">
                        <span className="text-navy-400">审核意见</span>
                        <p className="text-navy-600">{record.reviewRemark}</p>
                      </div>
                    )}
                  </div>
                )}
                {record.payer && (
                  <div className="mt-3 pt-3 border-t border-rose-100 grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-navy-400">赔付人</span>
                      <p className="font-medium text-navy-700">{record.payer}</p>
                    </div>
                    {record.paidAt && (
                      <div className="space-y-0.5">
                        <span className="text-navy-400">赔付时间</span>
                        <p className="font-medium text-navy-700">{new Date(record.paidAt).toLocaleString('zh-CN')}</p>
                      </div>
                    )}
                    {record.paidProof && (
                      <div className="col-span-2 space-y-0.5">
                        <span className="text-navy-400">支付凭证</span>
                        <p className="text-navy-600">{record.paidProof}</p>
                      </div>
                    )}
                  </div>
                )}
                {record.remark && (
                  <div className="mt-3 pt-2 border-t border-rose-100 text-xs text-navy-500">
                    <span>备注：</span>{record.remark}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(primaryActions.length > 0 || rollbackActions.length > 0 || businessActions.length > 0 || noteActions.length > 0 || compensationActions.length > 0) && (
        <div className="bg-white rounded-xl border border-navy-100 p-6 mb-4 shadow-sm">
          <h2 className="font-medium text-navy-700 mb-4 flex items-center gap-2">
            <Wrench size={18} className="text-navy-500" />
            可用操作
          </h2>
          <div className="space-y-4">
            {primaryActions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-navy-500 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-mint-400" /> {categoryLabels.status_primary}
                </p>
                <div className="flex flex-wrap gap-2">
                  {primaryActions.map(renderActionButton)}
                </div>
              </div>
            )}
            {rollbackActions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-600 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> {categoryLabels.status_rollback}
                </p>
                <div className="flex flex-wrap gap-2">
                  {rollbackActions.map(renderActionButton)}
                </div>
              </div>
            )}
            {compensationActions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-rose-600 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> {categoryLabels.compensation}
                </p>
                <div className="flex flex-wrap gap-2">
                  {compensationActions.map(renderActionButton)}
                </div>
              </div>
            )}
            {businessActions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-navy-500 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-navy-500" /> {categoryLabels.business}
                </p>
                <div className="flex flex-wrap gap-2">
                  {businessActions.map(renderActionButton)}
                </div>
              </div>
            )}
            {noteActions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-navy-400 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-navy-300" /> {categoryLabels.note}
                </p>
                <div className="flex flex-wrap gap-2">
                  {noteActions.map(renderActionButton)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-navy-100 p-6 shadow-sm">
        <h2 className="font-medium text-navy-700 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-navy-500" />
          操作溯源记录
          <span className="ml-auto text-xs font-normal text-navy-400">共 {order.statusHistory.length} 条</span>
        </h2>
        <div className="space-y-0">
          {order.statusHistory.slice().reverse().map((item, idx, arr) => {
            const Icon = getHistoryIcon(item)
            const isLast = idx === arr.length - 1
            return (
              <div key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center z-10 shrink-0',
                    getHistoryDotColor(item)
                  )}>
                    <Icon size={16} />
                  </div>
                  {!isLast && <div className="w-0.5 flex-1 bg-navy-100" />}
                </div>
                <div className={cn('flex-1 pb-5', isLast && 'pb-0')}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-navy-800">{item.actionName}</span>
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          item.actionCategory === 'status_primary' ? 'bg-mint-50 text-mint-600'
                            : item.actionCategory === 'status_rollback' ? 'bg-amber-50 text-amber-600'
                            : item.actionCategory === 'business' ? 'bg-navy-50 text-navy-600'
                            : item.actionCategory === 'compensation' ? 'bg-rose-50 text-rose-600'
                            : 'bg-navy-50 text-navy-500'
                        )}>
                          {categoryLabels[item.actionCategory]}
                        </span>
                        {item.fromStatus && (
                          <span className="text-[10px] text-navy-400">
                            {statusLabels[item.fromStatus]} → {statusLabels[item.status]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-navy-400">
                        <span className="flex items-center gap-1">
                          <User size={11} /> {item.operator || '系统'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {new Date(item.timestamp).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {item.remark && (
                    <div className="mt-2 text-sm text-navy-600 bg-navy-50/60 rounded-lg px-3 py-2 border border-navy-100/60">
                      <span className="text-navy-400 text-xs">备注：</span>
                      {item.remark}
                    </div>
                  )}
                  {renderMetadata(item.metadata)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {dialogAction && (
        <ActionDialog
          action={dialogAction}
          order={order}
          currentOrderStatus={order.status}
          onClose={() => setDialogAction(null)}
          onConfirm={(data) => handleExecute(dialogAction.code, data)}
        />
      )}
    </div>
  )
}
