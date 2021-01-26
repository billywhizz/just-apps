const { createServer } = require('@tcp')
const { createParser } = require('@http')
const { memory } = just.library('memory', './modules/memory/memory.so')

const connections = {}

function onHTTPConnect (sock) {
  const buf = new ArrayBuffer(4096)
  const parser = createParser(buf)
  parser.onRequests = count => {
    //sock.writeString(r200)
    memory.send(sock.fd, b200.raw)
  }
  sock.onData = bytes => parser.parse(bytes)
  sock.onClose = () => {
    parser.free()
  }
  connections[sock.fd] = sock
  return parser.buffer
}

const server = createServer('0.0.0.0', 8080)
server.onConnect = onHTTPConnect
server.listen()
const time = (new Date()).toUTCString()
const r200 = `HTTP/1.1 200 OK\r\nServer: j\r\nDate: ${time}\r\nContent-Length: 0\r\n\r\n`
const b200 = ArrayBuffer.fromString(r200)
b200.raw = memory.rawBuffer(b200)

just.setInterval(() => {
  just.print(Object.keys(connections).length)
}, 1000)
