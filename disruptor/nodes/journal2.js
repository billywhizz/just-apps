const { load } = require('disruptor.js')
const name = just.args[1]
const disruptor = load()
const node = disruptor.find(name)
disruptor.dump()
const u32 = new Uint32Array(disruptor.buffer)
const dv = new DataView(disruptor.buffer)

just.print(`node ${node.name} ${node.offset}`)

const leaders = []
for (const leader of node.leaders) {
  just.print(`leader ${leader.name} ${leader.offset}`)
  leaders.push(leader.offset / 4)
}
const followers = []
for (const follower of node.followers) {
  just.print(`follower ${follower.name} ${follower.offset}`)
  followers.push(follower.offset / 4)
}

function handleMessage (off) {
  const id = dv.getUint32(off)
  if (id - lastid > 1) throw new Error(`OOB ${index} ${id} ${lastid}`)
  lastid = id
}

let lastid = 0
let index = 0
const offset = node.offset / 4
const slots = disruptor.bufferSize
while (1) {
  let available = Math.min(...leaders.map(off => Atomics.load(u32, off))) - index
  if (!available) continue
  if (followers.length) {
    available = slots - index + available - Math.min(...followers.map(off => Atomics.load(u32, off)))
    if (!available) continue
  }
  while (available--) {
    handleMessage((index % slots) * 64)
    index++
  }
  Atomics.store(u32, offset, index)
  //just.sys.sleep(1)
}
