const { ffi } = just.library('ffi')
const { memory } = just.library('memory')

const { rawBuffer, writeCString } = memory

const { FFI_TYPE_POINTER, FFI_TYPE_UINT32 } = ffi

const types = {
  int32: FFI_TYPE_UINT32,
  string: FFI_TYPE_POINTER
}

function createCif (funcName, params = [], rtype = 'int32', libName) {
  let handle
  if (!libName) {
    handle = just.sys.dlopen()
  } else {
    handle = just.sys.dlopen(libName)
  }
  if (!handle) throw new Error('Clould not create handle')
  const fn = just.sys.dlsym(handle, funcName)
  if (!fn) throw new Error('Could not find symbol')
  const cif = new ArrayBuffer(8 * params.length)
  cif.fn = fn
  cif.writeCString = writeCString
  const status = ffi.ffiPrepCif(cif, types[rtype], params.map(v => types[v]))
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const dv = new DataView(cif)
  let off = 0
  const args = []
  const stmt = []
  let idx = 0
  for (const param of params) {
    if (param === 'int32') {
      const fp = new DataView(new ArrayBuffer(4))
      dv.setBigUint64(off, fp.buffer.getAddress(), true)
      args.push(`a${idx}`)
      stmt.push(`fp.setInt32(0, a${idx}, true)`)
    } else if (param === 'uint32') {
      const fp = new DataView(new ArrayBuffer(4))
      dv.setBigUint64(off, fp.buffer.getAddress(), true)
      args.push(`a${idx}`)
      stmt.push(`fp.setUint32(0, a${idx}, true)`)
    } else if (param === 'string') {
      // we store a pointer to an array of pointers in the cif
      const fp = new DataView(new ArrayBuffer(8))
      dv.setBigUint64(off, fp.buffer.getAddress(), true)
      // create a buffer to hold the string argument
      // 10 is max number of digits in a 32 bit unsigned integer
      const strbuf = new ArrayBuffer(10)
      // store a pointer to first argument in the argument buffer
      fp.setBigUint64(0, strbuf.getAddress(), true)
      // get raw acces to the buffer for the first argument
      // ref the string buffer so it doesn't get garbage collected until the
      // returned function goes out of scope
      cif.fp = fp
      cif.rb = rawBuffer(strbuf)
      cif.strbuf = strbuf
      args.push(`a${idx}`)
      stmt.push(`writeCString(cif.rb, a${idx})`)
    }
    off += 8
    idx++
  }
  stmt.push('return ffi.ffiCall(cif, fn)')
  const script = `(cif, fn, ffi, writeCString) => (${args.join(',')}) => {${stmt.join('\n')}}`
  const fun = just.vm.runScript(script)(cif, fn, ffi, writeCString)
  return fun
}

module.exports = { createCif }
