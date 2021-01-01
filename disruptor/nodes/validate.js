const node = require('lib/disruptor.js').load()

let lastid = 0

function handleMessage (off, index) {
  const id = node.dv.getUint32(off + 2)
  if (id - lastid > 1) {
    if (id > 0) throw new Error(`OOB ${index} ${id} ${lastid}`)
  }
  lastid = id
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
      handleMessage(node.location(index), index++)
    }
    node.publish(index)
  }
}

main()
