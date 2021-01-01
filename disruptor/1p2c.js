const { Disruptor } = require('lib/disruptor.js')
const { readFile } = require('fs')

const disruptor = new Disruptor(4096)

const producer = disruptor.add('listen', readFile('nodes/listen.js'))
const consumer1 = disruptor.add('journal1', readFile('nodes/journal.js'))
const consumer2 = disruptor.add('journal2', readFile('nodes/journal.js'))

consumer1.follow(producer)
consumer2.follow(producer)

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
