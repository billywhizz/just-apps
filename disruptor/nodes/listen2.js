const { load } = require('disruptor.js')
const name = just.args[1]
const disruptor = load().disruptor
const node = disruptor.find(name)

const dv = new DataView(disruptor.buffer)

function produceMessage (off, id) {
  dv.setUint32(off, id)
}

function main () {
  let index = 0
  while (1) {
    let available = node.claim(index)
    if (!available) continue
    while (available--) {
      produceMessage(node.location(index), index++)
    }
    node.publish(index)
  }
}

main()

/*
const buf = new ArrayBuffer(65536)
const stream = createStream(fd, buf)
const parser = createParser(buf)
const bytes = stream.pull(65536)
const n = parser.parse(bytes)
const claimed = node.claim(n)
if (claimed > 0) {
  node.write(buf, claimed)
}
if (claimed < n) {
  // ? what to do - spin?
}
*/
