const { print, net } = just
const { signal } = just.library('signal', './modules/signal/signal.so')
const { EPOLLIN } = just.loop
const { signalfd, sigaddset, sigprocmask, sigemptyset } = signal
const { loop } = just.factory

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)

function onSignal (siginfo) {
  const view = new DataView(siginfo)
  const signo = view.getUint32(0, true)
  const errno = view.getInt32(4, true)
  const code = view.getInt32(8, true)
  const pid = view.getUint32(12, true)
  const uid = view.getUint32(16, true)
  const fd = view.getInt32(20, true)
  const tid = view.getUint32(24, true)
  const band = view.getUint32(28, true)
  const overrun = view.getUint32(32, true)
  const trapno = view.getUint32(36, true)
  const status = view.getInt32(40, true)
  const int = view.getInt32(44, true)
  const ptr = view.getBigUint64(48, true)
  const utime = view.getBigUint64(56, true)
  const stime = view.getBigUint64(64, true)
  const addr = view.getBigUint64(72, true)
  print(stringify({ signo, errno, code, pid, uid, fd, tid, band, overrun, trapno, status, int, ptr, utime, stime, addr }))
}

const sigmask = new ArrayBuffer(1024)
const siginfo = new ArrayBuffer(1024)

let r = 0

function onSignal2 () {
  just.print('foo')
}

// we need to clear the handlers for the signals we are interested in
// as it seems v8 installs a default handler for all signals
signal.sigaction(signal.SIGUSR1, onSignal2)
signal.sigaction(signal.SIGHUP, onSignal2)
signal.sigaction(signal.SIGINT, onSignal2)

// add the signals we are interested in to the process signal mask
r = sigprocmask(sigmask, signal.SIG_SETMASK, 1)
if (r < 0) throw new SystemError('sigprocmask')
r = sigaddset(sigmask, signal.SIGUSR1)
if (r < 0) throw new SystemError('sigaddset')
r = sigaddset(sigmask, signal.SIGHUP)
if (r < 0) throw new SystemError('sigaddset')
r = sigaddset(sigmask, signal.SIGINT)
if (r < 0) throw new SystemError('sigaddset')
r = sigprocmask(sigmask, signal.SIG_SETMASK, 0)
if (r < 0) throw new SystemError('sigprocmask')

// create signal fd with signals we are interested in
r = sigemptyset(sigmask)
if (r < 0) throw new SystemError('sigemptyset')
r = sigaddset(sigmask, signal.SIGUSR1)
if (r < 0) throw new SystemError('sigaddset')
r = sigaddset(sigmask, signal.SIGHUP)
if (r < 0) throw new SystemError('sigaddset')
r = sigaddset(sigmask, signal.SIGINT)
if (r < 0) throw new SystemError('sigaddset')
const sigfd = signalfd(sigmask, 0)
if (sigfd <= 0) throw new SystemError('signalfd')

const pid = just.sys.pid()

r = loop.add(sigfd, (fd, event) => {
  just.print('event')
  if (event & EPOLLIN) {
    just.print('EPOLLIN')
    let bytes = net.read(fd, siginfo)
    just.print(bytes)
    if (bytes < 0) {
      //net.close(fd)
      return
    }
    onSignal(siginfo)
  }
}, EPOLLIN)
if (r < 0) throw new SystemError('loop.add')

just.setInterval(() => {
  just.print(`pid ${pid} mem ${just.memoryUsage().rss}`)
}, 1000)
