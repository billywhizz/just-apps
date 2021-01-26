const { memory } = just.library('memory', './modules/memory/memory.so')
const buf = new ArrayBuffer(1024)
const rb = memory.rawBuffer(buf)
just.print(just.memoryUsage().rss)
memory.test1(rb, buf)
memory.test2(rb, buf)
memory.test3(rb, buf)
just.print(just.memoryUsage().rss)
let n = memory.getInteger(1)
just.print(n)
n = memory.getInteger(n)
just.print(n)
