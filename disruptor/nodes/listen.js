const node = require('lib/disruptor.js').load()

function produceMessage (off, id) {
  node.dv.setUint16(off, 1)
  node.dv.setUint32(off + 2, id)
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
