const node = require('lib/disruptor.js').load()

function main () {
  let index = 0
  while (1) {
    const available = node.claim(index)
    if (!available) continue
    index += available
    node.publish(index)
  }
}

main()
