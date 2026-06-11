import initSqlJs, { type Database } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_DIR = path.resolve(__dirname, '..', 'data')
const DB_PATH = path.join(DB_DIR, 'laundry.db')

let db: Database | null = null

const ready = new Promise<Database>((resolve, reject) => {
  initSqlJs()
    .then((SQL) => {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true })
      }

      let buf: Buffer | undefined
      if (fs.existsSync(DB_PATH)) {
        buf = fs.readFileSync(DB_PATH)
      }

      db = new SQL.Database(buf)

      db.run(`
        CREATE TABLE IF NOT EXISTS service_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          unit TEXT NOT NULL DEFAULT '件',
          base_price REAL NOT NULL,
          special_price REAL,
          description TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_no TEXT NOT NULL UNIQUE,
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          address TEXT,
          pickup_method TEXT NOT NULL CHECK(pickup_method IN ('self', 'delivery')),
          total_price REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          remark TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          service_id INTEGER NOT NULL,
          service_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          subtotal REAL NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS status_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          status TEXT NOT NULL,
          operator TEXT NOT NULL DEFAULT '系统',
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          order_no TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          is_read INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );
      `)

      const count = db.exec('SELECT COUNT(*) AS cnt FROM service_items')
      const rowCount = count[0]?.values[0]?.[0] as number
      if (rowCount === 0) {
        db.run(`
          INSERT INTO service_items (name, category, unit, base_price, description) VALUES
            ('水洗衬衫', '水洗', '件', 15.0, '普通衬衫水洗服务'),
            ('水洗裤装', '水洗', '件', 20.0, '裤装水洗服务'),
            ('水洗外套', '水洗', '件', 35.0, '外套水洗服务'),
            ('干洗西装', '干洗', '套', 80.0, '西装干洗服务'),
            ('干洗大衣', '干洗', '件', 60.0, '大衣干洗服务'),
            ('干洗羽绒服', '干洗', '件', 50.0, '羽绒服干洗服务'),
            ('熨烫衬衫', '熨烫', '件', 10.0, '衬衫熨烫服务'),
            ('熨烫裤装', '熨烫', '件', 12.0, '裤装熨烫服务'),
            ('熨烫裙装', '熨烫', '件', 15.0, '裙装熨烫服务'),
            ('奢侈品护理', '特殊护理', '件', 120.0, '高端品牌衣物专业护理'),
            ('皮衣保养', '特殊护理', '件', 100.0, '皮衣清洁上光保养'),
            ('婚纱清洗', '特殊护理', '件', 200.0, '婚纱专业清洗保养');
        `)
      }

      saveDb()
      resolve(db)
    })
    .catch(reject)
})

export function getDb(): Promise<Database> {
  return ready
}

export function saveDb(): void {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  }
}

export { ready }
