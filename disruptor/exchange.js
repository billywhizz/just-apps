const { Disruptor } = require('lib/disruptor.js')

const disruptor = new Disruptor(16384)

const pipeStream = disruptor.add('pipeStream')
const validate = disruptor.add('validate')
const journal = disruptor.add('journal')
const replica = disruptor.add('replica')
const logic = disruptor.add('logic')
const publish = disruptor.add('publish')

validate.follow(pipeStream)
journal.follow(validate)
replica.follow(validate)
logic.follow(journal, replica)

publish.follow(logic)

disruptor.run()

let last

just.setInterval(() => {
  const counters = disruptor.counters()
  if (!last) last = counters
  const str = Object.keys(counters).map(k => `${k}: ${counters[k]} (${counters[k] - last[k]})`).join(' ')
  const rss = just.memoryUsage().rss
  const { user, system } = just.cpuUsage()
  const total = (user + system)
  const upc = total ? (user / total) : 0
  const spc = total ? (system / total) : 0
  just.print(`mem ${rss} cpu ${total} (${upc.toFixed(2)}/${spc.toFixed(2)}) ${str}`)
  last = counters
}, 1000)
