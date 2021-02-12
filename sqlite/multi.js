const sql = require('lib/sqlite.js')
const { open, close, version, prepare, step, finalize, reset } = sql
const { bindInt } = sql

just.print(`SQLite version ${version()}`)
const db = open(':memory:')

function test (rows = 1000) {
  let stmt = prepare(db, 'DROP TABLE IF EXISTS world').stmt
  step(stmt)
  finalize(stmt)

  stmt = prepare(db, `
  CREATE TABLE world (
    id int NOT NULL PRIMARY KEY,
    random int
  )`).stmt
  step(stmt)
  finalize(stmt)

  stmt = prepare(db, 'INSERT INTO world (id, random) VALUES ($id, $random)').stmt
  const start = Date.now()
  for (let i = 1; i < rows; i++) {
    bindInt(stmt, 1, i)
    bindInt(stmt, 2, 0)
    step(stmt)
    reset(stmt)
  }
  finalize(stmt)
  just.print(Date.now() - start)
}

test(100)
test(1000)
test(10000)
test(100000)
test(1000000)
just.print(just.memoryUsage().rss)
test(1000000)
just.print(just.memoryUsage().rss)
test(1000000)
just.print(just.memoryUsage().rss)
test(1000000)
just.print(just.memoryUsage().rss)

close(db)
