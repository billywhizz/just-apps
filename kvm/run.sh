#!/bin/bash
#sudo assets/lkvm run -c 2 -m 64 -d rootfs -k assets/bzImage -p "init=/busy"
sudo rlwrap assets/lkvm run -c 1 -m 1024 -d rootfs -k assets/bzImage
