if (!just.library) {
  const cache = {}
  just.library = name => {
    if (cache[name]) return cache[name]
    const lib = just.load(name)
    if (!lib) return {}
    cache[name] = lib
    return lib
  }
}
const { net } = just.library('net')
const { sys } = just.library('sys')
const { vm } = just.library('vm')
const { fs } = just.library('fs')
const { epoll } = just.library('epoll')
const { signal } = just.library('signal') || {}

const { F_SETFL, F_GETFL, STDIN_FILENO, STDOUT_FILENO } = sys
const { O_NONBLOCK, EAGAIN } = net
const { EPOLL_CLOEXEC, EPOLL_CTL_ADD, EPOLLIN } = epoll

const { print, error } = just
const { read, write, close } = net
const { readString, fork, waitpid, exec, usleep, kill, calloc, setenv, fcntl, errno, pid } = sys
const { runScript } = vm
const { create, wait, control } = epoll

class SystemError extends Error {
  constructor (syscall) {
    const { sys } = just
    const errno = sys.errno()
    const message = `${syscall} (${errno}) ${sys.strerror(errno)}`
    super(message)
    this.name = 'SystemError'
  }
}

function stringify (o, sp = '  ') {
  return JSON.stringify(o, (k, v) => {
    return (typeof v === 'bigint') ? v.toString() : v
  }, sp)
}

function prompt () {
  const color = (mode === 'sh' ? AG : AY)
  write(STDOUT_FILENO, calloc(1, `${color}>${AD} `))
}

function launch (program, ...args) {
  const child = fork()
  if (child === 0) {
    const r = exec('busybox', [program, ...args])
    throw new SystemError(`exec ${r}`)
  } else if (child < 0) {
    throw new SystemError(`fork ${child}`)
  } else {
    let [status, kpid] = waitpid(new Uint32Array(2))
    while (kpid !== child) {
      [status, kpid] = waitpid(new Uint32Array(2))
      usleep(1000)
    }
    return [status, kpid]
  }
}

function handleInternal (str) {
  const [program, ...args] = str.split(' ')
  if (program === 'exit') {
    if (signal) {
      kill(pid(), signal.SIGTERM)
    } else {
      just.exit(0)
    }
    return true
  }
  if (program === 'mode') {
    mode = args[0]
    print(`mode switched to ${mode}`)
    return true
  }
  if (program === 'export') {
    const r = setenv(args[0], args[1])
    if (r !== 0) {
      just.error(`${AR}${(new SystemError('setenv').message)}${AD}`)
    }
    return true
  }
  if (mode === 'js') {
    if (str[0] === '!') return
    const result = runScript(str, 'jsh.js')
    print(stringify(result))
    return true
  }
}

function command (str) {
  try {
    if (!handleInternal(str)) {
      let [program, ...args] = str.split(' ')
      if (!program) return
      program = program.replace('!', '')
      const [status, kpid] = launch(program, ...args)
      if (status !== 0) {
        error(`${AR}${program}${AD} (${kpid}) ${status}`)
      }
    }
  } catch (err) {
    error(err.message)
  }
}

function poll (loopfd, events) {
  let r = 0
  r = control(loopfd, EPOLL_CTL_ADD, STDIN_FILENO, EPOLLIN)
  r = wait(loopfd, events.buffer, -1)
  if (r <= 0) {
    poll(loopfd, events)
    return
  }
  if (r > 0) {
    let off = 0
    for (let i = 1; i <= r; i++) {
      const fd = events[off]
      let bytes = read(fd, buf)
      while (bytes > 0) {
        prompt(command(readString(buf, bytes).trim()))
        bytes = read(fd, buf)
      }
      if (bytes === 0) close(fd)
      if (bytes < 0) {
        if (errno() !== EAGAIN) {
          just.error((new SystemError(`read ${fd}`)).message)
          close(fd)
        }
      }
      off += 3
    }
  }
  poll(loopfd, events)
}

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

function shell () {
  const events = new Uint32Array(new ArrayBuffer(128 * 12))
  const loopfd = create(EPOLL_CLOEXEC)
  fcntl(STDIN_FILENO, F_SETFL, (fcntl(STDIN_FILENO, F_GETFL, 0) | O_NONBLOCK))
  if (signal) {
    signal.sigaction(signal.SIGCHLD, signum => {})
    signal.sigaction(signal.SIGTERM, signum => just.exit(1, signum))
  }
  prompt()
  poll(loopfd, events)
}

const AG = '\u001b[32m'
const AY = '\u001b[33m'
const AR = '\u001b[31m'
const AD = '\u001b[0m'
let mode = 'js'
const stat = new BigUint64Array(20)
const buf = new ArrayBuffer(4096)

/*
if (pid === 1) {
  runScript(just.builtin('lib/init.js') || readFile('/lib.init.js'), 'init.js')
} else {
  shell()
}
*/

shell()
