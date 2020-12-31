const node = require('disruptor.js').load()

let lastid = 0

function handleMessage (off, index) {
  const id = node.dv.getUint32(off)
  if (id - lastid > 1) {
    if (id > 0) throw new Error(`OOB ${index} ${id} ${lastid}`)
  }
  lastid = id
}

node.start(handleMessage)
