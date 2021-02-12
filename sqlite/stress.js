const sql = require('lib/sqlite.js')
const { getSchema, getRows } = require('lib/nice.js')
const { open, close, version, prepare, step, finalize, reset } = sql
const { clearBindings, bindInt } = sql

just.print(`SQLite version ${version()}`)
//just.fs.unlink('world.db')
const db = open('world.db')

let { stmt } = prepare(db, `
CREATE TABLE IF NOT EXISTS world (
  id int NOT NULL PRIMARY KEY,
  random int
)`)
step(stmt)
finalize(stmt)
const world = getSchema(db, 'world')

stmt = prepare(db, 'CREATE INDEX IF NOT EXISTS [IFK_world_id] ON "world" ([id])').stmt
step(stmt)
finalize(stmt)

stmt = prepare(db, 'DELETE FROM world').stmt
step(stmt)
finalize(stmt)

stmt = prepare(db, `
INSERT INTO world 
  (id, random)
VALUES
  (1, 0),
  (2, 1),
  (3, 2)
`).stmt
step(stmt)
finalize(stmt)

stmt = prepare(db, 'SELECT * FROM world').stmt
just.print(JSON.stringify(getRows(stmt, world)))
finalize(stmt)
stmt = prepare(db, 'SELECT * FROM world where id = $id').stmt
bindInt(stmt, 1, 2)
just.print(JSON.stringify(getRows(stmt, world)))
clearBindings(stmt)
reset(stmt)
bindInt(stmt, 1, 3)
just.print(JSON.stringify(getRows(stmt, world)))
reset(stmt)
just.print(JSON.stringify(getRows(stmt, world)))

function test () {
  stmt = prepare(db, 'SELECT * FROM world where id = $id').stmt
  bindInt(stmt, 1, 3)
  for (let i = 0; i < 1000; i++) {
    const rows = getRows(stmt, world)
    reset(stmt)
  }
}

test()
test()
test()
test()

finalize(stmt)
close(db)
