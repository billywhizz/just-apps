function library (name, lib = name) {
  return just.load(name)
}
const { sys } = library('sys')
const mem = new BigUint64Array(16)
sys.memoryUsage(mem)
just.print(mem[0])
