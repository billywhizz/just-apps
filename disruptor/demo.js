const { thread } = just.library('thread')
const { readFile } = require('fs')
// const { usleep } = just.load('sys').sys

const threads = []
const BUFSIZE = 1024
const shared = new SharedArrayBuffer((64 * (BUFSIZE + 2)))
const u32 = new Uint32Array(shared)

function spawn (source, core) {
  const tid = thread.spawn('', source, just.args.slice(1), shared)
  thread.setAffinity(tid, core)
  const t = { tid, u32, core, shared }
  threads.push(t)
  return t
}

async function main () {
  spawn(readFile('producer.js'), 1)
  spawn(readFile('consumer.js'), 2)
  const last = { p: 0, c: 0 }
  just.setInterval(() => {
    const pi = Atomics.load(u32, 0)
    const ci = Atomics.load(u32, 16)
    const pd = pi - last.p
    const cd = ci - last.c
    just.print(JSON.stringify({ pd, cd, diff: pi - ci }))
    last.p = pi
    last.c = ci
  }, 1000)
}

main().catch(err => just.error(err.stack))
