const shared = just.buffer
const u32 = new Uint32Array(shared)
while (1) {
  Atomics.add(u32, 0, 1)
}
