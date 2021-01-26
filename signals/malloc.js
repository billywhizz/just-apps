just.library = name => just.load(name)
const { memory } = just.library('memory')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)

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

let buf
while (1) {
  buf = memory.alloc(1024)
  //buf = new ArrayBuffer(1024)
  just.print(stringify(just.memoryUsage()))
  gc()
  just.sleep(1)
}
