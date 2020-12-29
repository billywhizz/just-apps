const { Connection, pg, Query } = require('@pg')
const { constants } = pg

const BinaryInt = { format: constants.formats.Binary, oid: constants.fieldTypes.INT4OID }
const VarChar = { format: constants.formats.Text, oid: constants.fieldTypes.VARCHAROID }

function getIds (count) {
  const updates = []
  for (let i = 1; i < (count * 2); i += 2) {
    updates.push(`$${i}`)
  }
  return updates.join(',')
}

function getClauses (count) {
  const clauses = []
  for (let i = 1; i < (count * 2); i += 2) {
    clauses.push(`when $${i} then $${i + 1}`)
  }
  return clauses.join('\n')
}

async function compileBatchUpdate (name, db, updates = 5) {
  const opts = { formats: [BinaryInt], params: Array(updates * 2).fill(0), name: `${name}.${updates}` }
  const sql = []
  sql.push('update world set randomnumber = CASE id')
  sql.push(getClauses(updates))
  sql.push('else randomnumber')
  sql.push(`end where id in (${getIds(updates)})`)
  const query = new Query(sql.join('\n'), opts)
  await query.bind(db)
  return query
}

async function main () {
  const db = new Connection({
    hostname: 'tfb-database',
    port: 5432,
    user: 'benchmarkdbuser',
    pass: 'benchmarkdbpass',
    database: 'hello_world'
  })

  await db.connect()

  let opts
  let rows

  opts = { fields: [BinaryInt], formats: [BinaryInt], params: [1], name: 'getWorldById' }
  const getWorldById = new Query('select id, randomNumber from World where id = $1', opts)
  await getWorldById.bind(db)

  opts = { fields: [BinaryInt, VarChar], name: 'allFortunes' }
  const allFortunes = new Query('select * from Fortune', opts)
  await allFortunes.bind(db)

  opts = { formats: [BinaryInt], name: 'updateWorldById', params: [1, 1] }
  const updateWorldById = new Query('update World set randomNumber = $2 where id = $1', opts)
  await updateWorldById.bind(db)

  const multis = {}
  for (let i = 1; i < 6; i++) {
    multis[i] = (await compileBatchUpdate('foo', db, i))
  }

  rows = await getWorldById.call(Math.ceil(Math.random() * 10000))
  just.print(JSON.stringify(rows))

  rows = await allFortunes.call()
  just.print(JSON.stringify(rows))

  const rand = Math.ceil(Math.random() * 10000)
  rows = await updateWorldById.call(1, rand)
  just.print(JSON.stringify(rows))

  rows = await getWorldById.call(1)
  just.print(JSON.stringify(rows))
  if (rows[0].randomnumber !== rand) throw new Error('Update Failed')

  const args = [1, Math.ceil(Math.random() * 10000), 2, Math.ceil(Math.random() * 10000), 3, Math.ceil(Math.random() * 10000), 4, Math.ceil(Math.random() * 10000), 5, Math.ceil(Math.random() * 10000)]
  rows = await multis[5].call(...args)
  just.print(JSON.stringify(rows))

  await getWorldById.close()
  await allFortunes.close()
  await updateWorldById.close()

  for (let i = 1; i < 6; i++) {
    await multis[i].close()
  }

  opts = { fields: [BinaryInt, BinaryInt], name: 'check' }
  const check = new Query('select id, randomnumber from World where id in (1, 2, 3, 4, 5) order by id', opts)
  await check.bind(db)
  rows = await check.call()
  just.print(JSON.stringify(args))
  just.print(JSON.stringify(rows))
  await check.close()

  await db.close()
}

main().catch(err => just.error(err.stack))
