const { launch, watch } = require('process')

const fs = require('fs')

async function main (dest = 'initramfs') {
// dd if=/dev/zero bs=65536 count=480 of=rootfs
// mkfs.ext2 -F rootfs
/*
busybox: https://github.com/mirror/busybox/archive/1_32_1.tar.gz

- download linux
- configure linux - config file
- build linux

- download busybox
- configure busybox
- build busybox

- create rootfs file
- make ext fs in file
- mount file
- make bin, dev, proc, sbin, sys
- add bin/busybox
- create console, mem, tty, null, ram, zero devices
- build just
- copy just to bin/just
- symlink sbin/init to bin/just

*/
  if (!fs.isDir(dest)) {
    // create the directory
    just.fs.mkdir(dest)
    just.fs.chdir(dest)
    // make dev and proc
    just.fs.mkdir('dev')
    just.fs.mkdir('proc')
    // make tty and console devices
    fs.makeNode('dev/tty', 'c', 'rwr-r-', 5, 0)
    fs.makeNode('dev/console', 'c', 'rwr-r-', 5, 1)
    just.fs.chdir('../')
  }
  just.fs.chdir('./app')
  const buildModule = just.require('build')
  if (!buildModule) throw new Error('Build not Available')
  const config = just.require('configure').configure('init.js', { clean: true, static: true })
  await buildModule.run(config, { clean: true, static: true })
  just.print('build complete')
  just.fs.chdir('../')
  just.fs.rename('app/init', `${dest}/init`)
  //fs.writeFile(`${dest}/app.js`, fs.readFileBytes('app/app.js'))
/*
  let p, status
  p = launch('make', ['-j', '4', '-C', 'linux-5.6.9', 'ARCH=um'])
  status = await watch(p)
  just.print(`make ${status}`)
  just.fs.rename('linux-5.6.9/linux', 'linux')
  p = launch('sudo', ['setcap', 'cap_sys_admin,cap_mknod,cap_net_raw,cap_net_admin=ep', 'linux'])
  status = await watch(p)
  just.print(`setcap ${status}`)
*/
}

// 'man capabilities' for a list of things we can enable/disable

main(...just.args.slice(1)).catch(err => just.error(err.stack))
