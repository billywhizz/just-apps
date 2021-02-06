const { signal } = just.library('signal')
const { sys } = just.library('sys')
const { fs } = just.library('fs')
const { vm } = just.library('vm')

const ignore = new Array(32)
const MAXSIG = 31
const TIOCNOTTY = 0x5422
const TIOCSCTTY = 0x540E
const sigmask = new ArrayBuffer(128)
function shutdown (signum) {
  if (signum === signal.SIGWINCH) return
  if (just.pid === 1) {
    just.exit(0)
  } else {
    just.exit(1, signum)
  }
}

function init () {
  function onSignal (signum) {
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
          // negative pid kills all child processes which are members
          // of the process group of this pid
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
  just.pid = sys.pid()
  if (just.pid === 1) {
    fs.mount('proc', '/proc', 'proc', 0n, '')
    fs.mount('none', '/sys', 'sysfs', 0n, '')
  }
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
  if (child === 0) {
    signal.sigprocmask(sigmask, signal.SIG_UNBLOCK, 1)
    if (sys.setsid() === -1) {
      sys.exit(1)
    }
    sys.ioctl(sys.STDIN_FILENO, TIOCSCTTY)
    signal.reset()
    for (let i = 1; i < 32; i++) signal.sigaction(i, shutdown)
    signal.sigaction(signal.SIGPIPE)
    vm.runScript(just.builtin('app.js'), 'app.js')
    just.factory.run()
    return
  }
  just.net.close(just.sys.STDIN_FILENO)
  signal.reset()
  just.chdir('/')
  for (let i = 1; i <= MAXSIG; i++) {
    signal.sigaction(i, onSignal)
  }
  signal.sigaction(signal.SIGPIPE)
  just.setInterval(() => {}, 1000)
  //const status = new Uint32Array(2)
  //sys.waitpid(status, child)
  //while (status[0] === 0) {
  //  sys.usleep(10000)
  //  sys.waitpid(status, child)
  //}
}

if (just.sys.pid() === 1) {
  init()
} else {
  vm.runScript(just.builtin('app.js') || just.fs.readFile('app.js'), 'app.js')
}
