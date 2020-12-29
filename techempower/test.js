const pg = require('@pg')

function connect (config) {
  return new Promise((resolve, reject) => {
    pg.connect(config, (err, sock) => {
      if (err) return reject(err)
      resolve(sock)
    })
  })
}

function start (sock) {
  return new Promise((resolve, reject) => {
    sock.start(err => {
      if (err) return reject(err)
      resolve()
    })
  })
}

function authenticate (sock) {
  return new Promise((resolve, reject) => {
    sock.authenticate(err => {
      if (err) return reject(err)
      resolve()
    })
  })
}

function compile (sock, query) {
  return new Promise((resolve, reject) => {
    const result = sock.compile(query, err => {
      if (err) return reject(err)
      resolve(result)
    })
  })
}

function call (query) {
  return new Promise((resolve, reject) => {
    query.call(err => {
      if (err) return reject(err)
      resolve()
    })
  })
}

function describe (query) {
  return new Promise((resolve, reject) => {
    query.describe(true, err => {
      if (err) return reject(err)
      resolve()
    })
  })
}

function close (query) {
  return new Promise((resolve, reject) => {
    query.close(true, err => {
      if (err) return reject(err)
      resolve()
    })
  })
}

async function main () {
  const tfb = {
    hostname: 'tfb-database',
    port: 5432,
    user: 'benchmarkdbuser',
    pass: 'benchmarkdbpass',
    database: 'hello_world'
  }
  const { INT4OID, VARCHAROID } = pg.constants.fieldTypes
  const sock = await connect(tfb)
  await start(sock)
  await authenticate(sock)
  const query = {
    formats: [{ format: 1, oid: INT4OID }],
    sql: 'select id, randomNumber from World where id = $1',
    fields: [],
    name: 's1',
    portal: '',
    maxRows: 0,
    params: [1]
  }
  let getWorldById = await compile(sock, query)
  query.fields = sock.parser.fields.slice(0)
  just.print(JSON.stringify(query.fields))
  await close(query)
  getWorldById = await compile(sock, query)
  getWorldById.params[0] = Math.ceil(Math.random() * 10000)
  await call(getWorldById)
  just.print(JSON.stringify(getWorldById.getRows()))
}

main().catch(err => just.error(err.stack))
