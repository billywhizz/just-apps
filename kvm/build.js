const { fs } = just.library('fs')
const { net } = just.library('net')
const { sys } = just.library('sys')

const build = require('build')
const config = require('configure')
const process = require('process')
const { join } = require('path')
const { copyFile, makeNode, isDir, isFile } = require('fs')
const { mount, unmount } = require('lib/losetup.js')

const { mkdir, symlink, chdir } = fs
const { launch, watch } = process
const { SystemError } = just
const { cwd } = sys

function dd (path = 'rootfs', size = 64) {
  const fd = fs.open('path', fs.O_WRONLY)
  const chunks = (size * 1024) / 4
  const buf = new ArrayBuffer(4096)
  for (let i = 0; i < chunks; i++) {
    net.write(fd, buf)
  }
  net.close(fd)
}

async function main (src = 'busy.js', file = 'rootfs', dest = 'mnt', size = 64, fstype = 'ext2') {
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
  r = mount(30, file)
  if (r !== 0) throw new SystemError(`mount ${file}`)
  // mount the loop device into the temp directory
  r = fs.mount('/dev/loop30', join(cwd(), dest), 'ext2', 0n, '')
  // create the directories
  mkdir(`${dest}/dev`)
  mkdir(`${dest}/bin`)
  mkdir(`${dest}/sbin`)
  mkdir(`${dest}/proc`)
  mkdir(`${dest}/sys`)
  // copy busybox
  copyFile('assets/busybox', `${dest}/bin/busybox`)
  // make the minimum set of devices
  makeNode(`${dest}/dev/tty`, 'c', 'rwr-r-', 5, 0)
  makeNode(`${dest}/dev/console`, 'c', 'rwr-r-', 5, 1)
  // build the application
  const opts = { clean: true, static: true }
  await build.run(config.configure(src, opts), opts)
  const app = src.slice(0, src.lastIndexOf('.'))
  // copy the app into the bin directory
  copyFile('busy', `${dest}/bin/${app}`)
  // symlink /sbin/init to /bin/${app}
  chdir(`${dest}/sbin`)
  symlink(`../bin/${app}`, 'init')
  chdir('../../')
}

main(...just.args.slice(2)).catch(err => just.error(err.stack))
