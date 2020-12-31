const { load } = require('disruptor.js')
const name = just.args[1]
const disruptor = load()
const node = disruptor.find(name)
disruptor.dump()
const u32 = new Uint32Array(disruptor.buffer)
const dv = new DataView(disruptor.buffer)

just.print(`node ${node.name} ${node.offset}`)
const followers = []
for (const follower of node.followers) {
  just.print(`follower ${follower.name} ${follower.offset}`)
  followers.push(follower.offset / 4)
}

function produceMessage (off, id) {
  dv.setUint32(off, id)
}

let index = 0
const offset = node.offset / 4
const slots = disruptor.bufferSize

while (1) {
  let available = slots - (index - Math.min(...followers.map(off => Atomics.load(u32, off))))
  if (!available) continue
  while (available--) {
    const slot = index % slots
    const off = slot * 64
    produceMessage(off, index++)
  }
  Atomics.store(u32, offset, index)
}

/*
const buf = new ArrayBuffer(65536)
const stream = createStream(fd, buf)
const parser = createParser(buf)
const bytes = stream.pull(65536)
const n = parser.parse(bytes)
const claimed = node.claim(n)
if (claimed > 0) {
  node.write(buf, claimed)
}
if (claimed < n) {
  // ? what to do - spin?
}
*/
