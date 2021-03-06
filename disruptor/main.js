const { Disruptor } = require('lib/disruptor.js')
const { readFile } = require('fs')

const disruptor = new Disruptor(4096)

const listen = disruptor.add('listen', readFile('nodes/stream.js'))
const validate = disruptor.add('validate', readFile('nodes/validate.js'))
const journal = disruptor.add('journal', readFile('nodes/journal.js'))
const replica = disruptor.add('replica', readFile('nodes/replica.js'))
const logic = disruptor.add('logic', readFile('nodes/logic.js'))
const publish = disruptor.add('publish', readFile('nodes/publish.js'))

validate.follow(listen)
journal.follow(validate)
replica.follow(validate)
logic.follow(journal, replica)
publish.follow(logic)

disruptor.save()
disruptor.run()

let last

just.setInterval(() => {
  const counters = disruptor.counters()
  if (!last) last = counters
  const str = Object.keys(counters).map(k => `${k}: ${counters[k] - last[k]}`).join(' ')
  const rss = just.memoryUsage().rss
  const { user, system } = just.cpuUsage()
  const total = (user + system)
  const upc = total ? (user / total) : 0
  const spc = total ? (system / total) : 0
  just.print(`mem ${rss} cpu ${total} (${upc.toFixed(2)}/${spc.toFixed(2)}) ${str}`)
  last = counters
}, 1000)
