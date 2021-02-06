const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)
const AD = '\u001b[0m'
const AG = '\u001b[32m'
const AM = '\u001b[35m'

const buf = new ArrayBuffer(4096)

function cat (fn) {
  const fd = just.fs.open(fn)
  const str = buf.readString(just.net.read(fd, buf))
  just.net.close(fd)
  return str
}

function pwd () {
  return just.sys.cwd()
}

function env () {
  return stringify(just.env())
}

function sortByName (a, b) {
  if (a.name < b.name) return -1
  if (a.name > b.name) return 1
  return 0
}

function ls (path) {
  const files = just.fs.readdir(path, []).sort(sortByName)
  return files.map(f => f.name).join('\n')
}

function info () {
  return `${AM}versions${AD}
${AG}just${AD}             ${just.version.just}
${AG}v8${AD}               ${just.version.v8}
${AG}kernel${AD}           ${just.version.kernel.os} ${just.version.kernel.release} ${just.version.kernel.version}
${AM}environment${AD}
${AG}pid${AD}              ${just.sys.pid()}
${AG}ppid${AD}             ${just.sys.ppid()}
${AG}uid${AD}              ${just.sys.getuid()}
${AG}gid${AD}              ${just.sys.getgid()}
${AG}pgrp${AD}             ${just.sys.getpgrp()}
${AG}tid${AD}              ${just.sys.tid()}
${AG}sid${AD}              ${just.sys.getsid()}
${AG}cwd${AD}              ${just.sys.cwd()}
${AG}env${AD}
${stringify(just.env())}
${AG}args${AD}
${stringify(just.args)}
${AM}memory${AD}
${AG}page size${AD}        ${just.sys.pageSize}
${AG}physical pages${AD}   ${just.sys.physicalPages}
${AG}total memory${AD}     ${Math.floor((just.sys.pageSize * just.sys.physicalPages) / (1024 * 1024))} MB
${AM}usage${AD}
${AG}memory${AD}
${stringify(just.memoryUsage())}
${AG}cpu${AD}
${stringify(just.cpuUsage())}
${AG}resources${AD}
${stringify(just.rUsage())}
${AG}heap${AD}
${stringify(just.heapUsage())}
${AM}cpuinfo${AD}
${cat('/proc/cpuinfo')}
${AM}vmstat${AD}
${cat('/proc/vmstat')}`
}

const programs = { cat, info, ls, env, pwd }

const repl = require('repl')

function createContext () {
  const { vm } = just
  const handle = new ArrayBuffer(8)
  const ctx = vm.createContext(handle)
  function execute (src, scriptName = 'just.js') {
    return vm.compileAndRunInContext(handle, src, scriptName)
  }
  ctx.args = []
  vm.compileAndRunInContext(handle, just.builtin('just.js'), 'just.js')
  return { just: ctx, execute }
}

const context = createContext()

repl.repl().onCommand = command => {
  if (!command) return
  const [program, ...args] = command.split(' ')
  if (programs[program]) {
    return just.print(programs[program](...args))
  }
  return context.execute(command, 'repl')
}
