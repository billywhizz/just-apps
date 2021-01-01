function threadMain () {
  //const b = just.sys.calloc(1, 1024, true)
  const b = just.buffer
  while (1) {
    just.print('> ', false)
    const bytes = just.net.read(just.sys.STDIN_FILENO, b, 0, 1024)
    if (bytes < 0) throw new just.SystemError('recv')
    just.print(just.sys.readString(b, bytes), false)
  }
}

const { thread } = just.library('thread')

function spawn (source, core, shared, args = just.args) {
  const tid = thread.spawn(source, just.builtin('just.js'), ['', ...args], shared)
  thread.setAffinity(tid, core)
  return { tid, core, shared }
}

const shared = just.sys.calloc(1, 1024, true)
let source = threadMain.toString()
source = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}')).trim()
thread.join(spawn(source, 1, shared).tid)
