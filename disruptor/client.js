const { createClient } = require('./sock.js')
const { dump } = require('@binary')

const sock = createClient('./unix.sock')
const buf = new ArrayBuffer(65536)
const u8 = new Uint8Array(buf)

sock.onData = bytes => {
  just.print(dump(u8, bytes))
}

sock.onWritable = () => {
  let r = sock.write(buf)
  while (r > 0) {
    r = sock.write(buf)
  }
  if (r === 0) {
    just.print('closed')
    return
  }
  if (just.sys.errno() === just.net.EAGAIN) {
    sock.pause()
    return
  }
}

sock.onConnect = err => {
  if (err) throw err
  return buf
}

sock.connect()
