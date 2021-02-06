
const modules = [
  {
    name: 'sys',
    obj: [
      'modules/sys/sys.o'
    ],
    lib: [
      'rt'
    ]
  },
  {
    name: 'fs',
    obj: [
      'modules/fs/fs.o'
    ]
  },
  {
    name: 'vm',
    obj: [
      'modules/vm/vm.o'
    ]
  },
  {
    name: 'signal',
    obj: [
      'modules/signal/signal.o'
    ]
  }
]
module.exports = { embeds: ['app.js'], index: 'init.js', modules }
