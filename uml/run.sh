#!/bin/bash
ROOTFS=${1:-initramfs}
./linux quiet root=/dev/root rootfstype=hostfs rootflags=$(pwd)/$ROOTFS rw mem=64M init=/init
