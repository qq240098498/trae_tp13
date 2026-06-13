import { Router, type Request, type Response } from 'express'
import { getDb, saveDb } from '../db.js'
import type { OrderStatus, PickupMethod, AvailableAction, ActionCategory, DamageReport, CompensationRecord } from '../../shared/types.js'
import { COMPENSATION_RULES, calculateCompensationAmount } from '../../shared/workflow.js'

const router = Router()

const STATUS_ACTIONS: Partial<Record<OrderStatus, AvailableAction[]>> = {
  pending: [
    { code: 'accept', name: '接单', description: '确认接单，订单进入下一阶段，请填写接单人信息', category: 'status_primary', buttonStyle: 'primary', targetStatus: 'accepted', requiresRemark: true },
    { code: 'assign_staff', name: '分配店员', description: '分配负责该订单的店员', category: 'business', buttonStyle: 'secondary', requiresMetadata: ['staffName'] },
    { code: 'contact_customer', name: '联系客户', description: '记录与客户的沟通情况', category: 'business', buttonStyle: 'outline', requiresRemark: true },
    { code: 'add_note', name: '添加备注', description: '添加订单相关备注信息', category: 'note', buttonStyle: 'outline', requiresRemark: true },
    { code: 'cancel', name: '取消订单', description: '取消该订单（仅待处理状态可取消），请填写取消原因', category: 'status_primary', buttonStyle: 'danger', targetStatus: 'cancelled', requiresRemark: true },
  ],
  accepted: [
    { code: 'start_wash', name: '开始洗涤', description: '确认衣物清点无误，开始洗涤流程，请核对衣物信息', category: 'status_primary', buttonStyle: 'primary', targetStatus: 'washing', requiresRemark: true },
    { code: 'check_clothes', name: '衣物清点', description: '登记收到的衣物数量和状态', category: 'business', buttonStyle: 'secondary', requiresMetadata: ['clothesCount'] },
    { code: 'report_damage', name: '异常登记', description: '登记衣物破损、污渍等异常情况', category: 'business', buttonStyle: 'warning', requiresRemark: true, requiresMetadata: ['damageType'] },
    { code: 'assign_station', name: '分配工位', description: '分配洗涤工位和设备', category: 'business', buttonStyle: 'outline', requiresMetadata: ['stationNo'] },
    { code: 'add_note', name: '添加备注', description: '添加订单相关备注信息', category: 'note', buttonStyle: 'outline', requiresRemark: true },
  ],
  washing: [
    { code: 'finish_wash', name: '完成洗涤', description: '洗涤完成，进入质检环节，请确认洗涤质量', category: 'status_primary', buttonStyle: 'primary', targetStatus: 'inspecting', requiresRemark: true },
    { code: 'record_process', name: '记录工艺', description: '记录使用的洗涤工艺参数', category: 'business', buttonStyle: 'secondary', requiresRemark: true, requiresMetadata: ['processType', 'temperature'] },
    { code: 'add_detergent', name: '添加助剂', description: '记录使用的洗涤剂或特殊助剂', category: 'business', buttonStyle: 'outline', requiresRemark: true },
    { code: 'report_damage', name: '异常登记', description: '洗涤过程中发现衣物损坏', category: 'compensation', buttonStyle: 'warning', requiresRemark: true, requiresMetadata: ['damageType'] },
    { code: 'add_note', name: '添加备注', description: '添加洗涤过程中的备注信息', category: 'note', buttonStyle: 'outline', requiresRemark: true },
  ],
  inspecting: [
    { code: 'pass_inspect', name: '质检通过', description: '质检合格，订单完成，请确认质检结果', category: 'status_primary', buttonStyle: 'primary', targetStatus: 'completed', requiresRemark: true },
    { code: 'fail_inspect', name: '质检不合格', description: '质检发现问题，退回重新处理', category: 'status_rollback', buttonStyle: 'warning', targetStatus: 'washing', requiresRemark: true },
    { code: 'record_defect', name: '登记瑕疵', description: '记录质检发现的瑕疵问题', category: 'business', buttonStyle: 'warning', requiresRemark: true, requiresMetadata: ['defectType'] },
    { code: 'report_damage', name: '损坏登记', description: '质检发现衣物损坏，进入赔偿流程', category: 'compensation', buttonStyle: 'danger', targetStatus: 'damaged', requiresRemark: true, requiresMetadata: ['damageType', 'severity'] },
    { code: 'add_note', name: '添加备注', description: '添加质检相关备注信息', category: 'note', buttonStyle: 'outline', requiresRemark: true },
  ],
  completed: [
    { code: 'pickup', name: '确认取衣', description: '客户已取走衣物，订单闭环，请确认取件人信息', category: 'status_primary', buttonStyle: 'primary', targetStatus: 'picked_up', requiresRemark: true },
    { code: 'issue_voucher', name: '发放取衣凭证', description: '生成并记录取衣凭证号', category: 'business', buttonStyle: 'secondary', requiresMetadata: ['voucherNo'] },
    { code: 'schedule_delivery', name: '安排配送', description: '安排上门配送时间和人员（仅限上门取送）', category: 'business', buttonStyle: 'secondary', requiresRemark: true, requiresMetadata: ['deliveryTime'] },
    { code: 'report_damage', name: '事后异常登记', description: '客户取衣后反馈衣物损坏问题', category: 'compensation', buttonStyle: 'warning', requiresRemark: true, requiresMetadata: ['damageType'] },
    { code: 'add_note', name: '添加备注', description: '添加完成后的备注信息', category: 'note', buttonStyle: 'outline', requiresRemark: true },
  ],
  damaged: [
    { code: 'apply_compensation', name: '发起赔偿申请', description: '根据损坏情况发起正式赔偿申请', category: 'compensation', buttonStyle: 'primary', targetStatus: 'compensating', requiresRemark: true, requiresMetadata: ['damageReportId', 'compensationMethod'] },
    { code: 'repair_then_return', name: '修复后继续', description: '衣物可修复，修复后继续正常流程', category: 'status_rollback', buttonStyle: 'secondary', targetStatus: 'washing', requiresRemark: true },
    { code: 'negotiate_no_comp', name: '协商免赔偿', description: '与客户协商一致，无需赔偿', category: 'compensation', buttonStyle: 'outline', targetStatus: 'completed', requiresRemark: true },
    { code: 'add_note', name: '添加备注', description: '添加损坏处理相关备注信息', category: 'note', buttonStyle: 'outline', requiresRemark: true },
  ],
  compensating: [
    { code: 'approve_compensation', name: '审核通过赔偿', description: '赔偿审核通过，准备赔付', category: 'compensation', buttonStyle: 'primary', requiresRemark: true, requiresMetadata: ['compensationRecordId', 'finalAmount'] },
    { code: 'reject_compensation', name: '审核拒绝赔偿', description: '赔偿申请不符合要求，请说明理由', category: 'compensation', buttonStyle: 'danger', targetStatus: 'damaged', requiresRemark: true, requiresMetadata: ['compensationRecordId'] },
    { code: 'confirm_payout', name: '确认赔付完成', description: '赔偿款项已支付给客户，请记录支付凭证', category: 'compensation', buttonStyle: 'success', targetStatus: 'compensated', requiresRemark: true, requiresMetadata: ['compensationRecordId', 'paidProof'] },
    { code: 'add_note', name: '添加备注', description: '添加赔偿流程相关备注信息', category: 'note', buttonStyle: 'outline', requiresRemark: true },
  ],
  compensated: [
    { code: 'complete_order', name: '完成订单', description: '赔偿完成，结束订单流程', category: 'status_primary', buttonStyle: 'primary', targetStatus: 'picked_up', requiresRemark: true },
    { code: 'add_note', name: '添加备注', description: '添加赔偿完成后的备注信息', category: 'note', buttonStyle: 'outline', requiresRemark: true },
  ],
}

function generateOrderNo(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 9000) + 1000)
  return `WD${y}${m}${d}${seq}`
}

function getAvailableActions(status: OrderStatus, pickupMethod: PickupMethod): AvailableAction[] {
  const actions = STATUS_ACTIONS[status] ?? []
  return actions.filter(a => {
    if (a.code === 'schedule_delivery' && pickupMethod !== 'delivery') {
      return false
    }
    return true
  })
}

function rowToDamageReport(row: any[]): DamageReport {
  let photos: string[] | undefined
  try {
    photos = row[9] != null ? JSON.parse(String(row[9])) : undefined
  } catch {
    photos = undefined
  }
  return {
    id: String(row[0]),
    orderId: String(row[1]),
    orderItemId: row[2] != null ? String(row[2]) : undefined,
    damageType: String(row[3]) as any,
    severity: String(row[4]) as any,
    description: String(row[5]),
    originalValue: row[6] != null ? Number(row[6]) : undefined,
    purchaseDate: row[7] != null ? String(row[7]) : undefined,
    reportedBy: String(row[8]),
    reportedAt: String(row[10]),
    photos,
    remark: row[11] != null ? String(row[11]) : undefined,
  }
}

function rowToCompensationRecord(row: any[]): CompensationRecord {
  return {
    id: String(row[0]),
    orderId: String(row[1]),
    damageReportId: String(row[2]),
    status: String(row[3]) as any,
    amount: Number(row[4]),
    compensationMethod: String(row[5]) as any,
    standardRate: Number(row[6]),
    appliedValue: Number(row[7]),
    reviewer: row[8] != null ? String(row[8]) : undefined,
    reviewedAt: row[9] != null ? String(row[9]) : undefined,
    reviewRemark: row[10] != null ? String(row[10]) : undefined,
    payer: row[11] != null ? String(row[11]) : undefined,
    paidAt: row[12] != null ? String(row[12]) : undefined,
    paidProof: row[13] != null ? String(row[13]) : undefined,
    applicant: String(row[14]),
    appliedAt: String(row[15]),
    remark: row[16] != null ? String(row[16]) : undefined,
  }
}

function rowToOrder(row: any[], items: any[] = [], history: any[] = [], damageReports: any[] = [], compensationRecords: any[] = []) {
  const status = String(row[7]) as OrderStatus
  const pickupMethod = String(row[5]) as PickupMethod
  return {
    id: String(row[0]),
    orderNumber: String(row[1]),
    customerName: String(row[2]),
    customerPhone: String(row[3]),
    customerAddress: row[4] != null ? String(row[4]) : undefined,
    pickupMethod,
    totalPrice: Number(row[6]),
    status,
    remark: row[8] != null ? String(row[8]) : undefined,
    items: items.map(ir => ({
      serviceId: String(ir[2]),
      serviceName: String(ir[3]),
      quantity: Number(ir[4]),
      unitPrice: Number(ir[5]),
      subtotal: Number(ir[6]),
    })),
    statusHistory: history.map(hr => {
      let metadata: Record<string, any> | undefined
      try {
        metadata = hr[11] != null ? JSON.parse(String(hr[11])) : undefined
      } catch {
        metadata = undefined
      }
      const actionCategory = hr[9] != null ? String(hr[9]) : 'status_primary'
      const actionCode = hr[10] != null ? String(hr[10]) : (hr[5] != null ? String(hr[5]) : '')
      return {
        id: String(hr[0]),
        status: String(hr[2]) as OrderStatus,
        timestamp: String(hr[4]),
        operator: hr[3] != null ? String(hr[3]) : undefined,
        actionCategory: actionCategory as ActionCategory,
        actionCode,
        actionName: String(hr[6]),
        remark: hr[7] != null ? String(hr[7]) : undefined,
        metadata,
        fromStatus: hr[8] != null ? String(hr[8]) as OrderStatus : undefined,
      }
    }),
    damageReports: damageReports.map(rowToDamageReport),
    compensationRecords: compensationRecords.map(rowToCompensationRecord),
    availableActions: getAvailableActions(status, pickupMethod),
    createdAt: String(row[9]),
    updatedAt: String(row[10]),
  }
}

function insertStatusRecord(
  db: any,
  orderId: number,
  status: OrderStatus,
  operator: string,
  actionCategory: ActionCategory,
  actionCode: string,
  actionName: string,
  remark?: string,
  metadata?: Record<string, any>,
  fromStatus?: OrderStatus,
) {
  const metadataStr = metadata ? JSON.stringify(metadata) : null
  const actionTypeCompat =
    actionCategory === 'status_primary' || actionCategory === 'status_rollback'
      ? 'status_change'
      : actionCategory === 'business'
        ? 'business_action'
        : 'note'
  db.run(
    'INSERT INTO status_records (order_id, status, operator, timestamp, action_type, action_name, remark, from_status, action_category, action_code, metadata) VALUES (?, ?, ?, datetime(\'now\'), ?, ?, ?, ?, ?, ?, ?)',
    [orderId, status, operator, actionTypeCompat, actionName, remark ?? null, fromStatus ?? null, actionCategory, actionCode, metadataStr],
  )
}

async function executeActionImpl(
  db: any,
  id: number,
  code: string,
  operator?: string,
  remark?: string,
  metadata?: Record<string, any>,
) {
  const existing = db.exec('SELECT * FROM orders WHERE id = ?', [id])
  if (!existing[0]) {
    throw new Error('订单不存在')
  }

  const orderRow = existing[0].values[0]
  const currentStatus = String(orderRow[7]) as OrderStatus
  const pickupMethod = String(orderRow[5]) as PickupMethod
  const orderNo = String(orderRow[1])
  const customerName = String(orderRow[2])

  const actions = getAvailableActions(currentStatus, pickupMethod)
  const action = actions.find(a => a.code === code)
  if (!action) {
    throw new Error(`当前状态下不允许执行操作: ${code}`)
  }

  if (action.requiresRemark && !remark) {
    throw new Error('该操作需要填写备注说明')
  }

  if (action.requiresMetadata) {
    const missing = action.requiresMetadata.filter(k => !metadata || metadata[k] === undefined)
    if (missing.length > 0) {
      throw new Error(`缺少必要参数: ${missing.join(', ')}`)
    }
  }

  const op = operator || '店员'
  let newStatus = currentStatus

  if (action.code === 'report_damage' && metadata?.damageType) {
    db.run(
      'INSERT INTO damage_reports (order_id, order_item_id, damage_type, severity, description, original_value, purchase_date, reported_by, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        metadata?.orderItemId ? Number(metadata.orderItemId) : null,
        String(metadata.damageType),
        String(metadata.severity ?? 'moderate'),
        String(remark ?? ''),
        metadata?.originalValue ? Number(metadata.originalValue) : null,
        metadata?.purchaseDate ?? null,
        op,
        metadata?.remark ?? null,
      ],
    )
  }

  if (action.code === 'apply_compensation' && metadata?.damageReportId) {
    const damageResult = db.exec('SELECT * FROM damage_reports WHERE id = ?', [Number(metadata.damageReportId)])
    if (!damageResult[0]?.values?.[0]) {
      throw new Error('损坏报告不存在')
    }
    const damageRow = damageResult[0].values[0]
    const damageType = String(damageRow[3]) as any
    const severity = String(damageRow[4]) as any
    const originalValue = damageRow[6] != null ? Number(damageRow[6]) : undefined
    const purchaseDate = damageRow[7] != null ? String(damageRow[7]) : undefined

    if (!originalValue) {
      throw new Error('需要先登记衣物原值才能申请赔偿')
    }

    const rule = COMPENSATION_RULES[damageType as keyof typeof COMPENSATION_RULES]
    if (rule?.requirePurchaseProof && !purchaseDate) {
      throw new Error('该类型损坏需要提供购买日期凭证')
    }

    const calc = calculateCompensationAmount(originalValue, purchaseDate, damageType, severity, metadata?.customRate ? Number(metadata.customRate) : undefined)
    const method = String(metadata.compensationMethod)

    db.run(
      'INSERT INTO compensation_records (order_id, damage_report_id, amount, compensation_method, standard_rate, applied_value, applicant, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        Number(metadata.damageReportId),
        calc.amount,
        method,
        calc.rate,
        calc.appliedValue,
        op,
        remark ?? null,
      ],
    )
  }

  if (action.code === 'approve_compensation' && metadata?.compensationRecordId) {
    const finalAmount = metadata.finalAmount ? Number(metadata.finalAmount) : undefined
    if (finalAmount != null && finalAmount <= 0) {
      throw new Error('赔偿金额必须大于0')
    }
    db.run(
      "UPDATE compensation_records SET status = 'approved', reviewer = ?, reviewed_at = datetime('now'), review_remark = ?, amount = COALESCE(?, amount) WHERE id = ?",
      [op, remark ?? null, finalAmount ?? null, Number(metadata.compensationRecordId)],
    )
    const compResult = db.exec('SELECT * FROM compensation_records WHERE id = ?', [Number(metadata.compensationRecordId)])
    const actualAmount = compResult[0]?.values?.[0]?.[4] ?? finalAmount
    db.run(
      'INSERT INTO notifications (order_id, order_no, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [id, orderNo, 'system', '赔偿审核通过', `订单 ${orderNo} 的赔偿申请已审核通过，赔偿金额 ¥${actualAmount}，请及时处理赔付`],
    )
  }

  if (action.code === 'reject_compensation' && metadata?.compensationRecordId) {
    db.run(
      "UPDATE compensation_records SET status = 'rejected', reviewer = ?, reviewed_at = datetime('now'), review_remark = ? WHERE id = ?",
      [op, remark ?? null, Number(metadata.compensationRecordId)],
    )
  }

  if (action.code === 'confirm_payout' && metadata?.compensationRecordId) {
    db.run(
      "UPDATE compensation_records SET status = 'paid', payer = ?, paid_at = datetime('now'), paid_proof = ? WHERE id = ?",
      [op, String(metadata.paidProof), Number(metadata.compensationRecordId)],
    )
    const compResult = db.exec('SELECT amount FROM compensation_records WHERE id = ?', [Number(metadata.compensationRecordId)])
    const amount = compResult[0]?.values?.[0]?.[0] ?? 0
    db.run(
      'INSERT INTO notifications (order_id, order_no, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [id, orderNo, 'order', '赔偿已完成', `订单 ${orderNo}（${customerName}）的赔偿金 ¥${amount} 已赔付完成`],
    )
  }

  if (action.targetStatus) {
    newStatus = action.targetStatus
    db.run(
      "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [newStatus, id],
    )
  } else {
    db.run(
      "UPDATE orders SET updated_at = datetime('now') WHERE id = ?",
      [id],
    )
  }

  insertStatusRecord(
    db,
    id,
    newStatus,
    op,
    action.category,
    action.code,
    action.name,
    remark,
    metadata,
    action.targetStatus ? currentStatus : undefined,
  )

  if (action.targetStatus === 'completed') {
    const msg = pickupMethod === 'delivery'
      ? `订单 ${orderNo} 已完成，我们将尽快为您配送`
      : `订单 ${orderNo} 已完成，请到店取衣`

    db.run(
      'INSERT INTO notifications (order_id, order_no, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [id, orderNo, 'order', '衣物已完成', msg],
    )

    if (pickupMethod === 'self') {
      db.run(
        'INSERT INTO notifications (order_id, order_no, type, title, message) VALUES (?, ?, ?, ?, ?)',
        [id, orderNo, 'reminder', '取衣提醒', `订单 ${orderNo} 的衣物已准备就绪，请到店取衣`],
      )
    }
  }

  if (action.code === 'cancel') {
    db.run(
      'INSERT INTO notifications (order_id, order_no, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [id, orderNo, 'system', '订单已取消', `订单 ${orderNo}（${customerName}）已取消`],
    )
  }

  if (action.code === 'pickup') {
    db.run(
      'INSERT INTO notifications (order_id, order_no, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [id, orderNo, 'system', '订单已完成', `订单 ${orderNo}（${customerName}）已确认取衣，订单闭环`],
    )
  }

  if (action.targetStatus === 'damaged') {
    db.run(
      'INSERT INTO notifications (order_id, order_no, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [id, orderNo, 'system', '衣物损坏报告', `订单 ${orderNo}（${customerName}）已登记衣物损坏，请及时处理赔偿事宜`],
    )
  }

  if (action.targetStatus === 'compensating') {
    db.run(
      'INSERT INTO notifications (order_id, order_no, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [id, orderNo, 'system', '赔偿申请已提交', `订单 ${orderNo}（${customerName}）已提交赔偿申请，请及时审核`],
    )
  }

  saveDb()

  const finalResult = db.exec('SELECT * FROM orders WHERE id = ?', [id])
  const itemsResult = db.exec('SELECT * FROM order_items WHERE order_id = ?', [id])
  const historyResult = db.exec('SELECT * FROM status_records WHERE order_id = ? ORDER BY timestamp, id', [id])
  const damageResult = db.exec('SELECT * FROM damage_reports WHERE order_id = ? ORDER BY reported_at DESC, id DESC', [id])
  const compResult = db.exec('SELECT * FROM compensation_records WHERE order_id = ? ORDER BY applied_at DESC, id DESC', [id])

  return rowToOrder(
    finalResult[0].values[0],
    itemsResult[0]?.values ?? [],
    historyResult[0]?.values ?? [],
    damageResult[0]?.values ?? [],
    compResult[0]?.values ?? [],
  )
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const status = req.query.status as string | undefined
    let sql = 'SELECT * FROM orders'
    const params: any[] = []
    if (status) {
      sql += ' WHERE status = ?'
      params.push(status)
    }
    sql += ' ORDER BY created_at DESC'

    const result = db.exec(sql, params)
    if (!result[0]) {
      res.json({ success: true, data: [] })
      return
    }

    const orders = result[0].values.map(row => {
      const orderId = row[0] as number
      const itemsResult = db.exec('SELECT * FROM order_items WHERE order_id = ?', [orderId])
      const items = itemsResult[0]?.values ?? []
      const historyResult = db.exec('SELECT * FROM status_records WHERE order_id = ? ORDER BY timestamp, id', [orderId])
      const history = historyResult[0]?.values ?? []
      const damageResult = db.exec('SELECT * FROM damage_reports WHERE order_id = ? ORDER BY reported_at DESC, id DESC', [orderId])
      const damages = damageResult[0]?.values ?? []
      const compResult = db.exec('SELECT * FROM compensation_records WHERE order_id = ? ORDER BY applied_at DESC, id DESC', [orderId])
      const comps = compResult[0]?.values ?? []
      return rowToOrder(row, items, history, damages, comps)
    })

    res.json({ success: true, data: orders })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const id = Number(req.params.id)

    const result = db.exec('SELECT * FROM orders WHERE id = ?', [id])
    if (!result[0]) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    const row = result[0].values[0]
    const itemsResult = db.exec('SELECT * FROM order_items WHERE order_id = ?', [id])
    const items = itemsResult[0]?.values ?? []
    const historyResult = db.exec('SELECT * FROM status_records WHERE order_id = ? ORDER BY timestamp, id', [id])
    const history = historyResult[0]?.values ?? []
    const damageResult = db.exec('SELECT * FROM damage_reports WHERE order_id = ? ORDER BY reported_at DESC, id DESC', [id])
    const damages = damageResult[0]?.values ?? []
    const compResult = db.exec('SELECT * FROM compensation_records WHERE order_id = ? ORDER BY applied_at DESC, id DESC', [id])
    const comps = compResult[0]?.values ?? []

    res.json({ success: true, data: rowToOrder(row, items, history, damages, comps) })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerName, customerPhone, customerAddress, items, pickupMethod, remark } = req.body

    if (!customerName || !customerPhone || !items || items.length === 0 || !pickupMethod) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }

    const db = await getDb()
    const orderNo = generateOrderNo()
    const totalPrice = items.reduce((sum: number, i: any) => sum + (i.subtotal || 0), 0)

    db.run(
      'INSERT INTO orders (order_no, customer_name, customer_phone, address, pickup_method, total_price, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [orderNo, customerName, customerPhone, customerAddress ?? null, pickupMethod, totalPrice, 'pending', remark ?? null],
    )

    const orderResult = db.exec('SELECT * FROM orders WHERE order_no = ?', [orderNo])
    if (!orderResult[0]) {
      res.status(500).json({ success: false, error: '创建订单失败' })
      return
    }
    const orderId = orderResult[0].values[0][0] as number

    for (const item of items) {
      db.run(
        'INSERT INTO order_items (order_id, service_id, service_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, item.serviceId, item.serviceName, item.quantity, item.unitPrice, item.subtotal],
      )
    }

    insertStatusRecord(
      db,
      orderId,
      'pending',
      '系统',
      'status_primary',
      'create',
      '创建订单',
      remark ?? undefined,
    )

    db.run(
      'INSERT INTO notifications (order_id, order_no, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [orderId, orderNo, 'order', '新订单', `订单 ${orderNo} 已创建，${customerName}，合计 ¥${totalPrice.toFixed(2)}`],
    )

    saveDb()

    const finalResult = db.exec('SELECT * FROM orders WHERE id = ?', [orderId])
    const itemsResult = db.exec('SELECT * FROM order_items WHERE order_id = ?', [orderId])
    const historyResult = db.exec('SELECT * FROM status_records WHERE order_id = ? ORDER BY timestamp, id', [orderId])

    res.json({
      success: true,
      data: rowToOrder(
        finalResult[0].values[0],
        itemsResult[0]?.values ?? [],
        historyResult[0]?.values ?? [],
        [],
        [],
      ),
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/:id/actions', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const { code, operator, remark, metadata } = req.body

    if (!code) {
      res.status(400).json({ success: false, error: '缺少操作代码' })
      return
    }

    const db = await getDb()
    const data = await executeActionImpl(db, id, code, operator, remark, metadata)
    res.json({ success: true, data })
  } catch (err: any) {
    if (err.message === '订单不存在') {
      res.status(404).json({ success: false, error: err.message })
    } else if (err.message.startsWith('当前状态下不允许') || err.message.startsWith('该操作需要') || err.message.startsWith('缺少必要参数')) {
      res.status(400).json({ success: false, error: err.message })
    } else {
      res.status(500).json({ success: false, error: err.message })
    }
  }
})

router.put('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const { status, operator } = req.body

    if (!status) {
      res.status(400).json({ success: false, error: '缺少状态参数' })
      return
    }

    const statusToAction: Partial<Record<OrderStatus, { code: string }>> = {
      accepted: { code: 'accept' },
      washing: { code: 'start_wash' },
      inspecting: { code: 'finish_wash' },
      completed: { code: 'pass_inspect' },
      picked_up: { code: 'pickup' },
      cancelled: { code: 'cancel' },
      damaged: { code: 'report_damage' },
      compensating: { code: 'apply_compensation' },
      compensated: { code: 'confirm_payout' },
    }

    const actionInfo = statusToAction[status as OrderStatus]
    if (!actionInfo) {
      res.status(400).json({ success: false, error: '不支持的状态转换' })
      return
    }

    const db = await getDb()
    const data = await executeActionImpl(db, id, actionInfo.code, operator)
    res.json({ success: true, data })
  } catch (err: any) {
    if (err.message === '订单不存在') {
      res.status(404).json({ success: false, error: err.message })
    } else if (err.message.startsWith('当前状态下不允许') || err.message.startsWith('该操作需要') || err.message.startsWith('缺少必要参数') || err.message === '不支持的状态转换') {
      res.status(400).json({ success: false, error: err.message })
    } else {
      res.status(500).json({ success: false, error: err.message })
    }
  }
})

router.put('/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const { operator } = req.body

    const db = await getDb()
    const existing = db.exec('SELECT * FROM orders WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    const currentStatus = String(existing[0].values[0][7])
    if (currentStatus !== 'pending') {
      res.status(400).json({ success: false, error: '只能取消待处理订单' })
      return
    }

    const data = await executeActionImpl(db, id, 'cancel', operator || '用户')
    res.json({ success: true, data })
  } catch (err: any) {
    if (err.message === '订单不存在') {
      res.status(404).json({ success: false, error: err.message })
    } else if (err.message.startsWith('当前状态下不允许') || err.message.startsWith('该操作需要') || err.message.startsWith('缺少必要参数') || err.message === '只能取消待处理订单') {
      res.status(400).json({ success: false, error: err.message })
    } else {
      res.status(500).json({ success: false, error: err.message })
    }
  }
})

router.get('/compensation/rules', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: COMPENSATION_RULES })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/compensation/calculate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { originalValue, purchaseDate, damageType, severity, customRate } = req.body

    if (!originalValue || !damageType || !severity) {
      res.status(400).json({ success: false, error: '缺少必要参数: originalValue, damageType, severity' })
      return
    }

    const result = calculateCompensationAmount(
      Number(originalValue),
      purchaseDate as string | undefined,
      damageType as any,
      severity as any,
      customRate != null ? Number(customRate) : undefined,
    )

    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/:id/damage-reports', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const id = Number(req.params.id)

    const existing = db.exec('SELECT id FROM orders WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    const result = db.exec('SELECT * FROM damage_reports WHERE order_id = ? ORDER BY reported_at DESC, id DESC', [id])
    const reports = result[0]?.values?.map(rowToDamageReport) ?? []

    res.json({ success: true, data: reports })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/:id/damage-reports', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const id = Number(req.params.id)
    const { orderItemId, damageType, severity, description, originalValue, purchaseDate, reportedBy, photos, remark } = req.body

    const existing = db.exec('SELECT * FROM orders WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    if (!damageType || !severity || !description) {
      res.status(400).json({ success: false, error: '缺少必要参数: damageType, severity, description' })
      return
    }

    const photosStr = photos ? JSON.stringify(photos) : null

    db.run(
      'INSERT INTO damage_reports (order_id, order_item_id, damage_type, severity, description, original_value, purchase_date, reported_by, photos, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        orderItemId ? Number(orderItemId) : null,
        String(damageType),
        String(severity),
        String(description),
        originalValue ? Number(originalValue) : null,
        purchaseDate ?? null,
        reportedBy ?? '店员',
        photosStr,
        remark ?? null,
      ],
    )

    saveDb()

    const result = db.exec('SELECT * FROM damage_reports WHERE order_id = ? ORDER BY reported_at DESC, id DESC LIMIT 1', [id])
    const report = result[0]?.values?.[0] ? rowToDamageReport(result[0].values[0]) : null

    res.json({ success: true, data: report })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/:id/compensation-records', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const id = Number(req.params.id)

    const existing = db.exec('SELECT id FROM orders WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    const result = db.exec('SELECT * FROM compensation_records WHERE order_id = ? ORDER BY applied_at DESC, id DESC', [id])
    const records = result[0]?.values?.map(rowToCompensationRecord) ?? []

    res.json({ success: true, data: records })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/:id/compensation-records', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const id = Number(req.params.id)
    const { damageReportId, compensationMethod, standardRate, appliedValue, amount, applicant, remark, customRate } = req.body

    const existing = db.exec('SELECT * FROM orders WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    if (!damageReportId || !compensationMethod) {
      res.status(400).json({ success: false, error: '缺少必要参数: damageReportId, compensationMethod' })
      return
    }

    const damageResult = db.exec('SELECT * FROM damage_reports WHERE id = ?', [Number(damageReportId)])
    if (!damageResult[0]?.values?.[0]) {
      res.status(404).json({ success: false, error: '损坏报告不存在' })
      return
    }
    const damageRow = damageResult[0].values[0]
    const damageType = String(damageRow[3]) as any
    const severity = String(damageRow[4]) as any
    const originalValue = damageRow[6] != null ? Number(damageRow[6]) : 0
    const purchaseDate = damageRow[7] != null ? String(damageRow[7]) : undefined

    let finalAmount = amount ? Number(amount) : 0
    let finalRate = standardRate ? Number(standardRate) : 0
    let finalApplied = appliedValue ? Number(appliedValue) : originalValue

    if (!finalAmount) {
      const calc = calculateCompensationAmount(
        originalValue,
        purchaseDate,
        damageType,
        severity,
        customRate != null ? Number(customRate) : undefined,
      )
      finalAmount = calc.amount
      finalRate = calc.rate
      finalApplied = calc.appliedValue
    }

    db.run(
      'INSERT INTO compensation_records (order_id, damage_report_id, amount, compensation_method, standard_rate, applied_value, applicant, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        Number(damageReportId),
        finalAmount,
        String(compensationMethod),
        finalRate,
        finalApplied,
        applicant ?? '店员',
        remark ?? null,
      ],
    )

    saveDb()

    const result = db.exec('SELECT * FROM compensation_records WHERE order_id = ? ORDER BY applied_at DESC, id DESC LIMIT 1', [id])
    const record = result[0]?.values?.[0] ? rowToCompensationRecord(result[0].values[0]) : null

    res.json({ success: true, data: record })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/compensation-records/:recordId/review', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const id = Number(req.params.id)
    const recordId = Number(req.params.recordId)
    const { approved, finalAmount, reviewer, reviewRemark } = req.body

    const existing = db.exec('SELECT * FROM orders WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    const compExisting = db.exec('SELECT * FROM compensation_records WHERE id = ? AND order_id = ?', [recordId, id])
    if (!compExisting[0]) {
      res.status(404).json({ success: false, error: '赔偿记录不存在' })
      return
    }

    const status = approved ? 'approved' : 'rejected'
    const amountUpdate = approved && finalAmount ? ', amount = ' + Number(finalAmount) : ''

    db.run(
      `UPDATE compensation_records SET status = ?, reviewer = ?, reviewed_at = datetime('now'), review_remark = ?${amountUpdate} WHERE id = ?`,
      [status, reviewer ?? '店员', reviewRemark ?? null, recordId],
    )

    saveDb()

    const result = db.exec('SELECT * FROM compensation_records WHERE id = ?', [recordId])
    const record = result[0]?.values?.[0] ? rowToCompensationRecord(result[0].values[0]) : null

    res.json({ success: true, data: record })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/compensation-records/:recordId/pay', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const id = Number(req.params.id)
    const recordId = Number(req.params.recordId)
    const { payer, paidProof } = req.body

    const existing = db.exec('SELECT * FROM orders WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    const compExisting = db.exec('SELECT * FROM compensation_records WHERE id = ? AND order_id = ?', [recordId, id])
    if (!compExisting[0]) {
      res.status(404).json({ success: false, error: '赔偿记录不存在' })
      return
    }

    if (String(compExisting[0].values[0][3]) !== 'approved') {
      res.status(400).json({ success: false, error: '赔偿申请尚未审核通过' })
      return
    }

    db.run(
      `UPDATE compensation_records SET status = 'paid', payer = ?, paid_at = datetime('now'), paid_proof = ? WHERE id = ?`,
      [payer ?? '店员', paidProof ?? null, recordId],
    )

    saveDb()

    const result = db.exec('SELECT * FROM compensation_records WHERE id = ?', [recordId])
    const record = result[0]?.values?.[0] ? rowToCompensationRecord(result[0].values[0]) : null

    res.json({ success: true, data: record })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
