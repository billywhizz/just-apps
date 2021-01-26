const { memory } = just.library('memory', './modules/memory/memory.so')
const { dump } = require('@binary')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)

function test () {
  const buf = memory.alloc(128)
  just.print(buf.byteLength)
  just.print(memory.getAddress(buf.raw))
  just.print(dump(new Uint8Array(buf), buf.byteLength))
  memory.writeString(buf, 'hello')
  just.print(dump(new Uint8Array(buf), buf.byteLength))
  memory.writeString(buf, 'goodbye')
  just.print(dump(new Uint8Array(buf), buf.byteLength))
  just.print(memory.readString(buf, 7))
  just.print(memory.readString(buf, 5, 2))
  memory.writeString(buf, 'goodbye', buf.byteLength - 7)
  just.print(dump(new Uint8Array(buf), buf.byteLength))
  just.print(memory.readString(buf, 7, buf.byteLength - 7))
  const address = memory.getAddress(buf)
  just.print(address)
  const b2 = memory.readMemory(address, address + 128n)
  just.print(b2.byteLength)
  just.print(dump(new Uint8Array(b2), b2.byteLength))
  const nb = memory.alloc(128)
  just.print(dump(new Uint8Array(nb), nb.byteLength))
  const len = memory.copy(nb.raw, buf.raw)
  just.print(len)
  just.print(dump(new Uint8Array(nb), nb.byteLength))
}

test()
while (1) {
  just.print(stringify(just.memoryUsage()))
  gc()
  just.sleep(1)
}
