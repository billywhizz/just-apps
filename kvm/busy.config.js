const v8flags = [
  '--stack-trace-limit=10',
  '--use-strict',
  '--disallow-code-generation-from-strings',
  '--single-threaded',
  '--single-threaded-gc',
  '--no-concurrent-inlining',
  '--no-concurrent-recompilation',
  '--no-turbo-jt',
  '--jitless',
  '--lite-mode',
  '--optimize-for-size',
  '--no-expose-wasm',
  '--memory-reducer',
  '--memory-reducer-for-small-heaps',
  '--use-idle-notification',
  '--max-heap-size=48',
  '--initial-heap-size=48'
]
const v8flagsFromCommandLine = false
const embeds = []

module.exports = { assets: ['assets/busybox', 'assets/bzImage', 'assets/busy'], main: 'busy.js', embeds, v8flagsFromCommandLine, v8flags: v8flags.join(' ') }
