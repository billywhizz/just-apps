const { signal } = just.library('signal')

function parseSigInfo (siginfo) {
  const view = new DataView(siginfo)
  const signo = view.getUint32(0, true)
  const errno = view.getInt32(4, true)
  const code = view.getInt32(8, true)
  const trapno = view.getInt32(12, true)
  const pid = view.getUint32(16, true)
  const uid = view.getUint32(20, true)
  const status = view.getInt32(24, true)
  return { signo, errno, code, pid, uid, trapno, status }
}

signal.sigaction(signal.SIGUSR1, (signum, siginfo) => {
  just.print(`SIGUSR1 received ${signum}`)
  just.print(JSON.stringify(parseSigInfo(siginfo)))
})

const pid = just.sys.pid()

just.setInterval(() => {
  just.print(`pid ${pid} mem ${just.memoryUsage().rss}`)
}, 1000)
