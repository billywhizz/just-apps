const node = require('lib/disruptor.js').load()
const { net, fs, sys } = just
const { AF_UNIX, SOCK_NONBLOCK, SOCK_STREAM, SOMAXCONN, O_NONBLOCK } = net
const { EPOLLERR, EPOLLHUP } = just.loop
const { loop } = just.factory

let index = 0
const buffer = node.buffer

function onConnect (fd, event) {
  if (event & EPOLLERR || event & EPOLLHUP) {
    return net.close(fd)
  }
  const clientfd = net.accept(fd)
  loop.add(clientfd, (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      just.print('error')
      net.close(fd)
      return
    }
    const available = node.claim(index)
    if (!available) return
    const wanted = available * node.recordSize
    const off = node.location(index)
    if (wanted - off <= 0) return
    const bytes = net.recv(fd, buffer, off, wanted - off)
    if (bytes > 0) {
      let messages = Math.floor(bytes / node.recordSize)
      while (messages--) {
        node.dv.setUint16(node.location(index), 1)
        node.dv.setBigUint64(node.location(index) + 2, BigInt(index++))
      }
      node.publish(index)
      return
    }
    if (bytes < 0) {
      const errno = sys.errno()
      if (errno === net.EAGAIN) return
      just.error(`recv error: ${sys.strerror(errno)} (${errno})`)
    }
    //net.close(fd)
  })
  let flags = sys.fcntl(clientfd, sys.F_GETFL, 0)
  flags |= O_NONBLOCK
  sys.fcntl(clientfd, sys.F_SETFL, flags)
}

function main () {
  const fd = net.socket(AF_UNIX, SOCK_STREAM | SOCK_NONBLOCK, 0)
  fs.unlink('./unix.sock')
  net.bind(fd, './unix.sock')
  net.listen(fd, SOMAXCONN)
  loop.add(fd, onConnect)
}

main()
