const node = require('lib/disruptor.js').load()

const { dv } = node

function readOrder (off) {
  const o = {}
  o.sid = dv.getBigUint64(off + 2)
  o.cid = dv.getBigUint64(off + 10)
  o.account = dv.getUint32(off + 18)
  o.market = dv.getUint16(off + 22)
  o.stake = dv.getBigUint64(off + 24)
  o.price = dv.getBigUint64(off + 32)
  o.matched = dv.getBigUint64(off + 40)
  o.flags = dv.getUint16(off + 48)
  o.tid = dv.getBigUint64(off + 50)
}

function main () {
  let index = 0
  while (1) {
    let available = node.claim(index)
    if (!available) {
      just.sys.usleep(1)
      continue
    }
    while (available--) {
      const off = node.location(index)
      const type = dv.getUint16(off)
      if (type === 1) readOrder(off)
      index++
    }
    node.publish(index)
  }
}

main()
