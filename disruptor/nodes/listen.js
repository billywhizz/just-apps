const node = require('disruptor.js').load()

function produceMessage (off, index) {
  node.dv.setUint32(off, index)
}

node.start(produceMessage)
