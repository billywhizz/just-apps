const { memory } = just.library('memory', './modules/memory/memory.so')
const { dump } = require('@binary')

let buf = ArrayBuffer.fromString('A'.repeat(1024))
buf.raw = memory.rawBuffer(buf)

just.print(just.sys.readString(buf))
just.print(memory.readString(buf.raw))

gc()

just.print(just.sys.getAddress(buf))
just.print(memory.getAddress(buf.raw))

buf = new ArrayBuffer(65536)
buf.raw = memory.rawBuffer(buf)

gc()

just.print(just.sys.getAddress(buf))
just.print(memory.getAddress(buf.raw))

buf = ArrayBuffer.fromString('A'.repeat(1024))
buf.raw = memory.rawBuffer(buf)

gc()

let start = just.sys.getAddress(buf)
let end = start + BigInt(buf.byteLength)
let mem = memory.readMemory(start, end)

just.print(mem.byteLength)
//just.print(just.sys.readString(mem))
mem.raw = memory.rawBuffer(mem)
//just.print(memory.readString(mem.raw))

just.print(memory.getAddress(mem.raw))
just.print(memory.getAddress(buf.raw))

let u8 = new Uint8Array(mem)
just.print(dump(u8, mem.byteLength))

gc()

let dv = new DataView(mem)
just.print(dv.getUint32(0))
dv.setUint32(0, 0)
just.print(dump(u8, mem.byteLength))


just.sys.writeString(mem, "hello")
just.print(dump(u8, mem.byteLength))

memory.writeString(mem.raw, "goodbye")
just.print(dump(u8, mem.byteLength))

while (1) {
  mem = memory.readMemory(start, end)
  u8 = new Uint8Array(mem)
  just.print(dump(u8, mem.byteLength))
  gc()
  just.sys.sleep(1)
  start = start + 1024n
  end = start + 1024n
}
