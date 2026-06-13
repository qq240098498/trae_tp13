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
          service_total REAL NOT NULL DEFAULT 0,
          product_total REAL NOT NULL DEFAULT 0,
          package_total REAL NOT NULL DEFAULT 0,
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
          action_category TEXT NOT NULL DEFAULT 'status_primary',
          action_code TEXT NOT NULL,
          action_name TEXT NOT NULL,
          remark TEXT,
          metadata TEXT,
          from_status TEXT,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );
      `)

      const orderColumns = db.exec("PRAGMA table_info(orders)")
      const orderColNames = orderColumns[0]?.values.map(c => c[1]) || []
      if (!orderColNames.includes('service_total')) {
        db.run("ALTER TABLE orders ADD COLUMN service_total REAL NOT NULL DEFAULT 0")
      }
      if (!orderColNames.includes('product_total')) {
        db.run("ALTER TABLE orders ADD COLUMN product_total REAL NOT NULL DEFAULT 0")
      }
      if (!orderColNames.includes('package_total')) {
        db.run("ALTER TABLE orders ADD COLUMN package_total REAL NOT NULL DEFAULT 0")
      }

      const columns = db.exec("PRAGMA table_info(status_records)")
      const colNames = columns[0]?.values.map(c => c[1]) || []
      if (!colNames.includes('action_category')) {
        db.run("ALTER TABLE status_records ADD COLUMN action_category TEXT NOT NULL DEFAULT 'status_primary'")
      }
      if (!colNames.includes('action_code')) {
        db.run("ALTER TABLE status_records ADD COLUMN action_code TEXT")
      }
      if (!colNames.includes('action_name')) {
        db.run("ALTER TABLE status_records ADD COLUMN action_name TEXT")
      }
      if (!colNames.includes('remark')) {
        db.run("ALTER TABLE status_records ADD COLUMN remark TEXT")
      }
      if (!colNames.includes('metadata')) {
        db.run("ALTER TABLE status_records ADD COLUMN metadata TEXT")
      }
      if (!colNames.includes('from_status')) {
        db.run("ALTER TABLE status_records ADD COLUMN from_status TEXT")
      }

      db.run("UPDATE status_records SET action_category = 'status_primary' WHERE action_category IS NULL")
      db.run("UPDATE status_records SET action_code = 'create' WHERE action_code IS NULL AND status = 'pending'")
      db.run("UPDATE status_records SET action_code = 'accept' WHERE action_code IS NULL AND status = 'accepted'")
      db.run("UPDATE status_records SET action_code = 'start_wash' WHERE action_code IS NULL AND status = 'washing'")
      db.run("UPDATE status_records SET action_code = 'start_inspect' WHERE action_code IS NULL AND status = 'inspecting'")
      db.run("UPDATE status_records SET action_code = 'complete' WHERE action_code IS NULL AND status = 'completed'")
      db.run("UPDATE status_records SET action_code = 'pickup' WHERE action_code IS NULL AND status = 'picked_up'")
      db.run("UPDATE status_records SET action_code = 'cancel' WHERE action_code IS NULL AND status = 'cancelled'")
      db.run("UPDATE status_records SET action_name = '创建订单' WHERE action_name IS NULL AND status = 'pending'")
      db.run("UPDATE status_records SET action_name = '接单' WHERE action_name IS NULL AND status = 'accepted'")
      db.run("UPDATE status_records SET action_name = '开始洗涤' WHERE action_name IS NULL AND status = 'washing'")
      db.run("UPDATE status_records SET action_name = '进入质检' WHERE action_name IS NULL AND status = 'inspecting'")
      db.run("UPDATE status_records SET action_name = '订单完成' WHERE action_name IS NULL AND status = 'completed'")
      db.run("UPDATE status_records SET action_name = '确认取衣' WHERE action_name IS NULL AND status = 'picked_up'")
      db.run("UPDATE status_records SET action_name = '取消订单' WHERE action_name IS NULL AND status = 'cancelled'")

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

      db.run(`
        CREATE TABLE IF NOT EXISTS damage_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          order_item_id INTEGER,
          damage_type TEXT NOT NULL,
          severity TEXT NOT NULL,
          responsibility_party TEXT NOT NULL DEFAULT 'unknown',
          description TEXT NOT NULL,
          original_value REAL,
          purchase_date TEXT,
          reported_by TEXT NOT NULL,
          reported_at TEXT NOT NULL DEFAULT (datetime('now')),
          photos TEXT,
          remark TEXT,
          is_resolved INTEGER NOT NULL DEFAULT 0,
          resolved_at TEXT,
          resolution_type TEXT,
          resolution_remark TEXT,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL
        );
      `)

      const damageColumns = db.exec("PRAGMA table_info(damage_reports)")
      const damageColNames = damageColumns[0]?.values.map(c => c[1]) || []
      if (!damageColNames.includes('responsibility_party')) {
        db.run("ALTER TABLE damage_reports ADD COLUMN responsibility_party TEXT NOT NULL DEFAULT 'unknown'")
      }
      if (!damageColNames.includes('is_resolved')) {
        db.run("ALTER TABLE damage_reports ADD COLUMN is_resolved INTEGER NOT NULL DEFAULT 0")
      }
      if (!damageColNames.includes('resolved_at')) {
        db.run("ALTER TABLE damage_reports ADD COLUMN resolved_at TEXT")
      }
      if (!damageColNames.includes('resolution_type')) {
        db.run("ALTER TABLE damage_reports ADD COLUMN resolution_type TEXT")
      }
      if (!damageColNames.includes('resolution_remark')) {
        db.run("ALTER TABLE damage_reports ADD COLUMN resolution_remark TEXT")
      }

      db.run(`
        CREATE TABLE IF NOT EXISTS compensation_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          damage_report_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending_review',
          amount REAL NOT NULL,
          compensation_method TEXT NOT NULL,
          standard_rate REAL NOT NULL,
          applied_value REAL NOT NULL,
          reviewer TEXT,
          reviewed_at TEXT,
          review_remark TEXT,
          payer TEXT,
          paid_at TEXT,
          paid_proof TEXT,
          applicant TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT (datetime('now')),
          remark TEXT,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (damage_report_id) REFERENCES damage_reports(id) ON DELETE CASCADE
        );
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS laundry_products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT NOT NULL CHECK(category IN ('free', 'paid')),
          price REAL NOT NULL DEFAULT 0,
          description TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS order_products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          subtotal REAL NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS product_packages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL CHECK(category IN ('free', 'paid')),
          package_price REAL NOT NULL DEFAULT 0,
          original_price REAL NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS package_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          package_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (package_id) REFERENCES product_packages(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES laundry_products(id) ON DELETE CASCADE
        );
      `)

      db.run(`
        CREATE TABLE IF NOT EXISTS order_packages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          package_id INTEGER NOT NULL,
          package_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          subtotal REAL NOT NULL,
          items TEXT,
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

      const productCount = db.exec('SELECT COUNT(*) AS cnt FROM laundry_products')
      const productRowCount = productCount[0]?.values[0]?.[0] as number
      if (productRowCount === 0) {
        db.run(`
          INSERT INTO laundry_products (name, category, price, description) VALUES
            ('普通洗衣液', 'free', 0, '基础洗衣液，适合日常衣物'),
            ('柔顺剂', 'free', 0, '衣物柔顺护理，让衣物更柔软'),
            ('消毒液', 'free', 0, '专业消毒，杀菌除螨'),
            ('高级香薰洗衣液', 'paid', 5, '进口香薰洗衣液，持久留香'),
            ('除菌除螨套装', 'paid', 8, '深度除菌除螨，呵护健康'),
            ('羊毛专用洗涤剂', 'paid', 10, '羊毛衫专用温和洗涤剂'),
            ('真丝专用洗涤剂', 'paid', 12, '真丝面料专用护理洗涤剂'),
            ('衣物防皱护理液', 'paid', 6, '防皱抗静电，衣物更平整'),
            ('深层去渍套装', 'paid', 15, '顽固污渍深度清洁套装'),
            ('婴幼儿专用洗涤剂', 'paid', 10, '温和无刺激，适合婴幼儿衣物');
        `)
      }

      const packageCount = db.exec('SELECT COUNT(*) AS cnt FROM product_packages')
      const packageRowCount = packageCount[0]?.values[0]?.[0] as number
      if (packageRowCount === 0) {
        db.run(`
          INSERT INTO product_packages (name, description, category, package_price, original_price) VALUES
            ('基础护理套餐', '包含普通洗衣液、柔顺剂、消毒液，适合日常衣物洗护', 'free', 0, 0),
            ('香薰护理套餐', '高级香薰洗衣液+柔顺剂，持久留香，衣物更柔软', 'paid', 8, 10),
            ('深度清洁套餐', '除菌除螨套装+深层去渍套装，深度清洁，呵护健康', 'paid', 18, 23),
            ('精致衣物套餐', '羊毛专用洗涤剂+真丝专用洗涤剂+衣物防皱护理液，高档衣物专业护理', 'paid', 22, 28),
            ('婴幼儿专属套餐', '婴幼儿专用洗涤剂+消毒液+柔顺剂，温和无刺激，专为宝宝设计', 'paid', 15, 20),
            ('豪华护理套餐', '高级香薰洗衣液+除菌除螨套装+衣物防皱护理液+柔顺剂，全方位护理', 'paid', 20, 25);
        `)

        const pkgResult = db.exec('SELECT id, name FROM product_packages ORDER BY id')
        const prodResult = db.exec('SELECT id, name FROM laundry_products ORDER BY id')
        if (pkgResult[0] && prodResult[0]) {
          const pkgMap = new Map<string, number>()
          pkgResult[0].values.forEach(row => pkgMap.set(String(row[1]), Number(row[0])))
          const prodMap = new Map<string, number>()
          prodResult[0].values.forEach(row => prodMap.set(String(row[1]), Number(row[0])))

          const packageItems = [
            { pkg: '基础护理套餐', items: [['普通洗衣液', 1], ['柔顺剂', 1], ['消毒液', 1]] },
            { pkg: '香薰护理套餐', items: [['高级香薰洗衣液', 1], ['柔顺剂', 1]] },
            { pkg: '深度清洁套餐', items: [['除菌除螨套装', 1], ['深层去渍套装', 1]] },
            { pkg: '精致衣物套餐', items: [['羊毛专用洗涤剂', 1], ['真丝专用洗涤剂', 1], ['衣物防皱护理液', 1]] },
            { pkg: '婴幼儿专属套餐', items: [['婴幼儿专用洗涤剂', 1], ['消毒液', 1], ['柔顺剂', 1]] },
            { pkg: '豪华护理套餐', items: [['高级香薰洗衣液', 1], ['除菌除螨套装', 1], ['衣物防皱护理液', 1], ['柔顺剂', 1]] },
          ]

          packageItems.forEach(({ pkg, items }) => {
            const pkgId = pkgMap.get(pkg)
            if (pkgId) {
              items.forEach(([prodName, qty]) => {
                const prodId = prodMap.get(prodName as string)
                if (prodId) {
                  db.run(
                    'INSERT INTO package_items (package_id, product_id, product_name, quantity) VALUES (?, ?, ?, ?)',
                    [pkgId, prodId, prodName, qty]
                  )
                }
              })
            }
          })
        }
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
