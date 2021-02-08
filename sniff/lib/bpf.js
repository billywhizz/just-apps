const binary = require('@binary')

const { memory } = just.library('memory', '../../just-js/modules/memory/memory.so')

const { net, SystemError } = just
const { SOCK_RAW, PF_PACKET, ETH_P_ALL, SOL_SOCKET } = net
const { htons16 } = binary

const SO_ATTACH_FILTER = 26

function compileBPF (prog, littleEndian = false) {
  const len = prog.length
  const bpf = new ArrayBuffer(len * 8)
  const dv = new DataView(bpf)
  let off = 0
  for (let i = 0; i < len; i++) {
    dv.setUint16(off, prog[i][0], littleEndian)
    dv.setUint8(off + 2, prog[i][1])
    dv.setUint8(off + 3, prog[i][2])
    dv.setUint32(off + 4, prog[i][3], littleEndian)
    off += 8
  }
  return bpf
}

function compile (prog, littleEndian = false) {
  const bpf = compileBPF(prog, littleEndian)
  const buf = new ArrayBuffer(16)
  const dv = new DataView(buf)
  dv.setUint16(0, prog.length, littleEndian)
  memory.writePointer(memory.rawBuffer(buf), 8, memory.rawBuffer(bpf))
  buf.bpf = bpf
  return buf
}

module.exports = { compile }
