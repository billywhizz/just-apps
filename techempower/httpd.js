const { createParser } = require('@http')

const defaultOpts = {
  host: '127.0.0.1',
  port: 8080,
  transport: 'tcp',
  tls: false
}

class Server {
  constructor (opts) {
    this.opts = Object.assign({}, opts)
    this.fd = 0
  }

  listen () {

  }
}

function createServer (opts = defaultOpts) {


}

module.exports = { createServer }
