import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.post('/calculate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: '缺少服务项目' })
      return
    }

    const db = await getDb()
    const pricedItems = []
    let total = 0

    for (const item of items) {
      const serviceId = Number(item.serviceId)
      const quantity = Number(item.quantity)

      if (!serviceId || !quantity || quantity <= 0) continue

      const result = db.exec('SELECT * FROM service_items WHERE id = ? AND is_active = 1', [serviceId])
      if (!result[0]) continue

      const row = result[0].values[0]
      const basePrice = Number(row[4])
      const specialPrice = row[5] != null ? Number(row[5]) : null
      const unitPrice = specialPrice ?? basePrice
      const subtotal = unitPrice * quantity

      pricedItems.push({
        serviceId: String(row[0]),
        serviceName: String(row[1]),
        quantity,
        unitPrice,
        subtotal,
      })
      total += subtotal
    }

    res.json({ success: true, data: { total, items: pricedItems } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
