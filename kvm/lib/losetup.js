const { fs } = just.library('fs')
const { net } = just.library('net')
const { sys } = just.library('sys')

const { makeNode } = require('fs')
const { error } = just
const { close } = net
const { open, unlink, O_RDWR } = fs
const { ioctl } = sys

const { SystemError } = just

const AR = '\u001b[31m'
const AD = '\u001b[0m'

const LOOP_SET_FD = 0x4C00
const LOOP_CLR_FD = 0x4C01
const LOOP_SET_STATUS64 = 0x4C04

class LoopInfo extends DataView {
  constructor () {
    const buffer = new ArrayBuffer(128)
    super(buffer)
  }
}

function unmount (id) {
  id = parseInt(id, 10)
  let status = 0
  const deviceName = `/dev/loop${id}`
  let device = 0
  let r = 0
  try {
    device = open(deviceName, O_RDWR)
    if (device < 0) throw new SystemError(`open ${deviceName}`)
    r = ioctl(device, LOOP_CLR_FD, 0)
    if (r < 0) throw new SystemError('ioctl (LOOP_CLR_FD)')
    r = unlink(deviceName)
    if (device < 0) throw new SystemError(`unlink ${deviceName}`)
  } catch (err) {
    status = 1
    error(`${AR}${err.message}${AD}`)
    error(err.stack.split('\n').slice(1).join('\n'))
  }
  if (device > 0) close(device)
  return status
}

function mount (id, target) {
  id = parseInt(id, 10)
  let source = 0
  let device = 0
  let r = 0
  let status = 0
  const deviceName = `/dev/loop${id}`
  const loopInfo = new LoopInfo()
  try {
    source = open(target, O_RDWR)
    if (source < 0) throw new SystemError('source.open')
    r = makeNode(deviceName, 'b', 'rwrw--', 7, id)
    if (r < 0) throw new SystemError('makeNode')
    device = open(deviceName, O_RDWR)
    if (device < 0) throw new SystemError('device.open')
    r = ioctl(device, LOOP_SET_FD, source)
    if (r < 0) throw new SystemError('device.ioctl (LOOP_SET_FD)')
    close(source)
    r = ioctl(device, LOOP_SET_STATUS64, loopInfo.buffer)
    if (r < 0) throw new SystemError('device.ioctl (LOOP_SET_STATUS64)')
  } catch (err) {
    error(`${AR}${err.message}${AD}`)
    error(err.stack.split('\n').slice(1).join('\n'))
    status = 1
    if (device > 0) {
      ioctl(device, LOOP_CLR_FD, 0)
      unlink(deviceName)
    }
  }
  if (device > 0) close(device)
  if (source > 0) close(source)
  return status
}

module.exports = { mount, unmount }
