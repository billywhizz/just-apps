const { Disruptor } = require('lib/disruptor.js')
const { readFile } = require('fs')

const disruptor = new Disruptor(1024)

const producer1 = disruptor.add('producer1', readFile('nodes/listen.js'))
const producer2 = disruptor.add('producer2', readFile('nodes/listen.js'))
const consumer = disruptor.add('journal', readFile('nodes/journal.js'))

consumer.follow(producer1, producer2)

disruptor.save()
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
