const { load } = require('disruptor.js')
const name = just.args[1]
const disruptor = load()
const node = disruptor.find(name)

const dv = new DataView(disruptor.buffer)
let lastid = 0

function handleMessage (off, index) {
  const id = dv.getUint32(off)
  if (id - lastid > 1) {
    if (id > 0) throw new Error(`OOB ${index} ${id} ${lastid}`)
  }
  lastid = id
}

function main () {
  let index = 0
  while (1) {
    let available = node.claim(index)
    if (!available) continue
    while (available--) {
      handleMessage(node.location(index), index++)
    }
    node.publish(index)
  }
}

main()
