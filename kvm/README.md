// dd if=/dev/zero bs=65536 count=480 of=rootfs
// mkfs.ext2 -F rootfs
/*

firecracker
https://github.com/firecracker-microvm/firecracker/archive/v0.22.4.tar.gz
https://s3.amazonaws.com/spec.ccfc.min/img/x86_64/minimal_with_atkbd/kernel/vmlinux.bin

busybox
https://codeload.github.com/mirror/busybox/tar.gz/1_32_1

kvmtool
https://codeload.github.com/kvmtool/kvmtool/tar.gz/master

linux
#https://mirrors.edge.kernel.org/pub/linux/kernel/v5.x/linux-5.10.11.tar.gz
https://mirrors.edge.kernel.org/pub/linux/kernel/v4.x/linux-4.14.72.tar.gz

kernel parameters
https://www.kernel.org/doc/html/v4.15/admin-guide/kernel-parameters.html

TODO: patch to kvmtool for vmlinux from elf
https://kvm.vger.kernel.narkive.com/2mTKrQHt/can-kvm-tool-load-vmlinux

- download linux
- configure linux - config file
- build linux
- copy to assets/bzImage

- download busybox
- configure busybox
- build busybox
- copy to assets/busybox

- download lkvm
- configure lkvm
- build lkvm
- copy to assets/lkvm

- create rootfs file
- make ext fs in file
- mount file
- make bin, dev, proc, sbin, sys
- add bin/busybox
- create console, mem, tty, null, ram, zero devices
- build just
- copy just to bin/just
- symlink sbin/init to bin/just


  let p, status
  p = launch('make', ['-j', '4', '-C', 'linux-5.6.9', 'ARCH=um'])
  status = await watch(p)
  just.print(`make ${status}`)
  just.fs.rename('linux-5.6.9/linux', 'linux')
  p = launch('sudo', ['setcap', 'cap_sys_admin,cap_mknod,cap_net_raw,cap_net_admin=ep', 'linux'])
  status = await watch(p)
  just.print(`setcap ${status}`)

*/
