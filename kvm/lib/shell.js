const { net } = just.library('net')
const { sys } = just.library('sys')
const { vm } = just.library('vm')
const { signal } = just.library('signal')

const process = require('process')

// https://www.linusakesson.net/programming/tty/

const { F_SETFL, F_GETFL, STDIN_FILENO, STDOUT_FILENO } = sys
const { O_NONBLOCK, EAGAIN } = net

const { print, error, SystemError } = just
const { read, write, close } = net
const { readString, fork, waitpid, exec, usleep, calloc, setenv, fcntl, errno } = sys
const { runScript } = vm
const { loop } = just.factory

const AG = '\u001b[32m'
const AY = '\u001b[33m'
const AR = '\u001b[31m'
const AD = '\u001b[0m'

const programs = new Set()

function stringify (o, sp = '  ') {
  return JSON.stringify(o, (k, v) => {
    return (typeof v === 'bigint') ? v.toString() : v
  }, sp)
}

function launch (program, ...args) {
  const child = fork()
  if (child === 0) {
    let r = 0
    if (programs.has(program)) {
      r = exec('busybox', [program, ...args])
    } else {
      r = exec(program, args)
    }
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

async function start (mode = 'js') {
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

  function handleInternal (str) {
    const [program, ...args] = str.split(' ')
    if (program === 'exit') {
      just.exit(0)
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
      const result = runScript(str, 'shell.js')
      if (result) print(stringify(result))
      return true
    }
  }

  function prompt () {
    const color = (mode === 'sh' ? AG : AY)
    write(STDOUT_FILENO, calloc(1, `${color}>${AD} `))
  }

  try {
    const buf = new ArrayBuffer(4096)
    let r = fcntl(STDIN_FILENO, F_SETFL, (fcntl(STDIN_FILENO, F_GETFL, 0) | O_NONBLOCK))
    signal.sigaction(signal.SIGCHLD, signum => {})
    signal.sigaction(signal.SIGTERM, signum => just.exit(1, signum))
    r = loop.add(STDIN_FILENO, (fd, event) => {
      let bytes = read(fd, buf)
      while (bytes > 0) {
        prompt(command(readString(buf, bytes).trim()))
        bytes = read(fd, buf)
      }
      if (bytes === 0) {
        just.error('closing stdin')
        close(fd)
      }
      if (bytes < 0) {
        if (errno() !== EAGAIN) {
          just.error((new SystemError(`read ${fd}`)).message)
          close(fd)
        }
      }
    })
    if (r < 0) throw new SystemError('loop.add')
    const bb = process.launch('busybox', ['--list'])
    const chunks = []
    bb.onStdout = (buf, len) => chunks.push(buf.readString(len))
    const status = await process.watch(bb)
    if (status === 0) {
      chunks.join('').split('\n').forEach(p => programs.add(p.trim()))
    }
    prompt()
  } catch (err) {
    just.error(err.stack)
    sys.exit(1)
  }
}

module.exports = { start }
