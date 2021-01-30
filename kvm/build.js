const { fs } = just.library('fs')
const { net } = just.library('net')
const { sys } = just.library('sys')

const build = require('build')
const config = require('configure')
const process = require('process')
const { join } = require('path')
const { copyFile, makeNode, isDir, isFile } = require('fs')
const { attach, detach } = require('lib/losetup.js')

const { mkdir, symlink, chdir, rename } = fs
const { launch, watch } = process
const { SystemError } = just
const { cwd } = sys

function dd (path = 'rootfs', size = 64) {
  const fd = fs.open(path, fs.O_WRONLY | fs.O_CREAT)
  const chunks = (size * 1024) / 4
  const buf = new ArrayBuffer(4096)
  for (let i = 0; i < chunks; i++) {
    net.write(fd, buf)
  }
  net.close(fd)
}

const stat = new BigUint64Array(20)

function getModified (fd) {
  const r = fs.fstat(fd, stat)
  if (r < 0) throw new SystemError('stat')
  return Number(stat[14]) * 1000
}

async function main (src = 'busy.js', file = './rootfs', size = 64, fstype = 'ext2', dest = '.mnt') {
  size = parseInt(size, 10)
  let r = 0
  if (!isFile(file)) {
    // create the empty file
    dd(file, size)
    // create an ext2 filesystem
    const status = await watch(launch('mke2fs', ['-t', fstype, '-F', file]))
    just.print(`mkfs.ext2 ${status}`)
  }
  // create a temp directory to mount into
  if (!isDir(dest)) {
    r = mkdir(dest)
    if (r !== 0) throw new SystemError(`mkdir ${dest}`)
  }
  // attach the file to a loop device
  const dev = attach(file)
  if (dev < 0) throw new SystemError(`attach ${file}`)
  // mount the loop device into the temp directory
  r = fs.mount(`/dev/loop${dev}`, join(cwd(), dest), 'ext2', 0n, '')
  if (r < 0) throw new SystemError(`mount ${file}`)
  // create the directories
  r = mkdir(`${dest}/dev`)
  r = mkdir(`${dest}/bin`)
  r = mkdir(`${dest}/sbin`)
  r = mkdir(`${dest}/proc`)
  r = mkdir(`${dest}/sys`)
  // copy busybox
  copyFile('assets/busybox', `${dest}/bin/busybox`)
  // make the minimum set of devices
  r = makeNode(`${dest}/dev/tty`, 'c', 'rwr-r-', 5, 0)
  r = makeNode(`${dest}/dev/console`, 'c', 'rwr-r-', 5, 1)
  // build the application
  const opts = { clean: true, static: true }
  await build.run(config.configure(src, opts), opts)
  const app = src.slice(0, src.lastIndexOf('.'))
  // copy the app into the bin directory
  r = copyFile(app, `${dest}/bin/${app}`)
  // symlink /sbin/init to /bin/${app}
  r = chdir(`${dest}/sbin`)
  r = symlink(`../bin/${app}`, 'init')
  r = chdir('../../')
  // unmount the temp directory
  r = fs.umount(dest)
  // detach the loop device
  r = detach(dev)
  // remove the temp directory
  r = fs.rmdir(dest)
  // remove the binary
  r = fs.unlink(app)
}

main(...just.args.slice(2)).catch(err => just.error(err.stack))
