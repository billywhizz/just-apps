
const { fs } = just.library('fs')
const { net } = just.library('net')

const { join } = require('path')

const { SystemError } = just

const stat = new BigUint64Array(20)

function getStats (fd) {
  const r = fs.fstat(fd, stat)
  if (r < 0) throw new SystemError('stat')
  return { modified: new Date(Number(stat[14]) * 1000), size: stat[7] }
}

function getFile (fn, justDir) {
  // TODO: return empty struct if file not found
  let fd = fs.open(fn)
  if (fd <= 0) {
    if (!justDir) throw new SystemError('open')
    fn = join(justDir, fn)
    fd = fs.open(fn)
    if (fd <= 0) throw new SystemError('open')
  }
  const { modified, size } = getStats(fd)
  net.close(fd)
  return { name: fn, modified: new Date(modified), size }
}

function getFiles (cfg) {
  const files = []
  const { justDir } = cfg
  if (cfg.main) files.push(cfg.main)
  if (cfg.index) files.push(cfg.index)
  for (const lib of cfg.libs) {
    files.push(lib)
  }
  for (const mod of cfg.modules) {
    if (mod.obj) {
      for (const obj of mod.obj) {
        files.push(obj)
      }
    } else if (mod.exports) {
      for (const exp of mod.exports) {
        for (const obj of exp.obj) {
          files.push(obj)
        }
      }
    }
  }
  const result = []
  for (let file of files) {
    let fd = fs.open(file)
    if (fd <= 0) {
      file = join(justDir, file)
      fd = fs.open(file)
    }
    if (fd > 0) {
      const stats = getStats(fd)
      result.push({ name: file, modified: new Date(stats.modified), size: stats.size })
      net.close(fd)
    } else {
      result.push({ name: file, modified: new Date(0), size: 0 })
    }
  }
  return result
}

module.exports = { getFiles, getStats, getFile }
