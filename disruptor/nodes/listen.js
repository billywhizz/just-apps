const { load } = require('disruptor.js')
const name = just.args[1]
const disruptor = load()
const node = disruptor.find(name)

const dv = new DataView(disruptor.buffer)

function produceMessage (off, id) {
  dv.setUint32(off, id)
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
