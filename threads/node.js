const { send, socketpair, AF_UNIX, SOCK_STREAM, close, recv } = just.net
const { EPOLLERR, EPOLLHUP } = just.loop
const { thread } = just.library('thread')
const { loop } = just.factory
const { SystemError } = just

function createPipe () {
  const fds = []
  const r = socketpair(AF_UNIX, SOCK_STREAM, fds)
  if (r !== 0) throw new SystemError('socketpair')
  return fds
}

function spawn (source, core, shared, args = just.args) {
  const ipc = createPipe()
  const tid = thread.spawn(source, just.builtin('just.js'), ['', ...args], shared, ipc[1])
  thread.setAffinity(tid, core)
  thread.setName(tid, args[0])
  const t = { tid, core, shared }
  t.send = o => send(ipc[0], ArrayBuffer.fromString(JSON.stringify(o)))
  t.onMessage = () => {}
  loop.add(ipc[0], (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      close(fd)
      return
    }
    const buf = new ArrayBuffer(16384)
    const bytes = recv(fd, buf)
    if (bytes > 0) t.onMessage(JSON.parse(buf.readString(bytes)))
  })
  return t
}

