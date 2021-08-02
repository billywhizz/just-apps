const { ffi } = just.library('ffi')
const { memory } = just.library('memory')

const { rawBuffer, writeCString, writeString } = memory

const { FFI_TYPE_POINTER, FFI_TYPE_UINT32, FFI_OK } = ffi

const handle = just.sys.dlopen()
if (!handle) throw new Error('Clould not create handle')

const types = {
  int32: FFI_TYPE_UINT32,
  string: FFI_TYPE_POINTER
}

function createCif (funcName, params = [], rtype = FFI_TYPE_UINT32) {
  const fn = just.sys.dlsym(handle, funcName)
  if (!fn) throw new Error('Could not find symbol')
  const cif = new ArrayBuffer(8 * params.length)
  const status = ffi.ffiPrepCif(cif, rtype, params)
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  return { dv: new DataView(cif), call: () => ffi.ffiCall(cif, fn) }
}

// we could optimise this further by memoising arguments that don't change
// on each function call
const lib = {
  atoi: () => {
    const { dv, call } = createCif('atoi', [FFI_TYPE_POINTER], FFI_TYPE_UINT32)
    // we store a pointer to an array of pointers in the cif
    const fp = new DataView(new ArrayBuffer(8))
    dv.setBigUint64(0, fp.buffer.getAddress(), true)
    // create a buffer to hold the string argument
    // 10 is max number of digits in a 32 bit unsigned integer
    const strbuf = new ArrayBuffer(10)
    // store a pointer to first argument in the argument buffer
    fp.setBigUint64(0, strbuf.getAddress(), true)
    // get raw acces to the buffer for the first argument
    const rb = rawBuffer(strbuf)
    // ref the string buffer so it doesn't get garbage collected until the
    // returned function goes out of scope
    dv.fp = fp
    dv.strbuf = strbuf
    return (str) => {
      // write a string to the raw buffer
      writeCString(rb, str)
      return call()
    }
  }
}

const atoi = lib.atoi()

function test (str) {
  let val = 0
  for (let i = 0; i < count; i++) {
    val = atoi(str)
  }
  return val
}

const { memoryUsage, setTimeout, print } = just
const count = 10000000
function next () {
  const start = Date.now()
  const val = test('4096')
  const elapsed = (Date.now() - start) / 1000
  print(`${val} ${count} ${elapsed} ${(count / elapsed).toFixed(0)} ${memoryUsage().rss}`)
  setTimeout(next, 100)
  //gc()
}

next()
