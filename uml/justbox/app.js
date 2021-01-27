const AD = '\u001b[0m' // ANSI Default
const AR = '\u001b[31m' // ANSI Red
const AY = '\u001b[33m' // ANSI Yellow
const AB = '\u001b[34m' // ANSI Blue
const AM = '\u001b[35m' // ANSI Magenta
const AC = '\u001b[36m' // ANSI Cyan
const AG = '\u001b[32m' // ANSI Green

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)
const { read, write, close } = just.net
const { STDIN_FILENO, STDOUT_FILENO, STDERR_FILENO, calloc, readString } = just.sys

const { chdir } = just
const { cwd, strerror, errno, kill } = just.sys
const { readdir, open, O_RDONLY, fstat, S_IXUSR, S_IXGRP, S_IXOTH } = just.fs
const { S_IFMT, S_IFSOCK, S_IFLNK, S_IFREG, S_IFBLK, S_IFDIR, S_IFCHR, S_IFIFO, S_IRUSR, S_IWUSR, S_IRGRP, S_IWGRP, S_IROTH, S_IWOTH } = just.fs

const { runScript } = just.vm
const { SIGTERM } = just.signal

const pid = just.sys.pid()
const stat = new BigUint64Array(20) // single instance for file stats

const buffers = {
  read: new ArrayBuffer(4096),
  prompt: just.sys.calloc(1, `${AG}>${AD} `)
}

function readFile (path, flags = O_RDONLY) {
  const fd = open(path, flags)
  const buf = new ArrayBuffer(4096)
  const parts = []
  if (fd < 0) return ''
  let bytes = read(fd, buf)
  while (bytes > 0) {
    parts.push(readString(buf, bytes, 0))
    bytes = read(fd, buf)
  }
  if (bytes < 0) return ''
  close(fd)
  return parts.join('')
}

function readCString (buf, len = buf.byteLength, off = 0) {
  const u8 = new Uint8Array(buf)
  const start = off
  let c = u8[off]
  while (c !== 0) {
    len--
    if (len === 0) {
      break
    }
    off++
    c = u8[off]
  }
  return readString(buf, off - start, start)
}

function hexdump (bytes, len = bytes.length, off = 0, width = 16, pos = 0) {
  const result = []
  const chars = []
  for (let i = 0; i < len; i++) {
    if (i % width === 0) {
      if (i === 0) {
        result.push('')
      } else {
        result.push(` ${chars.join('')}\n`)
        chars.length = 0
      }
    }
    if (i % 8 === 0) {
      result.push(`${AG}${i.toString().padStart(5, ' ')}${AD}`)
    }
    result.push(` ${bytes[i].toString(16).padStart(2, '0')}`)
    if (bytes[i] >= 32 && bytes[i] <= 126) {
      chars.push(`${AC}${String.fromCharCode(bytes[i])}${AD}`)
    } else {
      chars.push('.')
    }
  }
  const remaining = width - (len % width)
  if (remaining === width) {
    result.push(` ${chars.join('')}\n`)
  } else if (remaining < 8) {
    result.push(`${'   '.repeat(remaining)} ${chars.join('')}\n`)
  } else {
    result.push(`${'   '.repeat(remaining)}      ${chars.join('')}\n`)
  }
  return result.join('')
}

function prompt () {
  write(STDOUT_FILENO, buffers.prompt)
}

function print (str = '\n', le = '') {
  write(STDOUT_FILENO, calloc(1, str))
  if (le) write(STDOUT_FILENO, calloc(1, le))
}

function error (str = '\n', le = '') {
  write(STDERR_FILENO, calloc(1, str))
  if (le) write(STDERR_FILENO, calloc(1, le))
}

function poll () {
  while (1) {
    const bytes = read(STDIN_FILENO, buffers.read)
    if (bytes > 0) {
      run(readString(buffers.read, bytes).trim())
      prompt()
    }
  }
}

function sortBy (arr, field) {
  return arr.sort((a, b) => {
    if (a[field] > b[field]) return 1
    if (a[field] < b[field]) return -1
    return 0
  })
}

function checkFlag (val, flag) {
  return (val & flag) === flag
}

function checkMode (val, mode) {
  return (val & S_IFMT) === mode
}

function getColor (entry, parent) {
  if (parent[parent.length - 1] !== '/') parent = `${parent}/`
  const fd = open(`${parent}${entry.name}`)
  fstat(fd, stat)
  close(fd)
  // const size = stat[7]
  const mode = Number(stat[1])
  // const modified = { tv_sec: stat[14], tv_usec: stat[15] }
  const executable = checkFlag(mode, S_IXUSR) || checkFlag(mode, S_IXGRP) || checkFlag(mode, S_IXOTH)
  const type = {
    socket: checkMode(mode, S_IFSOCK),
    symlink: checkMode(mode, S_IFLNK),
    regular: checkMode(mode, S_IFREG),
    block: checkMode(mode, S_IFBLK),
    directory: checkMode(mode, S_IFDIR),
    character: checkMode(mode, S_IFCHR),
    fifo: checkMode(mode, S_IFIFO)
  }
  if (type.directory) return AB
  if (type.character) return AY
  if (type.socket) return AM
  if (type.regular) {
    if (type.symlink) return AC
    if (executable) return AG
  }
  return AD
}

// System Calls

function cat (path, flags = O_RDONLY) {
  const fd = open(path, flags)
  const buf = new ArrayBuffer(4096)
  if (fd < 0) return fd
  let bytes = read(fd, buf)
  while (bytes > 0) {
    write(STDOUT_FILENO, buf, bytes)
    bytes = read(fd, buf)
  }
  if (bytes < 0) return bytes
  close(fd)
  return 0
}

function xxd (path, flags = O_RDONLY) {
  const fd = open(path, flags)
  const buf = new ArrayBuffer(4096)
  const u8 = new Uint8Array(buf)
  if (fd < 0) return fd
  let bytes = read(fd, buf)
  while (bytes > 0) {
    const str = hexdump(u8, bytes)
    print(str, '\n')
    bytes = read(fd, buf)
  }
  if (bytes < 0) return bytes
  close(fd)
  return 0
}

function ls (path = './') {
  let entries = readdir(path, [])
  if (!entries) return -1
  entries = sortBy(entries, 'type')
  entries = sortBy(entries, 'name')
  for (const entry of entries) {
    print(`${getColor(entry, path)}${entry.name}${AD}`, '\n')
  }
  return 0
}

function pwd () {
  print(cwd(), '\n')
  return 0
}

function cd (path) {
  return chdir(path)
}

function mount (source, target, type, flags = 0n, opts = '') {
  return just.fs.mount(source, target, type, flags, opts)
}

function umount (target) {
  return just.fs.umount(target)
}

function mkdir (path) {
  return just.fs.mkdir(path)
}

function rmdir (path) {
  return just.fs.rmdir(path)
}

function unlink (path) {
  return just.fs.unlink(path)
}

function link (target, linkpath) {
  return just.fs.symlink(target, linkpath)
}

function touch (path) {
  return just.fs.utime(path)
}

function mknod (target, stype, smode, ...args) {
  args = args.map(v => Number(v))
  let type = S_IFCHR
  if (stype === 'b') type = S_IFBLK
  if (stype === 'p') type = S_IFIFO
  const full = [S_IRUSR, S_IWUSR, S_IRGRP, S_IWGRP, S_IROTH, S_IWOTH]
  const perms = smode.split('')
  let mode = 0
  for (const perm of perms) {
    const next = full.unshift()
    if (perm !== '-') mode |= next
  }
  return just.fs.mknod(target, type, mode, ...args)
}

function mem () {
  just.print(just.memoryUsage()[0])
  return 0
}

function toObject (p, c) {
  p[c[0]] = Number(c[1])
  return p
}

function free () {
  const { pageSize, physicalPages } = just.sys
  const vmstat = readFile('/proc/vmstat').split('\n').map(l => l.trim().split(' ')).reduce(toObject, {})
  const total = (pageSize * physicalPages) / (1024 * 1024)
  const free = (vmstat.nr_free_pages * pageSize) / (1024 * 1024)
  print(`${AG}total${AD} ${total.toFixed(2)} ${AG}free${AD} ${free.toFixed(2)} ${AG}remaining${AD} ${(free / total).toFixed(2)}`, '\n')
  return 0
}

function cpuinfo () {
  return cat('/proc/cpuinfo')
}

function realpath (path) {
  const buf = new ArrayBuffer(4096)
  const r = just.fs.realpath(path, buf)
  if (r !== 0) return path
  return readCString(buf)
}

function welcome () {
  print('Welcome to the Third Place', '\n')
}

const system = { cat, ls, xxd, pwd, cd, mount, umount, mkdir, rmdir, unlink, rm: unlink, link, touch, mem, free, cpuinfo, realpath, mknod }

function run (str) {
  const [command, ...args] = str.split(' ')
  if (command === '.exit') {
    kill(pid, SIGTERM)
    return
  }
  if (command === '.help') {
    print(Object.keys(system).sort().join('\n'), '\n')
    return
  }
  try {
    const routine = system[command]
    if (routine) {
      if (routine(...args) !== 0) error(`${strerror(errno())} (${AR}${errno()}${AD})`, '\n')
      return
    }
    const result = runScript(str, 'repl')
    if (result) print(stringify(result), '\n')
  } catch (err) {
    error(`${AR}${err.message}${AD}\n${err.stack}\n`)
  }
}

function main () {
  welcome()
  prompt()
  poll()
}

main()
