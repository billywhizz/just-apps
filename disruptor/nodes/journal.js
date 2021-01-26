const { fs, net, sys, factory } = just
const { O_CREAT, O_WRONLY, O_APPEND, S_IRUSR, S_IWUSR, open } = fs
const { write } = net
const { runMicroTasks } = sys
const { loop } = factory

const node = require('lib/disruptor.js').load()

node.onMessage = (message) => {
  if (message.action === 'pause') {
    running = false
    return
  }
  if (message.action === 'resume') {
    running = true
    run()
  }
}

const { buffer, recordSize, bufferSize } = node
const fd = open('/dev/null', O_CREAT | O_WRONLY | O_APPEND, S_IRUSR | S_IWUSR)
let index = 0
let running = true

function run () {
  while (running) {
    const available = node.claim(index)
    if (!available) {
      loop.poll(0)
      runMicroTasks()
      continue
    }
    const slot = index % bufferSize
    const remaining = bufferSize - slot
    if (remaining >= available) {
      write(fd, buffer, available * recordSize, slot * recordSize)
    } else {
      write(fd, buffer, remaining * recordSize, slot * recordSize)
      write(fd, buffer, (available - remaining) * recordSize, 0)
    }
    index += available
    node.publish(index)
  }
}

run()
