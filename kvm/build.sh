#!/bin/sh
mkdir -p mnt
sudo mount -t ext4 -o loop rootfs mnt/
sudo cp -fr build/* mnt/
sudo umount mnt
rmdir mnt
