const sqlite = require('lib/sqlite.js')
const { getSchema, getRows } = require('lib/nice.js')
const { open, close, version, prepare, step, finalize, reset } = sqlite
const { clearBindings, bindInt } = sqlite

just.print(`SQLite version ${version()}`)
just.fs.unlink('world.db')
const db = open('world.db')

let { stmt } = prepare(db, 'DROP TABLE IF EXISTS world')
step(stmt)
finalize(stmt)

stmt = prepare(db, `
CREATE TABLE world (
  id int NOT NULL PRIMARY KEY,
  random int
)`).stmt
step(stmt)
finalize(stmt)

const world = getSchema(db, 'world')

stmt = prepare(db, 'CREATE INDEX [IFK_world_id] ON "world" ([id])').stmt
step(stmt)
finalize(stmt)

const rows = []
for (let i = 0; i < 1000; i++) rows.push(`(${i}, ${i})`)
const sql = `
INSERT INTO world 
  (id, random)
VALUES
${rows.join(',\n')}
`
stmt = prepare(db, sql).stmt
step(stmt)
finalize(stmt)

function test (n = 1000) {
  const stmt = prepare(db, 'SELECT * FROM world where id = $id').stmt
  const start = Date.now()
  for (let i = 0; i < n; i++) {
    bindInt(stmt, 1, Math.floor(Math.random() * 100))
    getRows(stmt, world)
    reset(stmt)
  }
  const elapsed = Date.now() - start
  const rate = n / (elapsed / 1000)
  just.print(`n = ${n} time ${elapsed} rate ${rate}`)
  clearBindings(stmt)
  finalize(stmt)
}

test(2000)
just.print(just.memoryUsage().rss)
close(db)

//stmt = prepare(db, 'SELECT id FROM world where id = $id').stmt

/*
db = open('world.db')
test(100000)
close(db)
db = open('world.db')
test(100000)
close(db)
*/
