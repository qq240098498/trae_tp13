import { Router, type Request, type Response } from 'express'
import { getDb, saveDb } from '../db.js'

const router = Router()

function generateOrderNo(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 9000) + 1000)
  return `WD${y}${m}${d}${seq}`
}

function rowToOrder(row: any[], items: any[] = [], history: any[] = []) {
  return {
    id: String(row[0]),
    orderNumber: String(row[1]),
    customerName: String(row[2]),
    customerPhone: String(row[3]),
    customerAddress: row[4] != null ? String(row[4]) : undefined,
    pickupMethod: String(row[5]),
    totalPrice: Number(row[6]),
    status: String(row[7]),
    remark: row[8] != null ? String(row[8]) : undefined,
    items: items.map(ir => ({
      serviceId: String(ir[2]),
      serviceName: String(ir[3]),
      quantity: Number(ir[4]),
      unitPrice: Number(ir[5]),
      subtotal: Number(ir[6]),
    })),
    statusHistory: history.map(hr => ({
      status: String(hr[2]),
      timestamp: String(hr[4]),
      operator: hr[3] != null ? String(hr[3]) : undefined,
    })),
    createdAt: String(row[9]),
    updatedAt: String(row[10]),
  }
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
      const historyResult = db.exec('SELECT * FROM status_records WHERE order_id = ? ORDER BY timestamp', [orderId])
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
    const historyResult = db.exec('SELECT * FROM status_records WHERE order_id = ? ORDER BY timestamp', [id])
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

    db.run(
      'INSERT INTO status_records (order_id, status, operator) VALUES (?, ?, ?)',
      [orderId, 'pending', '系统'],
    )

    db.run(
      'INSERT INTO notifications (order_id, order_no, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [orderId, orderNo, 'order', '新订单', `订单 ${orderNo} 已创建，${customerName}，合计 ¥${totalPrice.toFixed(2)}`],
    )

    saveDb()

    const finalResult = db.exec('SELECT * FROM orders WHERE id = ?', [orderId])
    const itemsResult = db.exec('SELECT * FROM order_items WHERE order_id = ?', [orderId])
    const historyResult = db.exec('SELECT * FROM status_records WHERE order_id = ? ORDER BY timestamp', [orderId])

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

router.put('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const { status, operator } = req.body

    if (!status) {
      res.status(400).json({ success: false, error: '缺少状态参数' })
      return
    }

    const db = await getDb()
    const existing = db.exec('SELECT * FROM orders WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }

    db.run(
      "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [status, id],
    )

    db.run(
      'INSERT INTO status_records (order_id, status, operator) VALUES (?, ?, ?)',
      [id, status, operator || '系统'],
    )

    if (status === 'completed') {
      const orderRow = existing[0].values[0]
      const orderNo = String(orderRow[1])
      const pickupMethod = String(orderRow[5])
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

    saveDb()

    const finalResult = db.exec('SELECT * FROM orders WHERE id = ?', [id])
    const itemsResult = db.exec('SELECT * FROM order_items WHERE order_id = ?', [id])
    const historyResult = db.exec('SELECT * FROM status_records WHERE order_id = ? ORDER BY timestamp', [id])

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

router.put('/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
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

    db.run(
      "UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?",
      [id],
    )

    db.run(
      'INSERT INTO status_records (order_id, status, operator) VALUES (?, ?, ?)',
      [id, 'cancelled', '用户'],
    )

    saveDb()

    const finalResult = db.exec('SELECT * FROM orders WHERE id = ?', [id])
    const itemsResult = db.exec('SELECT * FROM order_items WHERE order_id = ?', [id])
    const historyResult = db.exec('SELECT * FROM status_records WHERE order_id = ? ORDER BY timestamp', [id])

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

export default router
