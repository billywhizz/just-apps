const { createClient } = require('./sock.js')
const { dump } = require('@binary')

const sock = createClient('./unix.sock')
const buf = new ArrayBuffer(65536)
const u8 = new Uint8Array(buf)
const dv = new DataView(buf)

let index = 0n

function stampType () {
  for (let off = 0; off < 65536; off += 64) {
    dv.setUint16(off, 1)
  }
}

function stampId () {
  for (let off = 0; off < 65536; off += 64) {
    dv.setBigUint64(off + 2, index++)
  }
}

sock.onData = bytes => {
  just.print(dump(u8, bytes))
}

sock.onWritable = () => {
  stampId()
  let r = sock.write(buf)
  while (r > 0) {
    stampId()
    r = sock.write(buf)
  }
  if (r === 0) {
    just.print('closed')
    return
  }
  if (just.sys.errno() === just.net.EAGAIN) {
    sock.pause()
  }
}

sock.onConnect = err => {
  if (err) throw err
  return buf
}

stampType()
sock.connect()
