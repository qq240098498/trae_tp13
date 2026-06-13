import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.post('/calculate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, products, packages } = req.body

    if ((!items || !Array.isArray(items) || items.length === 0) &&
        (!products || !Array.isArray(products) || products.length === 0) &&
        (!packages || !Array.isArray(packages) || packages.length === 0)) {
      res.status(400).json({ success: false, error: '缺少服务项目、洗衣产品或套餐' })
      return
    }

    const db = await getDb()
    const pricedItems = []
    const pricedProducts = []
    const pricedPackages = []
    let total = 0

    if (items && Array.isArray(items)) {
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
    }

    if (products && Array.isArray(products)) {
      for (const product of products) {
        const productId = Number(product.productId)
        const quantity = Number(product.quantity)

        if (!productId || !quantity || quantity <= 0) continue

        const result = db.exec('SELECT * FROM laundry_products WHERE id = ? AND is_active = 1', [productId])
        if (!result[0]) continue

        const row = result[0].values[0]
        const unitPrice = Number(row[3])
        const subtotal = unitPrice * quantity

        pricedProducts.push({
          productId: String(row[0]),
          productName: String(row[1]),
          quantity,
          unitPrice,
          subtotal,
        })
        total += subtotal
      }
    }

    if (packages && Array.isArray(packages)) {
      for (const pkg of packages) {
        const packageId = Number(pkg.packageId)
        const quantity = Number(pkg.quantity)

        if (!packageId || !quantity || quantity <= 0) continue

        const pkgResult = db.exec('SELECT * FROM product_packages WHERE id = ? AND is_active = 1', [packageId])
        if (!pkgResult[0]) continue

        const pkgRow = pkgResult[0].values[0]
        const itemsResult = db.exec('SELECT * FROM package_items WHERE package_id = ?', [packageId])
        const pkgItems = (itemsResult[0]?.values ?? []).map(row => ({
          productId: String(row[2]),
          productName: String(row[3]),
          quantity: Number(row[4]),
        }))

        const unitPrice = Number(pkgRow[4])
        const subtotal = unitPrice * quantity

        pricedPackages.push({
          packageId: String(pkgRow[0]),
          packageName: String(pkgRow[1]),
          quantity,
          unitPrice,
          subtotal,
          items: pkgItems,
        })
        total += subtotal
      }
    }

    res.json({ success: true, data: { total, items: pricedItems, products: pricedProducts, packages: pricedPackages } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
