
const { sys, net } = just
const { EPOLLIN, EPOLLERR, EPOLLHUP } = just.loop
const { IPPROTO_TCP, O_NONBLOCK, TCP_NODELAY, SO_KEEPALIVE, SOMAXCONN, AF_INET, SOCK_STREAM, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT, SOCK_NONBLOCK } = net

const { loop } = just.factory

const readableMask = EPOLLIN | EPOLLERR | EPOLLHUP

class Server {
  constructor (opts = { host: '127.0.0.1', port: 8080 }) {
    this.host = opts.host || '127.0.0.1'
    this.port = opts.port || 8080
    this.sockets = {}
    const fd = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
    this.fd = fd
    net.setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, 1)
    net.setsockopt(fd, SOL_SOCKET, SO_REUSEPORT, 1)
  }
}

function createServer (opts) {
  const server = new Server(opts)

  net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, 1)
  net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEPORT, 1)
  net.bind(sockfd, host, port)

  function closeSocket (sock) {
    if (sock.closing) return
    const { fd } = sock
    sock.closing = true
    sock.onClose && sock.onClose(sock)
    delete sockets[fd]
    loop.remove(fd)
    net.close(fd)
  }

  function onConnect (fd, event) {
    if (event & EPOLLERR || event & EPOLLHUP) {
      return closeSocket({ fd })
    }
    const clientfd = net.accept(fd)
    const socket = sockets[clientfd] = { fd: clientfd }
    net.setsockopt(clientfd, IPPROTO_TCP, TCP_NODELAY, 0)
    net.setsockopt(clientfd, SOL_SOCKET, SO_KEEPALIVE, 0)
    loop.add(clientfd, (fd, event) => {
      if (event & EPOLLERR || event & EPOLLHUP) {
        closeSocket(socket)
        return
      }
      const { offset } = buffer
      const bytes = net.recv(fd, buffer, offset, byteLength - offset)
      if (bytes > 0) {
        socket.onData(bytes)
        return
      }
      if (bytes < 0) {
        const errno = sys.errno()
        if (errno === net.EAGAIN) return
        just.error(`recv error: ${sys.strerror(errno)} (${errno})`)
      }
      closeSocket(socket)
    })
    let flags = sys.fcntl(clientfd, sys.F_GETFL, 0)
    flags |= O_NONBLOCK
    sys.fcntl(clientfd, sys.F_SETFL, flags)
    loop.update(clientfd, readableMask)
    socket.write = (buf, len = byteLength, off = 0) => {
      const written = net.send(clientfd, buf, len, off)
      if (written > 0) {
        return written
      }
      if (written < 0) {
        const errno = sys.errno()
        if (errno === net.EAGAIN) return written
        just.error(`write error (${clientfd}): ${sys.strerror(errno)} (${errno})`)
      }
      if (written === 0) {
        just.error(`zero write ${clientfd}`)
      }
      return written
    }
    socket.writeString = str => net.sendString(clientfd, str)
    socket.close = () => closeSocket(socket)
    const buffer = server.onConnect(socket)
    const byteLength = buffer.byteLength
    buffer.offset = 0
  }

  function listen (maxconn = SOMAXCONN) {
    const r = net.listen(sockfd, maxconn)
    if (r === 0) loop.add(sockfd, onConnect)
    return r
  }
  server.listen = listen
  server.close = () => net.close(sockfd)
  server.bind = () => net.bind(sockfd, host, port)

  const sockfd = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
  net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, 1)
  net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEPORT, 1)
  net.bind(sockfd, host, port)

  return server
}

module.exports = { createServer }


modules.exports = { createServer, createClient }
