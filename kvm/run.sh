#!/bin/bash
NAME=${1:-busy}
ROOTFS=${2:-rootfs}
MEM=${3:-64}
CPU=${4:-1}
sudo assets/lkvm run --name $NAME -c $CPU -m $MEM -d $ROOTFS -k assets/bzImage
