const { memory } = just.library('memory', './modules/memory/memory.so')

const buf = ArrayBuffer.fromString('A'.repeat(1024))
buf.raw = memory.rawBuffer(buf)
const runs = 20 * 1000000
let n = 0

function test (fn, b) {
  const start = Date.now()
  for (let i = 0; i < runs; i++) n = fn(b)
  just.print(`${runs} ${Math.floor((runs / ((Date.now() - start) / 1000)) / 10000) / 100} m/rps ${just.memoryUsage().rss}`)
}

const str = 'hello'

function test2 () {
  const start = Date.now()
  for (let i = 0; i < runs; i++) n = memory.writeString(buf.raw, str)
  just.print(`${runs} ${Math.floor((runs / ((Date.now() - start) / 1000)) / 10000) / 100} m/rps ${just.memoryUsage().rss}`)
}

function test3 () {
  const start = Date.now()
  const src = memory.alloc(4096)
  const dest = memory.alloc(4096)
  for (let i = 0; i < runs; i++) n = memory.copy(dest.raw, src.raw)
  const elapsed = Date.now() - start
  const bytes = ((runs * 4096) / (1024 * 1024) / (elapsed / 1000))
  const mem = just.memoryUsage()
  just.print(`${runs} ${Math.floor((runs / (elapsed / 1000)) / 10000) / 100} m/rps rss ${mem.rss} ext ${mem.external_memory} ${bytes.toFixed(0)} MB`)
  just.setTimeout(test3, 1)
  gc()
}

//while (1) test(memory.readString, buf.raw)
//while (1) test(memory.getAddress, buf.raw)
//while (1) test2()
test3()
