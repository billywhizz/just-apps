const { sys } = just
const { loop } = just.factory
const { runMicroTasks } = sys

const node = require('lib/disruptor.js').load()

node.onMessage = (message) => {
  just.print(`${node.name}\n${JSON.stringify(message)}`)
}

let index = 0

function run () {
  while (1) {
    const available = node.claim(index)
    if (!available) {
      loop.poll(0)
      runMicroTasks()
      continue
    }
    index += available
    node.publish(index)
  }
}

run()
