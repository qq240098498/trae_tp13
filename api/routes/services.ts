import { Router, type Request, type Response } from 'express'
import { getDb, saveDb } from '../db.js'
import type { ServiceItem } from '../../shared/types.js'

const router = Router()

function rowToServiceItem(row: any[]): ServiceItem {
  return {
    id: String(row[0]),
    name: String(row[1]),
    category: String(row[2]),
    unit: String(row[3]),
    basePrice: Number(row[4]),
    specialPrice: row[5] != null ? Number(row[5]) : undefined,
    description: row[6] != null ? String(row[6]) : undefined,
    isActive: row[7] === 1,
    createdAt: String(row[8]),
    updatedAt: String(row[9]),
  }
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const result = db.exec('SELECT * FROM service_items WHERE is_active = 1 ORDER BY id')
    if (!result[0]) {
      res.json({ success: true, data: [] })
      return
    }
    const items = result[0].values.map(rowToServiceItem)
    res.json({ success: true, data: items })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, unit, basePrice, specialPrice, description } = req.body
    if (!name || !category || basePrice == null) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const db = await getDb()
    db.run(
      'INSERT INTO service_items (name, category, unit, base_price, special_price, description) VALUES (?, ?, ?, ?, ?, ?)',
      [name, category, unit || '件', basePrice, specialPrice ?? null, description ?? null],
    )
    saveDb()
    const result = db.exec('SELECT * FROM service_items ORDER BY id DESC LIMIT 1')
    const item = rowToServiceItem(result[0].values[0])
    res.json({ success: true, data: item })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const { name, category, unit, basePrice, specialPrice, description, isActive } = req.body
    const db = await getDb()

    const existing = db.exec('SELECT * FROM service_items WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '服务项不存在' })
      return
    }

    const current = rowToServiceItem(existing[0].values[0])
    db.run(
      `UPDATE service_items SET name = ?, category = ?, unit = ?, base_price = ?, special_price = ?, description = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`,
      [
        name ?? current.name,
        category ?? current.category,
        unit ?? current.unit,
        basePrice ?? current.basePrice,
        specialPrice !== undefined ? specialPrice : current.specialPrice ?? null,
        description !== undefined ? description : current.description ?? null,
        isActive !== undefined ? (isActive ? 1 : 0) : (current.isActive ? 1 : 0),
        id,
      ],
    )
    saveDb()

    const updated = db.exec('SELECT * FROM service_items WHERE id = ?', [id])
    const item = rowToServiceItem(updated[0].values[0])
    res.json({ success: true, data: item })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const db = await getDb()

    const existing = db.exec('SELECT * FROM service_items WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '服务项不存在' })
      return
    }

    db.run('UPDATE service_items SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?', [id])
    saveDb()
    res.json({ success: true, data: null })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
