const config = {
  "version": "0.1.1",
  "libs": [
    "lib/shell.js",
    "lib/init.js",
    "lib/process.js",
    "lib/path.js",
    "lib/loop.js",
    "lib/fs.js",
    "lib/build.js",
    "lib/repl.js",
    "lib/configure.js",
    "lib/acorn.js"
  ],
  "modules": [
    {
      "name": "sys",
      "obj": [
        "modules/sys/sys.o"
      ],
      "lib": [
        "dl",
        "rt"
      ]
    },
    {
      "name": "fs",
      "obj": [
        "modules/fs/fs.o"
      ]
    },
    {
      "name": "net",
      "obj": [
        "modules/net/net.o"
      ]
    },
    {
      "name": "vm",
      "obj": [
        "modules/vm/vm.o"
      ]
    },
    {
      "name": "epoll",
      "obj": [
        "modules/epoll/epoll.o"
      ]
    },
    {
      "name": "signal",
      "obj": [
        "modules/signal/signal.o"
      ]
    }
  ],
  "capabilities": [],
  "target": "busy",
  "main": "just.js",
  "v8flags": "--stack-trace-limit=10 --use-strict --disallow-code-generation-from-strings",
  "embeds": [
    "just.js",
    "config.js",
    "busy.js"
  ],
  "static": true,
  "debug": false,
  "v8flagsFromCommandLine": true,
  "external": {},
  "index": "busy.js",
  "LIBS": "lib/shell.js lib/init.js lib/process.js lib/path.js lib/loop.js lib/fs.js lib/build.js lib/repl.js lib/configure.js lib/acorn.js",
  "EMBEDS": "just.js config.js busy.js",
  "MODULES": "modules/sys/sys.o modules/fs/fs.o modules/net/net.o modules/vm/vm.o modules/epoll/epoll.o modules/signal/signal.o",
  "LIB": "-ldl -lrt",
  "justDir": "/home/andrew/.just",
  "build": "main-static",
  "moduleBuild": "module-static"
}

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
config.main = 'busy.js'
config.v8flags = v8flags.join(' ')
config.v8flagsFromCommandLine = false
config.embeds = []
config.assets = ['assets/busybox', 'assets/bzImage', 'assets/busy']
module.exports = config
