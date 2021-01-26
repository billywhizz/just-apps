const { net, sys, fs } = just
const { AF_UNIX, SOCK_NONBLOCK, SOCK_STREAM, SOMAXCONN, O_NONBLOCK } = net
const { EPOLLERR, EPOLLHUP, EPOLLIN } = just.loop
const { loop } = just.factory

const buffer = new ArrayBuffer(64 * 1024)

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
    if (event & EPOLLIN) {
      const bytes = net.recv(fd, buffer, 65536, 0)
      if (bytes > 0) {
        just.print(`recv ${bytes}`)
        return
      }
      if (bytes < 0) {
        const errno = sys.errno()
        if (errno === net.EAGAIN) return
        just.error(`recv error: ${sys.strerror(errno)} (${errno})`)
      }
    }
  })
  let flags = sys.fcntl(clientfd, sys.F_GETFL, 0)
  flags |= O_NONBLOCK
  sys.fcntl(clientfd, sys.F_SETFL, flags)
}

function listen (sockName = './unix.sock') {
  const fd = net.socket(AF_UNIX, SOCK_STREAM | SOCK_NONBLOCK, 0)
  fs.unlink(sockName)
  net.bind(fd, sockName)
  net.listen(fd, SOMAXCONN)
  just.print(`listening on ${sockName}`)
  loop.add(fd, onConnect)
}

listen(just.args[2])
