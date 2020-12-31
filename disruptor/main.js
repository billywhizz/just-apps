const { Disruptor } = require('disruptor.js')
const { readFile } = require('fs')
const disruptor = new Disruptor(4096)
const listen = disruptor.add('listen', readFile('nodes/listen.js'))
const journal = disruptor.add('journal', readFile('nodes/journal.js'))
const replica = disruptor.add('replica', readFile('nodes/journal.js'))
const logic = disruptor.add('logic', readFile('nodes/journal.js'))
const publish = disruptor.add('publish', readFile('nodes/journal.js'))
journal.follow(listen)
replica.follow(listen)
logic.follow(journal, replica)
publish.follow(logic)
disruptor.save()
disruptor.run()
let last
just.setInterval(() => {
  const counters = disruptor.counters()
  if (!last) last = counters
  just.print(Object.keys(counters).map(k => `${k}: ${counters[k] - last[k]}`).join(' '))
  last = counters
}, 1000)
