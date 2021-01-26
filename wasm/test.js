async function main () {
  const wasm = just.fs.readFileBytes('parse.wasm')
  const memory = new WebAssembly.Memory({ initial: 20 })
  const { buffer } = memory
  const startData = 16384
  const context = { }
  const mod = new WebAssembly.Module(wasm)
  just.print(JSON.stringify(Object.getOwnPropertyNames(mod)))
  //const mod = await WebAssembly.compile(wasm)
  const js = Object.assign(context, { memory })
  const instance = new WebAssembly.Instance(mod, { js })
  const { parse } = instance.exports
  const str = 'GET /thisisatest HTTP/1.1\r\nHost: api.billywhizz.io\r\nAccept: application/json\r\n\r\n'.repeat(16)
  const len = buffer.writeString(str, startData)
  const requests = parse(startData, len + startData)
  just.print(requests)
}

main().catch(err => just.error(err.stack))
