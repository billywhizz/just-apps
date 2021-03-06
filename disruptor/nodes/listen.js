const node = require('lib/disruptor.js').load()

function produceMessage (off, id) {
  node.dv.setUint16(off, 1)
  node.dv.setBigUint64(off + 2, BigInt(id))
}

function main () {
  let index = 0
  while (1) {
    let available = node.claim(index)
    if (!available) continue
    while (available--) {
      produceMessage(node.location(index), index++)
    }
    node.publish(index)
  }
}

main()
