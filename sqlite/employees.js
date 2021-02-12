const sql = require('lib/sqlite.js')
const { getSchema, getRows } = require('lib/nice.js')
const { open, close, version, prepare, step, finalize, reset } = sql
const { bindText, clearBindings } = sql

just.print(`SQLite version ${version()}`)

// open the database
const db = open('employees.db')

// create the table
let { stmt } = prepare(db, `
CREATE TABLE IF NOT EXISTS employee (
  Name varchar(20),
  Dept varchar(20),
  jobTitle varchar(20)
)`)
step(stmt)
finalize(stmt)

// describe the table
const employees = getSchema(db, 'employee')
just.print(JSON.stringify(employees))

// insert the records
stmt = prepare(db, `
INSERT INTO employee 
  (Name, Dept, jobTitle)
VALUES
  ('Barney Rubble','Sales','Neighbor'),
  ('Fred Flintstone','Bullshit','Boss')
`).stmt
step(stmt)
finalize(stmt)

// query the records and iterate the results
stmt = prepare(db, 'SELECT * FROM employee').stmt
just.print(JSON.stringify(getRows(stmt, employees)))
finalize(stmt)

// prepare a statement with params
stmt = prepare(db, 'SELECT * FROM employee where Name = $name').stmt
bindText(stmt, 1, 'Barney Rubble')
just.print(JSON.stringify(getRows(stmt, employees)))

// resuse it with new params
clearBindings(stmt)
reset(stmt)
bindText(stmt, 1, 'Fred Flintstone')
just.print(JSON.stringify(getRows(stmt, employees)))

// resuse it with the same params
reset(stmt)
just.print(JSON.stringify(getRows(stmt, employees)))

finalize(stmt)

// close the database
close(db)
