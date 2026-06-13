import { useState } from 'react'
import { AlertTriangle, Scale, Calculator, Clock, FileText, Shield, ChevronDown, ChevronUp, Info, UserCheck } from 'lucide-react'
import { COMPENSATION_RULES, calculateDepreciatedValue, calculateCompensationAmount, damageTypeLabels, damageSeverityLabels, responsibilityPartyLabels } from '../../shared/workflow'
import type { DamageType, DamageSeverity, ResponsibilityParty } from '../../shared/types'
import { cn } from '@/lib/utils'

export default function CompensationStandard() {
  const [expandedType, setExpandedType] = useState<DamageType | null>('discoloration')
  const [calcOriginalValue, setCalcOriginalValue] = useState<number>(1000)
  const [calcPurchaseDate, setCalcPurchaseDate] = useState<string>('2024-01-01')
  const [calcDamageType, setCalcDamageType] = useState<DamageType>('discoloration')
  const [calcSeverity, setCalcSeverity] = useState<DamageSeverity>('moderate')

  const damageTypes = Object.keys(COMPENSATION_RULES) as DamageType[]

  const calcResult = calculateCompensationAmount(
    calcOriginalValue,
    calcPurchaseDate,
    calcDamageType,
    calcSeverity,
  )

  const depreciatedValue = calculateDepreciatedValue(calcOriginalValue, calcPurchaseDate)

  const currentRule = COMPENSATION_RULES[calcDamageType]
  const currentStandard = currentRule.standards[calcSeverity]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-navy-800 flex items-center gap-2">
          <Scale className="text-mint-500" size={28} />
          洗衣损坏赔偿标准
        </h1>
        <p className="text-sm text-navy-500 mt-2">为保障客户权益，规范衣物损坏赔偿处理，特制定本赔偿标准</p>
      </div>

      <div className="bg-gradient-to-r from-mint-50 to-emerald-50 border border-mint-200 rounded-xl p-5 mb-6">
        <h2 className="font-medium text-navy-800 mb-3 flex items-center gap-2">
          <Shield size={20} className="text-mint-600" />
          赔偿原则
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-white/70 rounded-lg px-4 py-3">
            <p className="font-medium text-navy-700">依法依规</p>
            <p className="text-xs text-navy-500 mt-1">依据《消费者权益保护法》及行业规范执行</p>
          </div>
          <div className="bg-white/70 rounded-lg px-4 py-3">
            <p className="font-medium text-navy-700">折旧计算</p>
            <p className="text-xs text-navy-500 mt-1">按使用年限折旧，年折旧率10%，最高折旧80%</p>
          </div>
          <div className="bg-white/70 rounded-lg px-4 py-3">
            <p className="font-medium text-navy-700">分级赔偿</p>
            <p className="text-xs text-navy-500 mt-1">根据损坏类型和严重程度分级确定赔偿比例</p>
          </div>
          <div className="bg-white/70 rounded-lg px-4 py-3">
            <p className="font-medium text-navy-700">限额赔付</p>
            <p className="text-xs text-navy-500 mt-1">各类型损坏设有最高赔偿限额，详见下表</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 p-5 mb-6 shadow-sm">
        <h2 className="font-medium text-navy-800 mb-4 flex items-center gap-2">
          <Calculator size={20} className="text-navy-500" />
          赔偿金额计算器
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">衣物原值（元）</label>
            <input
              type="number"
              value={calcOriginalValue}
              onChange={e => setCalcOriginalValue(Number(e.target.value) || 0)}
              className="w-full px-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:border-mint-400 focus:ring-2 focus:ring-mint-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">购买日期</label>
            <input
              type="date"
              value={calcPurchaseDate}
              onChange={e => setCalcPurchaseDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:border-mint-400 focus:ring-2 focus:ring-mint-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">损坏类型</label>
            <select
              value={calcDamageType}
              onChange={e => setCalcDamageType(e.target.value as DamageType)}
              className="w-full px-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:border-mint-400 focus:ring-2 focus:ring-mint-100"
            >
              {damageTypes.map(type => (
                <option key={type} value={type}>{damageTypeLabels[type]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">损坏程度</label>
            <select
              value={calcSeverity}
              onChange={e => setCalcSeverity(e.target.value as DamageSeverity)}
              className="w-full px-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:border-mint-400 focus:ring-2 focus:ring-mint-100"
            >
              <option value="minor">轻微</option>
              <option value="moderate">中度</option>
              <option value="severe">严重</option>
            </select>
          </div>
        </div>

        <div className="bg-navy-50 rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-navy-500 mb-1">衣物原值</p>
              <p className="text-lg font-semibold text-navy-800">¥{calcOriginalValue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-navy-500 mb-1">折旧后价值</p>
              <p className="text-lg font-semibold text-amber-600">¥{depreciatedValue.toFixed(2)}</p>
              <p className="text-[10px] text-navy-400">
                折旧 {Math.round((1 - depreciatedValue / calcOriginalValue) * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-navy-500 mb-1">赔偿比例范围</p>
              <p className="text-lg font-semibold text-navy-700">
                {Math.round(currentStandard.minRate * 100)}%-{Math.round(currentStandard.maxRate * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-navy-500 mb-1">预估赔偿金额</p>
              <p className="text-xl font-bold text-rose-600">¥{calcResult.amount.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-navy-200">
            <div className="flex items-center gap-2 text-xs text-navy-500">
              <Info size={14} />
              <span>赔偿金额范围：¥{calcResult.minAmount.toFixed(2)} ~ ¥{calcResult.maxAmount.toFixed(2)}</span>
              {currentRule.maxAmount && (
                <span className="text-amber-600">（最高限额 ¥{currentRule.maxAmount}）</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-navy-100">
          <h2 className="font-medium text-navy-800 flex items-center gap-2">
            <FileText size={20} className="text-navy-500" />
            各类损坏赔偿标准明细
          </h2>
        </div>

        <div className="divide-y divide-navy-100">
          {damageTypes.map(type => {
            const rule = COMPENSATION_RULES[type]
            const isExpanded = expandedType === type
            return (
              <div key={type}>
                <button
                  onClick={() => setExpandedType(isExpanded ? null : type)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-navy-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      type === 'tear' ? 'bg-red-50 text-red-500' :
                      type === 'stain' ? 'bg-amber-50 text-amber-500' :
                      type === 'discoloration' ? 'bg-purple-50 text-purple-500' :
                      type === 'shrinkage' ? 'bg-blue-50 text-blue-500' :
                      type === 'deformation' ? 'bg-indigo-50 text-indigo-500' :
                      type === 'missing' ? 'bg-rose-50 text-rose-500' :
                      type === 'accessory_damage' ? 'bg-orange-50 text-orange-500' :
                      'bg-gray-50 text-gray-500'
                    )}>
                      <AlertTriangle size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-navy-800">{damageTypeLabels[type]}</p>
                      <p className="text-xs text-navy-400">
                        最高赔偿 ¥{rule.maxAmount ?? '不限'}
                        {rule.requirePurchaseProof && ' · 需购买凭证'}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={20} className="text-navy-400" />
                  ) : (
                    <ChevronDown size={20} className="text-navy-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5">
                    <div className="bg-navy-50 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-navy-100/50">
                            <th className="text-left px-4 py-2.5 text-navy-600 font-medium">损坏程度</th>
                            <th className="text-left px-4 py-2.5 text-navy-600 font-medium">说明</th>
                            <th className="text-center px-4 py-2.5 text-navy-600 font-medium">赔偿比例</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-navy-100">
                          {(['minor', 'moderate', 'severe'] as DamageSeverity[]).map(severity => {
                            const std = rule.standards[severity]
                            return (
                              <tr key={severity}>
                                <td className="px-4 py-3">
                                  <span className={cn(
                                    'px-2 py-0.5 rounded text-xs font-medium',
                                    severity === 'minor' ? 'bg-green-100 text-green-700' :
                                    severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                                    'bg-red-100 text-red-700'
                                  )}>
                                    {damageSeverityLabels[severity]}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-navy-600">{std.description}</td>
                                <td className="px-4 py-3 text-center font-medium text-navy-800">
                                  {Math.round(std.minRate * 100)}% - {Math.round(std.maxRate * 100)}%
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-3 flex items-start gap-2 text-xs text-navy-500">
                      <Clock size={14} className="shrink-0 mt-0.5" />
                      <span>
                        年折旧率 {rule.depreciationRatePerYear ? Math.round(rule.depreciationRatePerYear * 100) : 0}%，
                        最高折旧 80%。赔偿金额 = 折旧后价值 × 赔偿比例，且不超过最高赔偿限额。
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
          <AlertTriangle size={18} />
          赔偿流程说明
        </h3>
        <div className="space-y-2 text-sm text-amber-700">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <span><strong>发现损坏：</strong>在收衣、洗涤或质检过程中发现衣物损坏，立即登记损坏报告</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <span><strong>责任认定：</strong>明确损坏责任归属（门店/客户/双方/第三方），选择对应责任方</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <span><strong>门店责任：</strong>核实损坏情况，确认衣物原值、购买日期，按赔偿标准发起赔偿</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">4</span>
            <span><strong>审核赔付：</strong>赔偿申请审核通过后，按约定方式赔付客户</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">5</span>
            <span><strong>结案归档：</strong>赔偿完成后记录支付凭证，订单结案归档</span>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
          <UserCheck size={18} />
          责任归属与免赔付说明
        </h3>
        <div className="space-y-3 text-sm text-blue-700">
          <p>
            登记异常时必须选择<strong>责任归属</strong>，不同责任方对应不同处理方式：
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.entries(responsibilityPartyLabels) as [ResponsibilityParty, string][]).map(([key, label]) => (
              <div key={key} className={cn(
                'rounded-lg px-3 py-2',
                key === 'store' ? 'bg-rose-50 border border-rose-200' :
                key === 'customer' ? 'bg-blue-100/50 border border-blue-200' :
                key === 'both' ? 'bg-purple-50 border border-purple-200' :
                key === 'unknown' ? 'bg-gray-50 border border-gray-200' :
                'bg-orange-50 border border-orange-200'
              )}>
                <p className="font-medium text-navy-800">{label}</p>
                <p className="text-xs mt-0.5">
                  {key === 'store' && '需按赔偿标准赔付'}
                  {key === 'customer' && '可「非门店责任关闭」，保留异常记录'}
                  {key === 'both' && '协商处理，可部分赔偿或免赔偿'}
                  {key === 'unknown' && '待进一步调查确认，后续可更新责任认定'}
                  {key === 'third_party' && '可「非门店责任关闭」，保留异常记录'}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-start gap-2 text-xs text-blue-600">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>非门店责任时选择「非门店责任关闭」操作，订单可回到正常流程，异常记录仍保留备查。如责任认定有误，可随时「更新责任认定」。</span>
          </div>
        </div>
      </div>
    </div>
  )
}
