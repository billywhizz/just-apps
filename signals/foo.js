const { memory } = just.library('memory', './modules/memory/memory.so')
const { dump } = require('@binary')

const bufs = []
for (let i = 0; i < 10; i++) {
  const buf = new ArrayBuffer(128)
  const u8 = new Uint8Array(buf)
  u8.fill(i)
  buf.raw = memory.rawBuffer(buf)
  bufs.push(buf)
}

const len = bufs.length
for (let i = 0; i < len; i++) {
  const buf = bufs.shift()
  just.print(dump(new Uint8Array(buf), buf.byteLength))
  gc()
  just.print(just.memoryUsage().rss)
  just.sys.sleep(1)
}