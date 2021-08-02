const binary = require('@binary')
const { Parser, protocols } = require('@packet')
const websocket = require('websocket')

const { net, SystemError } = just
const { SOCK_RAW, AF_PACKET, PF_PACKET, ETH_P_ALL } = net
const { dump, toMAC, htons16, tcpDump } = binary

const AD = '\u001b[0m'
const AG = '\u001b[32m'
const AM = '\u001b[35m'

function main (iff = 'lo', port = 9222) {
  port = parseInt(port, 10)
  const { buf, u8, parse } = new Parser()
  let i = 0
  let r = 0
  const fd = net.socket(PF_PACKET, SOCK_RAW, htons16(ETH_P_ALL))
  if (fd < 0) throw new SystemError('socket')
  const mac = new ArrayBuffer(6)
  r = net.getMacAddress(fd, iff, mac)
  if (r < 0) throw new SystemError('getMacAddress')
  r = net.bindInterface(fd, iff, AF_PACKET, htons16(ETH_P_ALL))
  if (r < 0) throw new SystemError('bindInterface')
  just.print(`bound to interface ${iff} (${toMAC(new Uint8Array(mac))})`)

  function createWebSocket(name) {
    const color = (name === 'client' ? AM : AG)
    const socket = new websocket.Parser()
    socket.onHeader = message => {
      just.print(`${color}${name}.onHeader${AD}`)
    }
    socket.onChunk = (off, len, header) => {
      if (name === 'client') {
        websocket.unmask(u8, header.maskkey, off, len)
        const json = buf.readString(len, off)
        just.print(JSON.stringify(JSON.parse(json), null, '  '))
        return
      }
      const json = buf.readString(len, off)
      just.print(JSON.stringify(JSON.parse(json), null, '  '))
    }
    socket.onMessage = message => {
      just.print(`${color}${name}.onMessage${AD}`)
    }
    return socket
  }

  const client = createWebSocket('client')
  const server = createWebSocket('server')

  while (1) {
    const bytes = net.recv(fd, buf)
    if (bytes === 0) break
    if (bytes < 0) throw new SystemError('recv')
    if (!(iff === 'lo' && ((i++ % 2) === 0))) {
      const packet = parse(bytes, true)
      const { offset, frame, header } = packet
      if (frame && frame.protocol === 'IPv4' && header && header.protocol === protocols.TCP) {
        if (packet.message && (packet.message.source === port || packet.message.dest === port)) {
          if (packet.bytes > offset) {
            if (u8[offset] === 0x81) {
              if (packet.message.source === port) {
                server.execute(u8, offset, packet.bytes)
              } else {
                client.execute(u8, offset, packet.bytes)
              }
            }
          }
        }
      }
    }
  }
  net.close(fd)
}

main(...just.args.slice(2))
