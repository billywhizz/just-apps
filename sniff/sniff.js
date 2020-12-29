const binary = require('@binary')
const { Parser, protocols } = require('@packet')

function IPv6Address (address) {
  return `${address[0].toString(16).padStart(2, '0')}${address[1].toString(16).padStart(2, '0')}:${address[2].toString(16).padStart(2, '0')}${address[3].toString(16).padStart(2, '0')}:${address[4].toString(16).padStart(2, '0')}${address[5].toString(16).padStart(2, '0')}`
}

function onPacket (packet, u8) {
  const { offset, bytes, frame, header } = packet
  if (packet.header.version === 6) {
    just.print(`source ${IPv6Address(packet.frame.source)} dest ${IPv6Address(packet.frame.dest)}`)
  }
  if (frame && frame.protocol === 'IPv4' && header && header.protocol === protocols.TCP) {
    // tcp frames
    just.print(tcpDump(packet))
    if (bytes > offset) just.print(dump(u8.slice(offset, bytes)), false)
    just.print('')
  } else if (frame && frame.protocol === 'IPv4' && header && header.protocol === protocols.UDP) {
    // handle a udp message
    just.print(udpDump(packet))
    if (bytes > offset) just.print(dump(u8.slice(offset, bytes)), false)
    just.print('')
  }
}

const { net, SystemError } = just
const { SOCK_RAW, AF_PACKET, PF_PACKET, ETH_P_ALL } = net
const { dump, toMAC, htons16, tcpDump, udpDump } = binary

function main (args) {
  const { buf, u8, parse } = new Parser()
  const iff = args[0]
  let i = 0
  const fd = net.socket(PF_PACKET, SOCK_RAW, htons16(ETH_P_ALL))
  if (fd < 0) throw new SystemError('socket')
  if (iff) {
    // bind to a specific interface
    const mac = new ArrayBuffer(6)
    let r = net.getMacAddress(fd, iff, mac)
    if (r < 0) throw new SystemError('getMacAddress')
    r = net.bindInterface(fd, iff, AF_PACKET, htons16(ETH_P_ALL))
    if (r < 0) throw new SystemError('bindInterface')
    just.print(`bound to interface ${iff} (${toMAC(new Uint8Array(mac))})`)
  }
  while (1) {
    // this is synchronous - no need for the event loop
    const bytes = net.recv(fd, buf)
    if (bytes === 0) break
    if (bytes < 0) throw new SystemError('recv')
    // hack to ignore duplicates on lo until we have recvfrom: https://stackoverflow.com/questions/17194844/packetsocket-opened-on-loopback-device-receives-all-the-packets-twice-how-to-fi
    if (!(iff === 'lo' && ((i++ % 2) === 0))) onPacket(parse(bytes, true), u8)
  }
  net.close(fd)
}

main(just.args[0] === 'just' ? just.args.slice(2) : just.args.slice(1))
