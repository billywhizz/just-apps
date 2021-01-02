const node = require('lib/disruptor.js').load()
const { net, sys } = just
const { STDIN_FILENO } = sys

let index = 0
const buffer = node.buffer

function loadStdin () {
  while (1) {
    const available = node.claim(index)
    if (!available) continue
    const wanted = available * node.recordSize
    const off = node.location(index)
    if (wanted - off <= 0) continue
    const bytes = net.read(STDIN_FILENO, buffer, off, wanted - off)
    if (bytes > 0) {
      index += Math.floor(bytes / node.recordSize)
      node.publish(index)
      continue
    }
    if (bytes < 0) {
      const errno = sys.errno()
      if (errno === net.EAGAIN) continue
      just.error(`recv error: ${sys.strerror(errno)} (${errno})`)
    }
    break
  }
}

loadStdin()
just.print('done')
