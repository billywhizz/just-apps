const node = require('lib/disruptor.js').load()

function main () {
  let index = 0
  while (1) {
    let available = node.claim(index)
    if (!available) {
      just.sys.usleep(1)
      continue
    }
    while (available--) {
      //handleMessage(node.location(index), index++)
      index++
    }
    node.publish(index)
  }
}

main()
