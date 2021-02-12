const sql = require('lib/sqlite.js')
const { open, close, version, prepare, step, finalize, reset } = sql
const { bindInt } = sql

just.print(`SQLite version ${version()}`)

function test (rows = 1000) {
  const db = open(':memory:')
  let stmt = prepare(db, `
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
    bindInt(stmt, 2, 1000)
    step(stmt)
    reset(stmt)
  }
  finalize(stmt)
  const elapsed = Date.now() - start
  just.print(`rows/sec ${Math.floor(rows / (elapsed / 1000))} rss ${just.memoryUsage().rss}`)
  close(db)
}

test(10)
test(100)
test(1000)
test(10000)
test(100000)
function next () {
  test(1000000)
  just.setTimeout(next, 100)
}
next()
