const node = require('lib/disruptor.js').load()

const { loop } = just.factory

node.onMessage = (message) => {
  just.print(`${node.name}: ${JSON.stringify(message)}`)
  message.ping++
  node.send(message)
}

function main () {
  let index = 0
  while (1) {
    const available = node.claim(index)
    if (!available) {
      just.sys.usleep(10)
      loop.poll(0)
      just.sys.runMicroTasks()
      continue
    }
    index += available
    node.publish(index)
  }
}

main()
