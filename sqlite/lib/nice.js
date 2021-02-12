const sql = require('sqlite.js')
const { prepare, step, finalize } = sql
const { codes, columnInt, columnText } = sql

const types = {
  varchar: 0,
  int: 1
}

function getType (type) {
  if (type === 'int') return types.int
  return types.varchar
}

function getSchema (db, table) {
  const stmt = prepare(db, `pragma table_info('${table}')`).stmt
  const columns = []
  while (step(stmt) === codes.SQLITE_ROW) {
    columns.push({
      id: columnInt(stmt, 0),
      name: columnText(stmt, 1),
      type: getType(columnText(stmt, 2)),
      notnull: columnInt(stmt, 3),
      pk: columnInt(stmt, 5)
    })
  }
  finalize(stmt)
  return columns
}

const toText = (stmt, i) => columnText(stmt, i)
const toInteger = (stmt, i) => columnInt(stmt, i)

const convert = {
  [types.varchar]: toText,
  [types.int]: toInteger
}

function getRow (stmt, schema) {
  const obj = {}
  for (const column of schema) {
    obj[column.name] = convert[column.type](stmt, column.id)
  }
  return obj
}

function getRows (stmt, schema) {
  const rows = []
  while (step(stmt) === codes.SQLITE_ROW) {
    rows.push(getRow(stmt, schema))
  }
  return rows
}

module.exports = { getRows, getSchema }
