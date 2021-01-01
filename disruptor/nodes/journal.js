const node = require('lib/disruptor.js').load()

function main () {
  let index = 0
  while (1) {
    let available = node.claim(index)
    if (!available) continue
    while (available--) {
      index++
    }
    node.publish(index)
  }
}

main()
