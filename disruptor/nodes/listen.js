const { load } = require('disruptor.js')
const name = just.args[1]
const disruptor = load()
const node = disruptor.find(name)

const u32 = new Uint32Array(disruptor.buffer)
const dv = new DataView(disruptor.buffer)

function produceMessage (off, id) {
  dv.setUint32(off, id)
}

function main () {
  let index = 0
  const offset = node.offset / 4
  const slots = disruptor.bufferSize

  while (1) {
    let available = slots - (index - disruptor.tortoise())
    if (!available) continue
    while (available--) {
      produceMessage((index % slots) * 64, index++)
    }
    Atomics.store(u32, offset, index)
  }
}

main()
