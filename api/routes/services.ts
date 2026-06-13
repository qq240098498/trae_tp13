import { Router, type Request, type Response } from 'express'
import { getDb, saveDb } from '../db.js'
import type { ServiceItem, LaundryProduct, PackageItem, ProductPackage } from '../../shared/types.js'

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

function rowToLaundryProduct(row: any[]): LaundryProduct {
  return {
    id: String(row[0]),
    name: String(row[1]),
    category: String(row[2]) as any,
    price: Number(row[3]),
    description: row[4] != null ? String(row[4]) : undefined,
    isActive: row[5] === 1,
    createdAt: String(row[6]),
    updatedAt: String(row[7]),
  }
}

function rowToPackageItem(row: any[]): PackageItem {
  return {
    productId: String(row[2]),
    productName: String(row[3]),
    quantity: Number(row[4]),
  }
}

function rowToProductPackage(row: any[], items: any[] = []): ProductPackage {
  return {
    id: String(row[0]),
    name: String(row[1]),
    description: row[2] != null ? String(row[2]) : undefined,
    category: String(row[3]) as any,
    packagePrice: Number(row[4]),
    originalPrice: Number(row[5]),
    items: items.map(rowToPackageItem),
    isActive: row[6] === 1,
    createdAt: String(row[7]),
    updatedAt: String(row[8]),
  }
}

router.get('/products', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const result = db.exec('SELECT * FROM laundry_products WHERE is_active = 1 ORDER BY category, id')
    if (!result[0]) {
      res.json({ success: true, data: [] })
      return
    }
    const items = result[0].values.map(rowToLaundryProduct)
    res.json({ success: true, data: items })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/products', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, price, description } = req.body
    if (!name || !category) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const db = await getDb()
    db.run(
      'INSERT INTO laundry_products (name, category, price, description) VALUES (?, ?, ?, ?)',
      [name, category, price ?? 0, description ?? null],
    )
    saveDb()
    const result = db.exec('SELECT * FROM laundry_products ORDER BY id DESC LIMIT 1')
    const item = rowToLaundryProduct(result[0].values[0])
    res.json({ success: true, data: item })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/products/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const { name, category, price, description, isActive } = req.body
    const db = await getDb()

    const existing = db.exec('SELECT * FROM laundry_products WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '洗衣产品不存在' })
      return
    }

    const current = rowToLaundryProduct(existing[0].values[0])
    db.run(
      `UPDATE laundry_products SET name = ?, category = ?, price = ?, description = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`,
      [
        name ?? current.name,
        category ?? current.category,
        price !== undefined ? price : current.price,
        description !== undefined ? description : current.description ?? null,
        isActive !== undefined ? (isActive ? 1 : 0) : (current.isActive ? 1 : 0),
        id,
      ],
    )
    saveDb()

    const updated = db.exec('SELECT * FROM laundry_products WHERE id = ?', [id])
    const item = rowToLaundryProduct(updated[0].values[0])
    res.json({ success: true, data: item })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.delete('/products/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const db = await getDb()

    const existing = db.exec('SELECT * FROM laundry_products WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '洗衣产品不存在' })
      return
    }

    db.run('UPDATE laundry_products SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?', [id])
    saveDb()
    res.json({ success: true, data: null })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/packages', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const result = db.exec('SELECT * FROM product_packages WHERE is_active = 1 ORDER BY category, id')
    if (!result[0]) {
      res.json({ success: true, data: [] })
      return
    }
    const packages = result[0].values.map(row => {
      const pkgId = row[0]
      const itemsResult = db.exec('SELECT * FROM package_items WHERE package_id = ?', [pkgId])
      const items = itemsResult[0]?.values ?? []
      return rowToProductPackage(row, items)
    })
    res.json({ success: true, data: packages })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/packages', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, category, packagePrice, originalPrice, items } = req.body
    if (!name || !category) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const db = await getDb()
    db.run(
      'INSERT INTO product_packages (name, description, category, package_price, original_price) VALUES (?, ?, ?, ?, ?)',
      [name, description ?? null, category, packagePrice ?? 0, originalPrice ?? 0],
    )
    const pkgResult = db.exec('SELECT * FROM product_packages ORDER BY id DESC LIMIT 1')
    const pkgRow = pkgResult[0].values[0]
    const pkgId = Number(pkgRow[0])

    if (items && Array.isArray(items)) {
      for (const item of items) {
        db.run(
          'INSERT INTO package_items (package_id, product_id, product_name, quantity) VALUES (?, ?, ?, ?)',
          [pkgId, item.productId, item.productName, item.quantity ?? 1],
        )
      }
    }
    saveDb()

    const itemsResult = db.exec('SELECT * FROM package_items WHERE package_id = ?', [pkgId])
    const pkg = rowToProductPackage(pkgRow, itemsResult[0]?.values ?? [])
    res.json({ success: true, data: pkg })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/packages/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const { name, description, category, packagePrice, originalPrice, isActive, items } = req.body
    const db = await getDb()

    const existing = db.exec('SELECT * FROM product_packages WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '套餐不存在' })
      return
    }

    const current = rowToProductPackage(existing[0].values[0])
    db.run(
      `UPDATE product_packages SET name = ?, description = ?, category = ?, package_price = ?, original_price = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`,
      [
        name ?? current.name,
        description !== undefined ? description : current.description ?? null,
        category ?? current.category,
        packagePrice !== undefined ? packagePrice : current.packagePrice,
        originalPrice !== undefined ? originalPrice : current.originalPrice,
        isActive !== undefined ? (isActive ? 1 : 0) : (current.isActive ? 1 : 0),
        id,
      ],
    )

    if (items && Array.isArray(items)) {
      db.run('DELETE FROM package_items WHERE package_id = ?', [id])
      for (const item of items) {
        db.run(
          'INSERT INTO package_items (package_id, product_id, product_name, quantity) VALUES (?, ?, ?, ?)',
          [id, item.productId, item.productName, item.quantity ?? 1],
        )
      }
    }
    saveDb()

    const updated = db.exec('SELECT * FROM product_packages WHERE id = ?', [id])
    const itemsResult = db.exec('SELECT * FROM package_items WHERE package_id = ?', [id])
    const pkg = rowToProductPackage(updated[0].values[0], itemsResult[0]?.values ?? [])
    res.json({ success: true, data: pkg })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.delete('/packages/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const db = await getDb()

    const existing = db.exec('SELECT * FROM product_packages WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '套餐不存在' })
      return
    }

    db.run('UPDATE product_packages SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?', [id])
    saveDb()
    res.json({ success: true, data: null })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
