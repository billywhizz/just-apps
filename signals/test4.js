const { memory } = just.library('memory', './modules/memory/memory.so')
const { dump } = require('@binary')

class Buffer extends ArrayBuffer {
  constructor (length) {
    super(length)
    this.size = length
    this.raw = memory.rawBuffer(this)
    this.address = memory.getAddress(this.raw)
    this.bytes = new Uint8Array(this)
    this.view = new DataView(this)
    this.meta = memory.getMeta(this, {})
  }

  readString (len = this.byteLength, off = 0) {
    return memory.readString(this.raw, len, off)
  }

  writeString (str, off = 0) {
    return memory.writeString(this.raw, str, off)
  }

  copy (dest, len = this.byteLength, doff = 0, off = 0) {
    return memory.copy(dest.raw, this.raw, doff, len, off)
  }

  dump () {
    return dump(this.bytes, this.size)
  }
}

const repl = require('repl')
repl.repl()
