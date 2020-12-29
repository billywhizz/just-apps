const shared = just.buffer
const dataLen = shared.byteLength - 128
const slots = dataLen / 64
const u32 = new Uint32Array(shared)
const dv = new DataView(shared)
let index = 0

let lastid = 0

function handleMessage (off) {
  const id = dv.getUint32(off)
  if (id - lastid > 1) throw new Error(`OOB ${index} ${id} ${lastid}`)
  lastid = id
}

while (1) {
  let diff = Atomics.load(u32, 0) - index
  while (diff--) {
    const slot = index % slots
    const off = 128 + (slot * 64)
    handleMessage(off)
    index++
  }
  Atomics.store(u32, 16, index)
}
