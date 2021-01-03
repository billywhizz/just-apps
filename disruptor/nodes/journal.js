const node = require('lib/disruptor.js').load()
const { fs, net } = just

const buffer = node.buffer

function main () {
  let index = 0
  const fd = fs.open('./journal.bin', fs.O_CREAT | fs.O_WRONLY | fs.O_APPEND, fs.S_IRUSR | fs.S_IWUSR)
  while (1) {
    const available = node.claim(index)
    if (!available) {
      just.sys.usleep(10)
      continue
    }
    const slot = index % node.bufferSize
    const remaining = node.bufferSize - slot
    if (remaining >= available) {
      net.write(fd, buffer, available * node.recordSize, slot * node.recordSize)
    } else {
      net.write(fd, buffer, remaining * node.recordSize, slot * node.recordSize)
      net.write(fd, buffer, (available - remaining) * node.recordSize, 0)
    }
    index += available
    node.publish(index)
  }
}

main()
