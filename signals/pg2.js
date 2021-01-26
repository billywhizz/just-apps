const { Connection, pg, Query } = require('@pg')
const { constants } = pg

const BinaryInt = { format: constants.formats.Binary, oid: constants.fieldTypes.INT4OID }

async function main () {
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
  //const rows = await getWorldById.call(Math.ceil(Math.random() * 10000))
  //just.print(JSON.stringify(rows))
  const { query } = getWorldById
  let done = 0
  const rows = []
  const expected = 100
  function onRow () {
    rows.push(query.getRows()[0])
    if (rows.length === expected) {
      done += rows.length
      rows.length = 0
      for (let i = 0; i < expected; i++) {
        query.params[0] = Math.ceil(Math.random() * 10000)
        query.append(onRow)
      }
      query.send()
    }
  }
  for (let i = 0; i < expected; i++) {
    query.params[0] = Math.ceil(Math.random() * 10000)
    query.append(onRow)
  }
  query.send()
  just.setInterval(() => {
    const rss = just.memoryUsage().rss
    const { user, system } = just.cpuUsage()
    const total = (user + system)
    const upc = total ? (user / total) : 0
    const spc = total ? (system / total) : 0
    just.print(`mem ${rss} cpu ${total} (${upc.toFixed(2)}/${spc.toFixed(2)}) done ${done}`)
    done = 0
  }, 1000)
  //await getWorldById.close()
  //await db.close()
}

main().catch(err => just.error(err.stack))
