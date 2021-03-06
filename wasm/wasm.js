const { compile, save, evaluate, createMemory } = require('@wasm')
const { loop } = just.factory

async function main (args) {
  const fileName = just.path.join(just.sys.cwd(), args[0] || 'parse.wat')
  const { wasm } = await compile(fileName)
  save('./parse.wasm', wasm)
  const memory = createMemory({ initial: 20 })
  const { buffer } = memory
  const startData = 16384
  const context = { }
  let requests = 0
  const { parse } = evaluate(wasm, context, memory)
  const str = 'GET /thisisatest HTTP/1.1\r\nHost: api.billywhizz.io\r\nAccept: application/json\r\n\r\n'.repeat(16)
  const len = buffer.writeString(str, startData)
  let bytes = 0
  function test () {
    for (let i = 0; i < 100; i++) {
      requests += parse(startData, len + startData)
      bytes += len
    }
    loop.poll(0)
    just.sys.runMicroTasks()
  }
  just.setInterval(() => {
    const rss = just.memoryUsage().rss
    const mbps = Math.floor(bytes / (1024 * 1024) * 100) / 100
    just.print(`rps ${requests} mem ${rss} MBps ${mbps}`)
    requests = 0
    bytes = 0
  }, 1000)
  while (1) {
    test()
  }
}

main(just.args.slice(1)).catch(err => just.error(err.stack))
