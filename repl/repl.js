const { dlopen, dlsym, readMemory } = just.sys

function loadSymbolFile (path) {
  path = path.replace(/[./]/g, '_')
  const start = dlsym(handle, `_binary_${path}_start`)
  if (!start) return
  const end = dlsym(handle, `_binary_${path}_end`)
  if (!end) return
  return readMemory(start, end)
}

const handle = dlopen()
const memory = new WebAssembly.Memory({ initial: 20 })
const wasm = loadSymbolFile('parse.wasm')
const mod = new WebAssembly.Module(wasm)
const js = { memory }
const instance = new WebAssembly.Instance(mod, { js })
const { parse } = instance.exports
const { buffer } = memory
const startData = 16384
const str = 'GET /thisisatest HTTP/1.1\r\nHost: api.billywhizz.io\r\nAccept: application/json\r\n\r\n'.repeat(16)
const len = buffer.writeString(str, startData)
const repl = require('repl')
repl.repl()
