const shared = just.buffer
const dataLen = shared.byteLength - 128
const slots = dataLen / 64
const u32 = new Uint32Array(shared)
const dv = new DataView(shared)
let index = 0

function produceMessage (off, id) {
  dv.setUint32(off, id)
}

while (1) {
  let diff = index - Atomics.load(u32, 16)
  while (diff >= slots) {
    diff = index - Atomics.load(u32, 16)
  }
  if (diff === 0) diff = slots
  while (diff--) {
    const slot = index % slots
    const off = 128 + (slot * 64)
    produceMessage(off, index++)
  }
  Atomics.store(u32, 0, index)
}
