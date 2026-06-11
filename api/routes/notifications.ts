import { Router, type Request, type Response } from 'express'
import { getDb, saveDb } from '../db.js'

const router = Router()

function rowToNotification(row: any[]) {
  return {
    id: String(row[0]),
    orderId: String(row[1]),
    orderNo: String(row[2]),
    type: String(row[3]),
    title: String(row[4]),
    message: String(row[5]),
    isRead: row[6] === 1,
    createdAt: String(row[7]),
  }
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const result = db.exec('SELECT * FROM notifications ORDER BY created_at DESC')
    if (!result[0]) {
      res.json({ success: true, data: [] })
      return
    }
    const notifications = result[0].values.map(rowToNotification)
    res.json({ success: true, data: notifications })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/unread-count', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const result = db.exec('SELECT COUNT(*) AS cnt FROM notifications WHERE is_read = 0')
    const count = result[0]?.values[0]?.[0] as number ?? 0
    res.json({ success: true, data: { count } })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id)
    const db = await getDb()

    const existing = db.exec('SELECT * FROM notifications WHERE id = ?', [id])
    if (!existing[0]) {
      res.status(404).json({ success: false, error: '通知不存在' })
      return
    }

    db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id])
    saveDb()

    res.json({ success: true, data: null })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
