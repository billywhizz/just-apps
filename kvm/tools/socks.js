const { createServer, createClient } = require('unix.js')
const { createParser, HTTP_RESPONSE } = require('@http')

const connections = {}

function onServerConnect (sock) {
  const buf = new ArrayBuffer(4096)
  const parser = createParser(buf)
  parser.onRequests = count => {
    const request = parser.get(1)
    just.print(JSON.stringify(request, null, '  '))
    sock.writeString(`HTTP/1.1 200 OK\r\nDate: ${(new Date()).toUTCString()}\r\nContent-Length: 0\r\n\r\n`)
  }
  sock.onData = bytes => parser.parse(bytes)
  sock.onClose = () => {
    parser.free()
    delete connections[sock.fd]
  }
  connections[sock.fd] = sock
  return parser.buffer
}

const sockName = './httpd.sock'

const server = createServer(sockName)
server.onConnect = onServerConnect
server.listen()

function onClientConnect (err, sock) {
  if (err) throw err
  const buf = new ArrayBuffer(4096)
  const parser = createParser(buf, HTTP_RESPONSE)
  parser.onResponses = count => {
    const response = parser.get(1)
    just.print(JSON.stringify(response, null, '  '))
  }
  sock.onData = bytes => parser.parse(bytes)
  sock.onClose = () => {
    parser.free()
  }
  just.setTimeout(() => {
    sock.writeString('GET / HTTP/1.1\r\n\r\n')
  }, 1000)
  return parser.buffer
}

const client = createClient(sockName)
client.onConnect = onClientConnect
client.connect()
