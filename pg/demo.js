const { Connection, pg, getRows } = require('@pg')
const { constants } = pg

function exec (db, sql, queries = 1, onResult = () => {}) {
  const completed = []
  return new Promise((resolve, reject) => {
    db.sock.execQuery(sql, err => {
      onResult(err, db.sock.parser.query.rows)
      if (err) completed.push(err)
      completed.push(null)
      if (completed.length === queries) {
        if (completed.filter(v => v).length) {
          return reject(new Error(completed.filter(e => e).map(e => e.stack)))
        }
        resolve(completed)
      }
    }, queries)
  })
}

async function testMulti () {
  const db = new Connection({
    hostname: 'tfb-database',
    port: 5432,
    user: 'benchmarkdbuser',
    pass: 'benchmarkdbpass',
    database: 'hello_world'
  })
  await db.connect()
  await exec(db, `
BEGIN;
select * from World where id = ${Math.ceil(Math.random() * 100)};
select * from World where id = ${Math.ceil(Math.random() * 100)};
select * from World where id = ${Math.ceil(Math.random() * 100)};
select * from World where id = ${Math.ceil(Math.random() * 100)};
select * from World where id = ${Math.ceil(Math.random() * 100)};
COMMIT;
`, 6, (err, rows) => {
    just.print(rows)
    if (err) return just.error(err.stack)
    if (rows) just.print(JSON.stringify(getRows(db), null, '  '))
  })
  await db.close()
}

async function test () {
  const db = new Connection({
    hostname: 'tfb-database',
    port: 5432,
    user: 'benchmarkdbuser',
    pass: 'benchmarkdbpass',
    database: 'hello_world'
  })
  await db.connect()
  const rows = await db.exec('select * from World limit 3;')
  just.print(JSON.stringify(rows, null, '  '))
  await db.close()
}

async function main () {
  // create a connection
  const tfb = new Connection({
    hostname: 'tfb-database',
    port: 5432,
    user: 'benchmarkdbuser',
    pass: 'benchmarkdbpass',
    database: 'hello_world'
  })
  // save some typing
  const BinaryInt = { format: constants.formats.Binary, oid: constants.fieldTypes.INT4OID }

  // wait for connection/start/auth
  await tfb.connect()

  // Note - These queries all use the default 'adhoc' prepared statement name
  // so only one query at a time can be active on the session with that name,
  // meaning you need to close the adhoc query before creating a new one

  // prepare a query
  let query = await tfb.query('select * from Fortune limit 1')
  // execute the query
  let rows = await query.call()
  just.print(JSON.stringify(rows, null, '  '))
  // execute the query again
  rows = await query.call()
  just.print(JSON.stringify(rows, null, '  '))
  // close the query
  await query.close()

  // prepare a new query
  query = await tfb.query('select * from Fortune')
  // execute the query
  rows = await query.call()
  just.print(JSON.stringify(rows, null, '  '))
  // close the query
  await query.close()

  // prepare a new parameterized query
  const opts = { formats: [BinaryInt], params: [1] }
  query = await tfb.query('select id, randomNumber from World where id = $1', opts)
  // execute the query
  rows = await query.call()
  just.print(JSON.stringify(rows, null, '  '))
  // execute with a different parameter
  rows = await query.call(Math.ceil(Math.random() * 10000))
  just.print(JSON.stringify(rows, null, '  '))

  // close the query
  await query.close()

  // prepare an update query with 2 parameters
  const update = await tfb.query('update World set randomNumber = $2 where id = $1', { formats: [BinaryInt, BinaryInt], params: [1, 1] })
  rows = await update.call(1, 100)
  just.print(JSON.stringify(rows, null, '  '))
  just.print(JSON.stringify(tfb.status(), null, '  '))

  // close the query
  await update.close()

  // Now we will open two different named queries and can run them
  const query1 = await tfb.query('select * from Fortune where id = 1', { name: 'query1' })
  const query2 = await tfb.query('select * from Fortune where id = 2', { name: 'query2' })
  rows = await query1.call()
  just.print(JSON.stringify(rows, null, '  '))
  rows = await query2.call()
  just.print(JSON.stringify(rows, null, '  '))
  await query1.close()
  await query2.close()

  // close the session - underlying connection will be closed on return
  await tfb.close()
}

testMulti().catch(err => just.error(err.stack))
