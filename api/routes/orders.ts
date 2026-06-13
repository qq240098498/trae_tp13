import { Router, type Request, type Response } from 'express'
import { getDb, saveDb } from '../db.js'
import type { OrderStatus, PickupMethod, AvailableAction, ActionCategory } from '../../shared/types.js'

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
    { code: 'add_note', name: '添加备注', description: '添加洗涤过程中的备注信息', category: 'note', buttonStyle: 'outline', requiresRemark: true },
  ],
  inspecting: [
    { code: 'pass_inspect', name: '质检通过', description: '质检合格，订单完成，请确认质检结果', category: 'status_primary', buttonStyle: 'primary', targetStatus: 'completed', requiresRemark: true },
    { code: 'fail_inspect', name: '质检不合格', description: '质检发现问题，退回重新处理', category: 'status_rollback', buttonStyle: 'warning', targetStatus: 'washing', requiresRemark: true },
    { code: 'record_defect', name: '登记瑕疵', description: '记录质检发现的瑕疵问题', category: 'business', buttonStyle: 'warning', requiresRemark: true, requiresMetadata: ['defectType'] },
    { code: 'add_note', name: '添加备注', description: '添加质检相关备注信息', category: 'note', buttonStyle: 'outline', requiresRemark: true },
  ],
  completed: [
    { code: 'pickup', name: '确认取衣', description: '客户已取走衣物，订单闭环，请确认取件人信息', category: 'status_primary', buttonStyle: 'primary', targetStatus: 'picked_up', requiresRemark: true },
    { code: 'issue_voucher', name: '发放取衣凭证', description: '生成并记录取衣凭证号', category: 'business', buttonStyle: 'secondary', requiresMetadata: ['voucherNo'] },
    { code: 'schedule_delivery', name: '安排配送', description: '安排上门配送时间和人员（仅限上门取送）', category: 'business', buttonStyle: 'secondary', requiresRemark: true, requiresMetadata: ['deliveryTime'] },
    { code: 'add_note', name: '添加备注', description: '添加完成后的备注信息', category: 'note', buttonStyle: 'outline', requiresRemark: true },
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

function rowToOrder(row: any[], items: any[] = [], history: any[] = []) {
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

  saveDb()

  const finalResult = db.exec('SELECT * FROM orders WHERE id = ?', [id])
  const itemsResult = db.exec('SELECT * FROM order_items WHERE order_id = ?', [id])
  const historyResult = db.exec('SELECT * FROM status_records WHERE order_id = ? ORDER BY timestamp, id', [id])

  return rowToOrder(
    finalResult[0].values[0],
    itemsResult[0]?.values ?? [],
    historyResult[0]?.values ?? [],
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
      return rowToOrder(row, items, history)
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

    res.json({ success: true, data: rowToOrder(row, items, history) })
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

export default router
