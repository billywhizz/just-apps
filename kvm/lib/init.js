if (!just.library) {
  const cache = {}
  just.library = name => {
    if (cache[name]) return cache[name]
    cache[name] = just.load(name)
    return cache[name]
  }
}

const { signal } = just.library('signal')
const { sys } = just.library('sys')
const { fs } = just.library('fs')
const { vm } = just.library('vm')
const { epoll } = just.library('epoll')
const { net } = just.library('net')

const signals = Object.keys(signal)
  .filter(k => k.match(/^SIG[A-Z].+/))
  .reduce((s, k) => (s[signal[k]] = k) && s, {})

const AG = '\u001b[32m'
const AY = '\u001b[33m'
const AR = '\u001b[31m'
const AD = '\u001b[0m'

just.signal = signal
just.sys = sys
just.fs = fs
just.vm = vm

just.epoll = epoll
just.net = net

const stat = new BigUint64Array(20) // single instance for file stats

function readFile (path, flags = fs.O_RDONLY) {
  const fd = fs.open(path, flags)
  if (fd < 0) return fd
  let r = fs.fstat(fd, stat)
  if (r < 0) throw new Error(`Error Stating File: ${sys.errno()}`)
  const size = Number(stat[7])
  const buf = new ArrayBuffer(size)
  let off = 0
  let len = net.read(fd, buf, off)
  while (len > 0) {
    off += len
    if (off === size) break
    len = net.read(fd, buf, off)
  }
  off += len
  r = net.close(fd)
  if (len < 0) {
    const errno = sys.errno()
    throw new Error(`Error Reading File: ${errno} (${sys.strerror(errno)})`)
  }
  if (off < size) {
    throw new Error(`Size Mismatch: size: ${size}, read: ${off}`)
  }
  if (r < 0) throw new Error(`Error Closing File: ${sys.errno()}`)
  return sys.readString(buf)
}

function onSignal (signum) {
  just.print(`${AG}signal${AD} ${signals[signum]} (${signum}) received`)
  if (ignore[signum]) {
    ignore[signum] = 0
    return
  }
  let exitStatus = 0
  if (signum === signal.SIGCHLD) {
    let [status, kpid] = sys.waitpid(new Uint32Array(2))
    while (kpid > 0) {
      if ((status & 0x7f) === 0) { // WIFEXITED
        exitStatus = ((status & 0xff00) >> 8) // WEXITSTATUS
      } else {
        // assert(WIFSIGNALED(status));
        exitStatus = 128 + (status & 0x7f) // WTERMSIG
      }
      if (kpid === child) {
        sys.kill(-child, signal.SIGTERM)
        sys.exit(exitStatus)
      }
      [status, kpid] = sys.waitpid(new Uint32Array(2))
    }
  }
  if (signum !== 0) sys.kill(-child, signum)
  if (signum === signal.SIGTSTP ||
    signum === signal.SIGTTOU ||
    signum === signal.SIGTTIN) {
    sys.kill(sys.pid(), signal.SIGSTOP)
  }
}

function parentMain () {
  signal.reset()
  just.chdir('/')
  for (let i = 1; i <= MAXSIG; i++) {
    signal.sigaction(i, onSignal)
  }
  while (1) just.sleep(1)
}

function shutdown (signum) {
  just.print(`${AY}signal${AD} ${signals[signum]} (${signum}) received`)
  if (signum === signal.SIGWINCH) return
  //just.error(`shutting down ${signum}`)
  if (just.pid === 1) {
    //just.sys.reboot()
    just.exit(0)
  } else {
    just.exit(1, signum)
  }
}

function childMain () {
  signal.sigprocmask(sigmask, signal.SIG_UNBLOCK, 1)
  if (sys.setsid() === -1) {
    sys.exit(1)
  }
  const r = sys.ioctl(sys.STDIN_FILENO, TIOCSCTTY)
  if (r !== 0) just.print(`TIOCSCTTY ${r}`)
  signal.reset()
  for (let i = 1; i < 32; i++) signal.sigaction(i, shutdown)
  vm.runScript(just.builtin('app.js') || readFile('/sbin/app.js'), 'app.js')
  if (just.pid === 1) {
    just.sys.reboot()
  } else {
    just.exit(0)
  }
}

just.pid = sys.pid()
if (just.pid === 1) {
  fs.mount('proc', '/proc', 'proc', 0n, '')
  fs.mount('none', '/sys', 'sysfs', 0n, '')
}
const ignore = new Array(32)
const MAXSIG = 31
const TIOCNOTTY = 0x5422
const TIOCSCTTY = 0x540E
const sigmask = new ArrayBuffer(128)
signal.SIGTTIN = 21
signal.SIGTTOU = 22
ignore.fill(0)
signal.sigfillset(sigmask)
signal.sigprocmask(sigmask, signal.SIG_BLOCK, 1)
if (sys.ioctl(sys.STDIN_FILENO, TIOCNOTTY) !== -1) {
  if (sys.getsid(0) === sys.pid()) {
    ignore[signal.SIGHUP] = 1
    ignore[signal.SIGCONT] = 1
  }
}
const child = sys.fork()
if (child < 0) sys.exit(1)
child === 0 ? childMain() : parentMain()
