const node = require('lib/disruptor.js').load()

function produceMessage (off, id) {
  node.dv.setUint16(off, 1)
  node.dv.setBigUint64(off + 2, BigInt(id))
}

function main () {
  let index = 0
  while (1) {
    const available = node.claim(index)
    if (!available) continue
    produceMessage(node.location(index), index++)
    node.publish(index)
    just.sys.sleep(1)
  }
}

main()
