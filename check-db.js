import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.resolve(__dirname, 'data', 'laundry.db')

initSqlJs().then(SQL => {
  const buf = fs.readFileSync(DB_PATH)
  const db = new SQL.Database(buf)

  console.log('=== Orders table schema ===')
  const cols = db.exec("PRAGMA table_info(orders)")
  if (cols[0]) {
    cols[0].values.forEach((row, i) => {
      console.log(`${i}: ${row[1]} (${row[2]})`)
    })
  }

  console.log('\n=== First order row ===')
  const orders = db.exec('SELECT * FROM orders LIMIT 1')
  if (orders[0]) {
    const row = orders[0].values[0]
    row.forEach((val, i) => {
      console.log(`${i}: ${JSON.stringify(val)} (${typeof val})`)
    })
  }

  console.log('\n=== Order items table schema ===')
  const itemCols = db.exec("PRAGMA table_info(order_items)")
  if (itemCols[0]) {
    itemCols[0].values.forEach((row, i) => {
      console.log(`${i}: ${row[1]} (${row[2]})`)
    })
  }

  console.log('\n=== First order item ===')
  const items = db.exec('SELECT * FROM order_items LIMIT 1')
  if (items[0]) {
    const row = items[0].values[0]
    row.forEach((val, i) => {
      console.log(`${i}: ${JSON.stringify(val)} (${typeof val})`)
    })
  }
})
