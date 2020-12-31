const { load } = require('disruptor.js')
const name = just.args[1]
const disruptor = load()
const node = disruptor.find(name)

const u32 = new Uint32Array(disruptor.buffer)
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
  const offset = node.offset / 4
  const slots = disruptor.bufferSize

  while (1) {
    let available = node.hare() - index
    if (!available) continue
    while (available--) {
      handleMessage((index % slots) * 64, index++)
    }
    Atomics.store(u32, offset, index)
    //just.sys.nanosleep(0, 1)
  }
}

main()
