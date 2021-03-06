const { send, socketpair, AF_UNIX, SOCK_STREAM, close, recv } = just.net
const { errno, strerror } = just.sys
const { EPOLLERR, EPOLLHUP } = just.loop
const { thread } = just.library('thread')
const { loop } = just.factory
const { readFile } = require('fs')

const IdleModes = {
  SPIN: 0,
  SLEEP: 1
}

const settings = {
  MAX_NODES: 100
}

function dumpNodes (node, level = 0) {
  just.print(`${node.name.padStart(node.name.length + (level * 2), ' ')}:`)
  level++
  for (const follower of node.followers) {
    dumpNodes(follower, level)
  }
}

function save (disruptor) {
  const shared = disruptor.buffer
  const dv = new DataView(shared)
  const u8 = new Uint8Array(shared)
  let off = shared.byteLength - 1
  const nodes = disruptor.nodes.length
  u8[off--] = nodes
  u8[off] = disruptor.idleMode
  off -= 4
  dv.setUint32(off, disruptor.bufferSize)
  off -= 4
  dv.setUint32(off, disruptor.recordSize)
  off -= 6
  off -= nodes * 64
  for (const node of disruptor.nodes) {
    node.offset = off - (nodes * 64 * 2)
    u8[off++] = node.name.slice(0, 63).length
    writeString(u8, node.name.slice(0, 63), off)
    off += 63
  }
  off -= nodes * 2 * 64
  for (const node of disruptor.nodes) {
    let off2 = off
    for (const follower of node.followers) {
      dv.setUint32(off2, follower.offset)
      off2 += 4
      if (off2 - off === 32) break
    }
    off += 32
    off2 = off
    for (const leader of node.leaders) {
      dv.setUint32(off2, leader.offset)
      off2 += 4
      if (off2 - off === 32) break
    }
    off += 32
  }
}

function writeString (u8, str, off) {
  const len = str.length
  for (let i = 0; i < len; i++) {
    u8[off + i] = str.charCodeAt(i)
  }
}

function readString (u8, len, off) {
  const str = []
  for (let i = 0; i < len; i++) {
    str.push(String.fromCharCode(u8[off + i]))
  }
  return str.join('')
}

function load (name = just.args[1]) {
  if (!just.buffer) throw new Error('load is only available from a Node thread')
  const fd = just.fd
  const shared = just.buffer
  const dv = new DataView(shared)
  const u8 = new Uint8Array(shared)
  let off = shared.byteLength - 1
  const nodes = u8[off--]
  const idleMode = u8[off]
  off -= 4
  const bufferSize = dv.getUint32(off)
  off -= 4
  const recordSize = dv.getUint32(off)
  off -= 6
  off -= nodes * 64
  const disruptor = new Disruptor(bufferSize, recordSize, idleMode, shared)
  for (let i = 0; i < nodes; i++) {
    const len = dv.getUint8(off)
    const name = readString(u8, len, off + 1)
    const node = disruptor.add(name)
    node.offset = off - (nodes * 64 * 2)
    off += 64
  }
  off -= nodes * 64
  for (let i = 0; i < nodes; i++) {
    const len = dv.getUint8(off)
    const name = readString(u8, len, off + 1)
    const node = disruptor.find(name)
    let off2 = off - (nodes * 64)
    let f = dv.getUint32(off2)
    while (f > 0) {
      f += (nodes * 2 * 64)
      const len = dv.getUint8(f++)
      const name = readString(u8, len, f)
      const follower = disruptor.find(name)
      follower.follow(node)
      off2 += 4
      if (off2 - off === 32) break
      f = dv.getUint32(off2)
    }
    off += 64
  }
  const node = disruptor.find(name)
  loop.add(fd, (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      close(fd)
      return
    }
    const buf = new ArrayBuffer(16384)
    const bytes = recv(fd, buf)
    if (bytes > 0 && node.onMessage) node.onMessage(JSON.parse(buf.readString(bytes)))
  })
  node.send = o => send(fd, ArrayBuffer.fromString(JSON.stringify(o)))
  return node
}

function spawn (source, core, shared, args = just.args) {
  const ipc = createPipe()
  const tid = thread.spawn(source, just.builtin('just.js'), ['', ...args], shared, ipc[1])
  thread.setAffinity(tid, core)
  thread.setName(tid, args[0])
  const t = { tid, core, shared }
  t.send = o => send(ipc[0], ArrayBuffer.fromString(JSON.stringify(o)))
  t.onMessage = () => {}
  loop.add(ipc[0], (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      close(fd)
      return
    }
    const buf = new ArrayBuffer(16384)
    const bytes = recv(fd, buf)
    if (bytes > 0) t.onMessage(JSON.parse(buf.readString(bytes)))
  })
  return t
}

function nextCore () {
  if (currentCore === cpus) {
    currentCore = 0
  }
  return currentCore++
}

function createPipe () {
  const fds = []
  const r = socketpair(AF_UNIX, SOCK_STREAM, fds)
  if (r !== 0) throw new Error(`socketpair ${r} errno ${errno()} : ${strerror(errno())}`)
  return fds
}

class Disruptor {
  constructor (bufferSize = 1024, recordSize = 64, idleMode = IdleModes.SPIN, buffer) {
    this.bufferSize = bufferSize
    this.recordSize = recordSize
    this.idleMode = idleMode
    this.buffer = buffer || new SharedArrayBuffer((bufferSize * recordSize) + (settings.MAX_NODES * 3 * 64) + 16)
    this.nodes = []
    this.u32 = new Uint32Array(this.buffer)
    this.dv = new DataView(this.buffer)
  }

  add (name, source = readFile(`nodes/${name}.js`)) {
    const node = new Node(name, this, source)
    this.nodes.push(node)
    return node
  }

  claim (index) {
    return this.bufferSize - (index - this.tortoise())
  }

  run () {
    if (just.buffer) throw new Error('run should only be called from the main thread')
    this.save()
    const tail = this.tail()
    tail.run()
    return this
  }

  counters () {
    const { u32, nodes } = this
    const result = {}
    for (const node of nodes) {
      result[node.name] = Atomics.load(u32, node.offset / 4)
    }
    return result
  }

  save () {
    return save(this)
  }

  join () {
    this.nodes.forEach(node => thread.join(node.thread.tid))
  }

  tortoise () {
    return Math.min(...this.nodes.map(n => n.counter()))
  }

  tail () {
    let last
    for (const node of this.nodes) {
      if (!node.followers.length) {
        last = node
      }
    }
    return last
  }

  head () {
    let first
    for (const node of this.nodes) {
      if (!node.leaders.length) {
        first = node
        break
      }
    }
    return first
  }

  find (name) {
    for (const node of this.nodes) {
      if (node.name === name) return node
    }
  }

  dump () {
    just.print(`head: ${this.head().name}`)
    just.print(`tail: ${this.tail().name}`)
    dumpNodes(this.head())
  }
}

class Node {
  constructor (name, disruptor, source = '', core = nextCore()) {
    this.disruptor = disruptor
    this.name = name
    this.followers = []
    this.leaders = []
    this.core = core
    this.running = false
    this.source = source
    this.offset = 0
    this.u32 = disruptor.u32
    this.dv = disruptor.dv
    this.bufferSize = disruptor.bufferSize
    this.recordSize = disruptor.recordSize
    this.buffer = disruptor.buffer
    this.index = 0
  }

  follow (...producers) {
    this.leaders = this.leaders.concat(producers)
    for (const producer of producers) {
      producer.followers.push(this)
    }
    return this
  }

  claim (index) {
    if (this.leaders.length) return this.hare() - index
    return this.disruptor.claim(index)
  }

  publish (index) {
    Atomics.store(this.u32, this.offset / 4, index)
  }

  hare () {
    return Math.min(...this.leaders.map(f => f.counter()))
  }

  counter () {
    return Atomics.load(this.u32, this.offset / 4)
  }

  tortoise () {
    return Math.min(...this.followers.map(f => f.counter()))
  }

  location (index) {
    return (index % this.bufferSize) * this.recordSize
  }

  run () {
    if (this.running) return
    const node = this
    this.thread = spawn(this.source, this.core, this.disruptor.buffer, [this.name])
    this.send = o => this.thread.send(o)
    this.thread.onMessage = (...args) => {
      if (node.onMessage) node.onMessage(...args)
    }
    this.running = true
    for (const follower of this.followers) {
      follower.run()
    }
    for (const leader of this.leaders) {
      leader.run()
    }
  }
}

let currentCore = 1
const cpus = just.sys.cpus

function create (bufferSize = 1024, recordSize = 64, idleMode = IdleModes.SPIN, buffer) {
  return new Disruptor(bufferSize, recordSize, idleMode, buffer)
}

module.exports = { Disruptor, Node, IdleModes, save, load, create }
