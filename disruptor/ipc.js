const { Disruptor } = require('lib/disruptor.js')
const { readFile } = require('fs')

const disruptor = new Disruptor(16384)

const pipeStream = disruptor.add('listen', readFile('nodes/ipc.js'))
const validate = disruptor.add('validate', readFile('nodes/ipc.js'))
const logic = disruptor.add('logic', readFile('nodes/ipc.js'))

validate.follow(pipeStream)
logic.follow(validate)

logic.onMessage = (message) => {
  just.print(`main.logic: ${JSON.stringify(message)}`)
}

validate.onMessage = (message) => {
  just.print(`main.validate: ${JSON.stringify(message)}`)
}

pipeStream.onMessage = (message) => {
  just.print(`main.pipeStream: ${JSON.stringify(message)}`)
}

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

async function main () {
  disruptor.save()
  await disruptor.run()
  logic.send({ ping: 0 })
  pipeStream.send({ ping: 0 })
  validate.send({ ping: 0 })
}

main().catch(err => just.error(err.stack))
