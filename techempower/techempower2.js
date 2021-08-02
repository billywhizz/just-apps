
const { createServer } = require('httpd.js')

const opts = { host: '0.0.0.0', port: 8080 }
const httpd = createServer(opts)

const message = { message: 'Hello, World!' }
const text = 'Hello, World!'
const extra = [0, 'Additional fortune added at request time.']

httpd.get('/plaintext', sock => sock.respond(200, text))
httpd.get('/json', sock => sock.respond(200, JSON.stringify(message)))

