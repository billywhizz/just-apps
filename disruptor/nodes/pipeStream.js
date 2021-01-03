const node = require('lib/disruptor.js').load()
const { net, sys, fs } = just
const { STDIN_FILENO } = sys
const { AF_UNIX, SOCK_NONBLOCK, SOCK_STREAM, SOMAXCONN, O_NONBLOCK } = net
const { EPOLLERR, EPOLLHUP } = just.loop
const { loop } = just.factory

let index = 0
const buffer = node.buffer
const maxChunk = 64 * 1024
const maxMessages = maxChunk / node.recordSize

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
    let available = node.claim(index)
    if (!available) return
    available = Math.min(maxMessages, available)
    const slot = index % node.bufferSize
    const remaining = node.bufferSize - slot
    if (remaining >= available) {
      const bytes = net.recv(fd, buffer, slot * node.recordSize, available * node.recordSize)
      if (bytes > 0) {
        index += Math.floor(bytes / node.recordSize)
        node.publish(index)
        return
      }
      if (bytes < 0) {
        const errno = sys.errno()
        if (errno === net.EAGAIN) return
        just.error(`recv error: ${sys.strerror(errno)} (${errno})`)
      }
    } else {
      let bytes = net.recv(fd, buffer, slot * node.recordSize, remaining * node.recordSize)
      if (bytes > 0) {
        index += Math.floor(bytes / node.recordSize)
        node.publish(index)
        return
      }
      if (bytes < 0) {
        const errno = sys.errno()
        if (errno === net.EAGAIN) return
        just.error(`recv error: ${sys.strerror(errno)} (${errno})`)
      }
      bytes = net.recv(fd, buffer, 0, (available - remaining))
      if (bytes > 0) {
        index += Math.floor(bytes / node.recordSize)
        node.publish(index)
        return
      }
      if (bytes < 0) {
        const errno = sys.errno()
        if (errno === net.EAGAIN) return
        just.error(`recv error: ${sys.strerror(errno)} (${errno})`)
      }
    }
    index += available
  })
  let flags = sys.fcntl(clientfd, sys.F_GETFL, 0)
  flags |= O_NONBLOCK
  sys.fcntl(clientfd, sys.F_SETFL, flags)
}

function loadStdin () {
  while (1) {
    const available = node.claim(index)
    if (!available) continue
    const wanted = available * node.recordSize
    const off = node.location(index)
    if (wanted - off <= 0) continue
    const bytes = net.read(STDIN_FILENO, buffer, off, wanted - off)
    if (bytes > 0) {
      index += Math.floor(bytes / node.recordSize)
      node.publish(index)
      continue
    }
    if (bytes < 0) {
      const errno = sys.errno()
      if (errno === net.EAGAIN) continue
      just.error(`recv error: ${sys.strerror(errno)} (${errno})`)
    }
    break
  }
}

function listen (sockName = './unix.sock') {
  just.print(sockName)
  const fd = net.socket(AF_UNIX, SOCK_STREAM | SOCK_NONBLOCK, 0)
  fs.unlink(sockName)
  net.bind(fd, sockName)
  net.listen(fd, SOMAXCONN)
  just.print(`listening on ${sockName}`)
  loop.add(fd, onConnect)
}

just.print('replaying from stdin')
loadStdin()
node.send({ loaded: true })
just.print('done replaying')
listen(just.args[2])
