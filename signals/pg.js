const { Connection, pg, Query } = require('@pg')
const { constants } = pg

const BinaryInt = { format: constants.formats.Binary, oid: constants.fieldTypes.INT4OID }

let done = 0

async function connect () {
  const db = new Connection({
    hostname: 'tfb-database',
    port: 5432,
    user: 'benchmarkdbuser',
    pass: 'benchmarkdbpass',
    database: 'hello_world'
  })
  await db.connect()
  const opts = { fields: [BinaryInt], formats: [BinaryInt], params: [1], name: 'getWorldById' }
  const getWorldById = new Query('select id, randomNumber from World where id = $1', opts)
  await getWorldById.bind(db)
  const { query } = getWorldById
  let rows = 0
  const expected = 64
  function onRow () {
    rows++
    if (rows === expected) {
      done += rows
      rows = 0
      query.append(onRow, true, false)
      query.send()
      return
    }
    query.append(onRow, false, false)
  }
  for (let i = 0; i < expected; i++) {
    query.params[0] = Math.ceil(Math.random() * 10000)
    query.append(onRow, i === expected - 1, false)
  }
  query.send()
}

just.setInterval(() => {
  const rss = just.memoryUsage().rss
  const { user, system } = just.cpuUsage()
  const total = (user + system)
  const upc = total ? (user / total) : 0
  const spc = total ? (system / total) : 0
  just.print(`mem ${rss} cpu ${total} (${upc.toFixed(2)}/${spc.toFixed(2)}) done ${done}`)
  done = 0
}, 1000)

async function main () {
  await Promise.all((new Array(8)).fill(1).map(v => connect()))
}

main().catch(err => just.error(err.stack))
