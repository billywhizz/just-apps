const { EPOLLIN, EPOLLERR, EPOLLHUP, EPOLLOUT } = just.loop
const { net } = just
const { AF_UNIX, SOCK_NONBLOCK, SOCK_STREAM, SOMAXCONN, O_NONBLOCK } = net
const { loop } = just.factory

function connect (sockName = './unix.sock') {
  return new Promise ((resolve, reject) => {
    const fd = net.socket(AF_UNIX, SOCK_STREAM | SOCK_NONBLOCK, 0)
    net.connect(fd, sockName)
    loop.add(fd, (fd, event) => {
      if (event & EPOLLERR || event & EPOLLHUP) {
        net.close(fd)
        reject(new Error(just.SystemError('connect')))
        return
      }
      if (event & EPOLLOUT) {
        const sock = { fd, connected: true }
        loop.update(fd, (fd, event) => {
          if (event & EPOLLERR || event & EPOLLHUP) {
            net.close(fd)
            sock.connected = false
            return
          }
          

        }, EPOLLIN | EPOLLERR | EPOLLHUP | EPOLLOUT)
        resolve(sock)
      }
    }, EPOLLERR | EPOLLHUP | EPOLLOUT)
  })
}

async function run () {
  const sock = await connect('./unix.sock')
  while (sock.connected) {
    const [buf, bytes] = await sock.read()
    if (buf) {
      just.print()
    }
  }
}

run().catch(err => just.error(err.stack))
