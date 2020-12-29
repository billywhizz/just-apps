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

function close (query) {
  return new Promise((resolve, reject) => {
    query.close(true, err => {
      if (err) return reject(err)
      resolve()
    })
  })
}

function terminate (sock) {
  return new Promise(resolve => sock.terminate(resolve))
}

class Query {
  constructor (sql, { formats = [], fields = [], params = [], name = 'adhoc', maxRows = 0, portal = '' }) {
    this.sql = sql
    this.sock = null
    this.query = null
    this.opts = {
      formats,
      sql,
      fields,
      name,
      portal,
      maxRows,
      params
    }
  }

  async bind (connection) {
    const { sock } = connection
    this.sock = sock
    this.query = await compile(sock, this.opts)
    this.query.fields = sock.parser.fields.slice(0)
  }

  async call (...args) {
    if (args && args.length) this.query.params = args
    await call(this.query)
    const { fields } = this.query
    const rows = this.query.getRows().map(r => {
      const row = {}
      let i = 0
      for (const field of fields) {
        row[field.name] = r[i++]
      }
      return row
    })
    return rows
  }

  async close () {
    await close(this.query)
  }
}

class Connection {
  constructor (db) {
    this.sock = null
    this.db = db
  }

  async connect () {
    const connection = this
    connection.sock = await connect(connection.db)
    await start(connection.sock)
    await authenticate(connection.sock)
  }

  async query (sql, opts = {}) {
    const query = new Query(sql, opts)
    await query.bind(this)
    return query
  }

  status () {
    const { query, status, errors } = this.sock.parser
    return { count: query.rows, status: String.fromCharCode(status), errors: errors.slice(0) }
  }

  async close () {
    await terminate(this.sock)
  }
}

module.exports = { Connection, Query, pg }
