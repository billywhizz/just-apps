const { createServer } = require('@tcp')
const { createParser } = require('@http')

const connections = {}

function onHTTPConnect (sock) {
  const buf = new ArrayBuffer(4096)
  const parser = createParser(buf)
  parser.onRequests = count => {
    sock.writeString(r200)
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
let r200

function createResponses () {
  const time = (new Date()).toUTCString()
  r200 = `HTTP/1.1 200 OK\r\nServer: j\r\nDate: ${time}\r\nContent-Length: 0\r\n\r\n`
}

createResponses()

just.setInterval(() => {
  const conn = Object.keys(connections).length
  createResponses()
  const rss = just.memoryUsage().rss
  const { user, system } = just.cpuUsage()
  const total = (user + system)
  const upc = total ? (user / total) : 0
  const spc = total ? (system / total) : 0
  just.print(`mem ${rss} cpu ${total} (${upc.toFixed(2)}/${spc.toFixed(2)}) conn ${conn}`)
}, 1000)
