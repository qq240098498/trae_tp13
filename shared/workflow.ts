import type { OrderStatus, PickupMethod, AvailableAction, ActionCategory, DamageType, DamageSeverity, CompensationStatus, CompensationMethod } from './types'

export { }

export const statusLabels: Record<OrderStatus, string> = {
  pending: '待处理',
  accepted: '已接单',
  washing: '洗涤中',
  inspecting: '质检中',
  completed: '已完成',
  picked_up: '已取衣',
  cancelled: '已取消',
  damaged: '已损坏',
  compensating: '赔偿中',
  compensated: '已赔偿',
}

export const actionCategoryLabels: Record<ActionCategory, string> = {
  status_primary: '状态流转',
  status_rollback: '状态回退',
  business: '业务操作',
  note: '备注记录',
  compensation: '赔偿操作',
}

export const damageTypeLabels: Record<DamageType, string> = {
  tear: '破损撕裂',
  stain: '顽固污渍',
  discoloration: '染色串色',
  shrinkage: '缩水',
  deformation: '变形',
  missing: '衣物丢失',
  accessory_damage: '配件损坏',
  other: '其他损坏',
}

export const damageSeverityLabels: Record<DamageSeverity, string> = {
  minor: '轻微',
  moderate: '中度',
  severe: '严重',
}

export const compensationStatusLabels: Record<CompensationStatus, string> = {
  pending_review: '待审核',
  approved: '审核通过',
  rejected: '审核拒绝',
  paid: '已赔付',
  closed: '已关闭',
}

export const compensationMethodLabels: Record<CompensationMethod, string> = {
  refund: '原路退款',
  cash: '现金赔付',
  transfer: '转账赔付',
  service_voucher: '服务券抵扣',
}

export const COMPENSATION_RULES: Record<DamageType, {
  standards: Record<DamageSeverity, { minRate: number; maxRate: number; description: string }>
  maxAmount?: number
  depreciationRatePerYear?: number
  requirePurchaseProof?: boolean
}> = {
  tear: {
    standards: {
      minor: { minRate: 0.10, maxRate: 0.20, description: '小范围撕裂，可修复' },
      moderate: { minRate: 0.20, maxRate: 0.50, description: '明显撕裂，影响外观' },
      severe: { minRate: 0.50, maxRate: 0.80, description: '大面积撕裂，无法修复' },
    },
    maxAmount: 2000,
    depreciationRatePerYear: 0.10,
  },
  stain: {
    standards: {
      minor: { minRate: 0.05, maxRate: 0.15, description: '局部污渍，可处理' },
      moderate: { minRate: 0.15, maxRate: 0.40, description: '明显污渍，处理后有痕迹' },
      severe: { minRate: 0.40, maxRate: 0.70, description: '顽固污渍，无法去除' },
    },
    maxAmount: 1500,
    depreciationRatePerYear: 0.10,
  },
  discoloration: {
    standards: {
      minor: { minRate: 0.10, maxRate: 0.25, description: '轻微串色，不明显' },
      moderate: { minRate: 0.25, maxRate: 0.55, description: '明显染色，影响穿着' },
      severe: { minRate: 0.55, maxRate: 0.90, description: '严重染色，无法恢复' },
    },
    maxAmount: 2500,
    depreciationRatePerYear: 0.10,
    requirePurchaseProof: true,
  },
  shrinkage: {
    standards: {
      minor: { minRate: 0.10, maxRate: 0.25, description: '轻微缩水，仍可穿着' },
      moderate: { minRate: 0.25, maxRate: 0.50, description: '明显缩水，尺码偏小' },
      severe: { minRate: 0.50, maxRate: 0.80, description: '严重缩水，无法穿着' },
    },
    maxAmount: 2000,
    depreciationRatePerYear: 0.10,
  },
  deformation: {
    standards: {
      minor: { minRate: 0.05, maxRate: 0.20, description: '轻微变形，影响不大' },
      moderate: { minRate: 0.20, maxRate: 0.45, description: '明显变形，外观受影响' },
      severe: { minRate: 0.45, maxRate: 0.75, description: '严重变形，无法穿着' },
    },
    maxAmount: 1800,
    depreciationRatePerYear: 0.10,
  },
  missing: {
    standards: {
      minor: { minRate: 0.50, maxRate: 0.70, description: '配件丢失' },
      moderate: { minRate: 0.70, maxRate: 0.90, description: '部分衣物丢失' },
      severe: { minRate: 0.90, maxRate: 1.00, description: '整件衣物丢失' },
    },
    maxAmount: 5000,
    depreciationRatePerYear: 0.10,
    requirePurchaseProof: true,
  },
  accessory_damage: {
    standards: {
      minor: { minRate: 0.05, maxRate: 0.15, description: '小配件损坏，可替换' },
      moderate: { minRate: 0.15, maxRate: 0.35, description: '主要配件损坏' },
      severe: { minRate: 0.35, maxRate: 0.60, description: '核心配件损坏，无法替换' },
    },
    maxAmount: 1000,
    depreciationRatePerYear: 0.10,
  },
  other: {
    standards: {
      minor: { minRate: 0.05, maxRate: 0.20, description: '其他轻微损坏' },
      moderate: { minRate: 0.20, maxRate: 0.45, description: '其他中度损坏' },
      severe: { minRate: 0.45, maxRate: 0.70, description: '其他严重损坏' },
    },
    maxAmount: 1500,
    depreciationRatePerYear: 0.10,
  },
}

export function calculateDepreciatedValue(originalValue: number, purchaseDate: string, depreciationRatePerYear: number = 0.10): number {
  const purchase = new Date(purchaseDate)
  const now = new Date()
  const years = Math.max(0, (now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 365))
  const maxDepreciation = 0.80
  const depreciation = Math.min(years * depreciationRatePerYear, maxDepreciation)
  return Math.round(originalValue * (1 - depreciation) * 100) / 100
}

export function calculateCompensationAmount(
  originalValue: number,
  purchaseDate: string | undefined,
  damageType: DamageType,
  severity: DamageSeverity,
  customRate?: number,
): { amount: number; rate: number; appliedValue: number; minAmount: number; maxAmount: number } {
  const rule = COMPENSATION_RULES[damageType]
  const std = rule.standards[severity]

  let appliedValue = originalValue
  if (purchaseDate && rule.depreciationRatePerYear) {
    appliedValue = calculateDepreciatedValue(originalValue, purchaseDate, rule.depreciationRatePerYear)
  }

  const rate = customRate ?? ((std.minRate + std.maxRate) / 2)
  const clampedRate = Math.max(std.minRate, Math.min(std.maxRate, rate))

  let amount = Math.round(appliedValue * clampedRate * 100) / 100
  if (rule.maxAmount && amount > rule.maxAmount) {
    amount = rule.maxAmount
  }

  let minAmount = Math.round(appliedValue * std.minRate * 100) / 100
  let maxAmount = Math.round(appliedValue * std.maxRate * 100) / 100
  if (rule.maxAmount) {
    minAmount = Math.min(minAmount, rule.maxAmount)
    maxAmount = Math.min(maxAmount, rule.maxAmount)
  }

  return { amount, rate: clampedRate, appliedValue, minAmount, maxAmount }
}
