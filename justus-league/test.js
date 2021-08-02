const sql = require('lib/sqlite.js')
const { getSchema, getRows } = require('lib/nice.js')
const { open, close, version, prepare, step, finalize, reset, clearBindings } = sql
const db = open('employees.db')
const employees = getSchema(db, 'employee')

function run () {
  const stmt = prepare(db, 'SELECT * FROM employee').stmt
  just.print(JSON.stringify(getRows(stmt, employees)))
  reset(stmt)
  just.print(JSON.stringify(getRows(stmt, employees)))
  finalize(stmt)
}

while (1) run()
close(db)
