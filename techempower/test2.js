const { Connection, pg } = require('pg.js')
const { constants } = pg

async function main () {
  // create a connection
  const tfb = new Connection({
    hostname: 'tfb-database',
    port: 5432,
    user: 'benchmarkdbuser',
    pass: 'benchmarkdbpass',
    database: 'hello_world'
  })

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

  const { INT4OID } = constants.fieldTypes

  // prepare a new parameterized query
  const opts = { formats: [{ format: 1, oid: INT4OID }], params: [1] }
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
  const update = await tfb.query('update World set randomNumber = $2 where id = $1', { formats: [{ format: 1, oid: INT4OID }, { format: 1, oid: INT4OID }], params: [1, 1] })
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

main().catch(err => just.error(err.stack))
