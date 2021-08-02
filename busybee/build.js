const { fs } = just.library('fs')
const { net } = just.library('net')

const process = require('process')
const { copyFile, makeNode, isDir, isFile } = require('fs')
const { attach, detach } = require('lib/losetup.js')

const { mkdir, symlink, chdir, chown, open } = fs
const { O_CREAT, O_WRONLY, S_IRWXU, S_IRWXG, S_IROTH } = fs
const { close } = net
const { launch, watch } = process
const { SystemError } = just

function dd (path = 'rootfs', size = 64) {
  const fd = fs.open(path, O_WRONLY | O_CREAT)
  const chunks = (size * 1024) / 4
  const buf = new ArrayBuffer(4096)
  for (let i = 0; i < chunks; i++) {
    net.write(fd, buf, 4096)
  }
  net.close(fd)
}

async function main (file = 'rootfs', size = 64, fstype = 'ext2', dest = '.mnt') {
  let r = 0
  if (!isFile(file)) {
    // create the empty file
    dd(file, size)
    // create an ext2 filesystem
    const status = await watch(launch('mke2fs', ['-t', fstype, '-F', file]))
    if (status !== 0) throw new SystemError('mke2fs')
    const fd = open(file)
    chown(fd, 1000, 1000)
    close(fd)
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
  r = fs.mount(`/dev/loop${dev}`, dest, fstype, 0n, '')
  if (r < 0) throw new SystemError(`mount ${file}`)
  // create the directories
  r = mkdir(`${dest}/dev`)
  r = mkdir(`${dest}/bin`)
  r = mkdir(`${dest}/sbin`)
  r = mkdir(`${dest}/proc`)
  r = mkdir(`${dest}/sys`)
  r = mkdir(`${dest}/etc`)
  r = mkdir(`${dest}/etc/init.d`)
  // create the init script
  let fd = fs.open(`${dest}/etc/init.d/rcS`, O_WRONLY | O_CREAT)
  net.writeString(fd, `#!/bin/sh
# mount proc and sysfs
mount -t proc none /proc
mount -t sysfs none /sys
# configure the network
ip addr add 172.16.0.2/24 dev eth0
ip link set eth0 up
ip route add default via 172.16.0.2 dev eth0
`)
  r = fs.chmod(fd, S_IRWXU | S_IRWXG | S_IROTH)
  r = net.close(fd)
  // create dns config files
  fd = fs.open(`${dest}/etc/resolv.conf`, O_WRONLY | O_CREAT)
  net.writeString(fd, 'nameserver 8.8.8.8\n')
  r = net.close(fd)
  fd = fs.open(`${dest}/etc/nsswitch.conf`, O_WRONLY | O_CREAT)
  net.writeString(fd, 'hosts:      files dns\n')
  r = net.close(fd)
  fd = fs.open(`${dest}/etc/hosts`, O_WRONLY | O_CREAT)
  net.writeString(fd, '127.0.0.1       localhost\n')
  r = net.close(fd)
  // make the minimum set of devices
  r = makeNode(`${dest}/dev/tty`, 'c', 'rwrwrw', 5, 0)
  r = makeNode(`${dest}/dev/console`, 'c', 'rwrwrw', 5, 1)
  r = makeNode(`${dest}/dev/null`, 'c', 'rwrwrw', 1, 3)
  r = makeNode(`${dest}/dev/zero`, 'c', 'rwrwrw', 1, 5)
  r = makeNode(`${dest}/dev/tty0`, 'c', 'rw-w--', 4, 0)
  r = makeNode(`${dest}/dev/tty1`, 'c', 'rw-w--', 4, 1)
  r = makeNode(`${dest}/dev/tty2`, 'c', 'rw-w--', 4, 2)
  r = makeNode(`${dest}/dev/tty3`, 'c', 'rw-w--', 4, 3)
  r = makeNode(`${dest}/dev/tty4`, 'c', 'rw-w--', 4, 4)
  // copy the httpd app into the bin directory
  //r = copyFile('httpd', `${dest}/bin/httpd`)
  // copy the busybox into the bin directory
  r = copyFile('busybox', `${dest}/bin/busybox`)
  // symlink /sbin/init to /bin/${app}
  r = chdir(`${dest}/sbin`)
  r = symlink('../bin/busybox', 'init')
  r = chdir('../../')
  // add symlinks for all the busybox programs
  const programs = new Set()
  const bb = process.launch('./busybox', ['--list'])
  const chunks = []
  bb.onStdout = (buf, len) => chunks.push(buf.readString(len))
  const status = await process.watch(bb)
  if (status === 0) {
    chunks.join('').split('\n').forEach(p => programs.add(p.trim()))
  }
  // symlink /bin/sh to /bin/busybox
  r = chdir(`${dest}/bin`)
  for (const program of programs.values()) {
    r = symlink('busybox', program)
  }
  r = chdir('../../')
  // unmount the temp directory
  r = fs.umount(dest)
  // detach the loop device
  r = detach(dev)
  // remove the temp directory
  r = fs.rmdir(dest)
}

if (just.args[0] === 'just') {
  main(...just.args.slice(2)).catch(err => just.error(err.stack))
} else {
  main(...just.args.slice(1)).catch(err => just.error(err.stack))
}
