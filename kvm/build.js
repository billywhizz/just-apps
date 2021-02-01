const { fs } = just.library('fs')
const { net } = just.library('net')

const configure = just.require('configure')
const build = just.require('build')
const process = require('process')
const { copyFile, makeNode, isDir, isFile } = require('fs')
const { attach, detach } = require('lib/losetup.js')
const { getFiles, getFile } = require('lib/build.js')

const { mkdir, symlink, chdir } = fs
const { launch, watch } = process
const { SystemError } = just

function dd (path = 'rootfs', size = 64) {
  const fd = fs.open(path, fs.O_WRONLY | fs.O_CREAT)
  const chunks = (size * 1024) / 4
  const buf = new ArrayBuffer(4096)
  for (let i = 0; i < chunks; i++) {
    net.write(fd, buf)
  }
  net.close(fd)
}

function sortByModified (a, b) {
  if (a.modified < b.modified) return 1
  if (a.modified > b.modified) return -1
  return 0
}

async function main (src = 'busy.js', file = './rootfs', size = 64, fstype = 'ext2', dest = '.mnt') {
  const opts = { clean: true, static: true, dump: true, silent: true }
  const cfg = await build.run(configure.run(src, opts), opts)
  const files = getFiles(cfg)
  const lastFile = files.sort(sortByModified)[0]
  const app = src.slice(0, src.lastIndexOf('.'))
  size = parseInt(size, 10)
  let r = 0
  opts.dump = false
  // if any of the files for the app have changed or the binary does not exist, rebuild it
  if (!isFile(`assets/${app}`) || getFile(`assets/${app}`).modified < lastFile.modified) {
    // build the application
    await build.run(configure.run(src, opts), opts)
    r = copyFile(app, `assets/${app}`)
    r = fs.unlink(app)
  }
  const assets = cfg.assets.map(fn => getFile(fn, cfg.justDir))
  const lastAsset = assets.sort(sortByModified)[0]
  if (!isFile(file) || getFile(file).modified < lastAsset.modified) {
    if (!isFile(file)) {
      // create the empty file
      dd(file, size)
      // create an ext2 filesystem
      const status = await watch(launch('mke2fs', ['-t', fstype, '-F', file]))
      if (status !== 0) throw new SystemError('mke2fs')
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
    r = fs.mount(`/dev/loop${dev}`, dest, 'ext2', 0n, '')
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
    r = makeNode(`${dest}/dev/null`, 'c', 'rwrwrw', 1, 3)
    r = makeNode(`${dest}/dev/zero`, 'c', 'rwrwrw', 1, 5)
    // copy the app into the bin directory
    r = copyFile(`assets/${app}`, `${dest}/bin/${app}`)
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
  }
}

main(...just.args.slice(2)).catch(err => just.error(err.stack))
