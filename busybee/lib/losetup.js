const { fs } = just.library('fs')
const { net } = just.library('net')
const { sys } = just.library('sys')

const { makeNode } = require('fs')
const { error } = just
const { close } = net
const { open, unlink, O_RDWR } = fs
const { ioctl, errno } = sys

const O_CLOEXEC = 524288 // TODO: use sys.O_CLOEXEC

const { SystemError } = just

const AR = '\u001b[31m'
const AD = '\u001b[0m'

const LOOP_SET_FD = 0x4C00
const LOOP_CLR_FD = 0x4C01
const LOOP_SET_STATUS64 = 0x4C04
const LOOP_CTL_GET_FREE = 0x4C82
const LO_NAME_SIZE = 64

class LoopInfo extends DataView {
  constructor () {
    const buffer = new ArrayBuffer(280)
    super(buffer)
  }

  set name (val) {
    just.sys.writeString(this.buffer, val.slice(0, LO_NAME_SIZE), 72)
  }

  get name () {
    return just.sys.readString(this.buffer, LO_NAME_SIZE, 72)
  }
}

function getFreeDevice () {
  const fd = open('/dev/loop-control', O_RDWR | O_CLOEXEC)
  if (fd < 0) throw new SystemError('open /dev/loop-control')
  const devno = ioctl(fd, LOOP_CTL_GET_FREE, 0)
  if (devno < 0) throw new SystemError('ioctl /dev/loop-control')
  close(fd)
  return devno
}

function detach (id) {
  id = parseInt(id, 10)
  let status = 0
  const deviceName = `/dev/loop${id}`
  let device = 0
  let r = 0
  try {
    device = open(deviceName, O_RDWR | O_CLOEXEC)
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

function attach (target, id = getFreeDevice()) {
  id = parseInt(id, 10)
  let source = 0
  let device = 0
  let r = 0
  const deviceName = `/dev/loop${id}`
  const loopInfo = new LoopInfo()
  try {
    source = open(target, O_RDWR | O_CLOEXEC)
    if (source < 0) throw new SystemError('source.open')
    r = makeNode(deviceName, 'b', 'rwrw--', 7, id)
    if (r < 0 && errno() !== fs.EEXIST) throw new SystemError('makeNode')
    device = open(deviceName, O_RDWR | O_CLOEXEC)
    if (device < 0) throw new SystemError('device.open')
    r = ioctl(device, LOOP_SET_FD, source)
    if (r < 0) throw new SystemError('device.ioctl (LOOP_SET_FD)')
    close(source)
    loopInfo.name = target
    r = ioctl(device, LOOP_SET_STATUS64, loopInfo.buffer)
    if (r < 0) throw new SystemError('device.ioctl (LOOP_SET_STATUS64)')
  } catch (err) {
    error(`${AR}${err.message}${AD}`)
    error(err.stack.split('\n').slice(1).join('\n'))
    if (device > 0) {
      ioctl(device, LOOP_CLR_FD, 0)
      unlink(deviceName)
      close(device)
    }
    if (source > 0) close(source)
    return -1
  }
  if (device > 0) close(device)
  if (source > 0) close(source)
  return id
}

module.exports = { attach, detach }
