const disruptor = require('lib/disruptor.js').create(4096)

const ipc = disruptor.add('ipc')
const validate = disruptor.add('validate')
const journal = disruptor.add('journal')

validate.follow(ipc)
journal.follow(validate)

disruptor.run()

just.setInterval(() => just.print(JSON.stringify(disruptor.counters())), 1000)
