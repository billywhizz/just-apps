just.library = name => just.load(name)
const memoryUsage = just.memoryUsage
const mem = new BigUint64Array(16)
just.memoryUsage = () => {
  memoryUsage(mem)
  return {
    rss: mem[0],
    total_heap_size: mem[1],
    used_heap_size: mem[2],
    external_memory: mem[3],
    heap_size_limit: mem[5],
    total_available_size: mem[10],
    total_heap_size_executable: mem[11],
    total_physical_size: mem[12]
  }
}

just.print(just.memoryUsage().rss)
const { memory } = just.library('memory')

const buf = new ArrayBuffer(1024)
const rb = memory.rawBuffer(buf)
const runs = 20 * 1000000

function test (fn) {
  const start = Date.now()
  for (let i = 0; i < runs; i++) {
    fn(rb, buf)
  }
  const elapsed = Date.now() - start
  const mil = Math.floor((runs / (elapsed / 1000)) / 1000000)
  just.print(`${runs} ${elapsed} ${mil} m/rps ${just.memoryUsage().rss} rss`)
}

const name = just.args[1] || 'test1'
while (1) {
  test(memory[name])
}
