const { fs } = just.library('fs')
const { net } = just.library('net')
const { getStat } = require('fs')
const sockName = './metrics.sock'
const stat = getStat(sockName)
if (!(stat && stat.type.fifo)) {
  just.print('creating fifo')
  fs.mkfifo(sockName)
}
const fd = fs.open(sockName)
const buf = new ArrayBuffer(65536)
while (1) {
  const bytes = net.read(fd, buf)
  if (bytes === 0) {
    just.sys.sleep(1)
    continue
  }
  if (bytes < 0) {
    just.print((new just.SystemError('read')).stack)
    break
  }
  const str = buf.readString(bytes)
  try {
    just.print(JSON.stringify(JSON.parse(str), null, '  '))
  } catch (err) {
    just.print(str)
  }
}
