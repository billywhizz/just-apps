const sql = require('lib/sqlite.js')
const { getSchema, getRows } = require('lib/nice.js')
const { open, close, version, prepare, step, finalize, reset } = sql
const { bindText, clearBindings } = sql
const { createServer } = require('@justify')
const { readFile } = require('fs')

just.print(`SQLite version ${version()}`)
const db = open('employees.db')
let { stmt } = prepare(db, `
CREATE TABLE IF NOT EXISTS employee (
  Name varchar(20),
  Dept varchar(20),
  jobTitle varchar(20)
)`)
step(stmt)
finalize(stmt)
stmt = prepare(db, `
INSERT INTO employee 
  (Name, Dept, jobTitle)
VALUES
  ('Barney Rubble','Sales','Neighbor'),
  ('Fred Flintstone','Bullshit','Boss')
`).stmt
step(stmt)
finalize(stmt)
global.onExit = () => {
  close(db)
}
const employees = getSchema(db, 'employee')
const connections = {}
const { PORT } = just.env()
just.setInterval(() => {
  const conn = Object.keys(connections).length
  const rss = just.memoryUsage().rss
  const { user, system } = just.cpuUsage()
  const total = (user + system)
  const upc = total ? (user / total) : 0
  const spc = total ? (system / total) : 0
  just.print(`mem ${rss} cpu ${total} (${upc.toFixed(2)}/${spc.toFixed(2)}) conn ${conn}`)
}, 1000)
createServer()
  .get(['/', 'index.html'], (req, res) => res.text(readFile('index.html')))
  .get('/employees', (req, res) => {
    const stmt = prepare(db, 'SELECT * FROM employee').stmt
    const json = JSON.stringify(getRows(stmt, employees))
    res.json(json)

    clearBindings(stmt)
    reset(stmt)
    finalize(stmt)
  })
  .listen(PORT, '0.0.0.0')
