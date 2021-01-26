# Articles/Docs on User Mode Linux

## UML
- https://www.kernel.org/doc/Documentation/virtual/uml/UserModeLinux-HOWTO.txt
- ** https://christine.website/blog/howto-usermode-linux-2019-07-07
- https://www.kernel.org/doc/html/latest/virt/uml/user_mode_linux_howto_v2.html
- http://user-mode-linux.sourceforge.net/old/input.html
= https://wiki.gentoo.org/wiki/User-mode_Linux/Guide

## Stripping Debug Symbols
- https://stackoverflow.com/questions/866721/how-to-generate-gcc-debug-symbol-outside-the-build-target

## CPIO
- https://www.thegeekstuff.com/2010/08/cpio-utility/


## run with host directory as rootfs
```
time ./linux root=/dev/root rootfstype=hostfs rootflags=$(pwd)/initramfs rw mem=64M init=/init
```

## initramfs
- https://landley.net/writing/rootfs-howto.html
- https://landley.net/writing/rootfs-intro.html

## setting capabilities
- https://kernel.googlesource.com/pub/scm/linux/kernel/git/morgan/libcap/+/libcap-2.23/progs/setcap.c

## firecracker
- https://www.usenix.org/system/files/nsdi20-paper-agache.pdf

