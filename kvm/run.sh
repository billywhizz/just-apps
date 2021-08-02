#!/bin/bash
NAME=${1:-busy}
ROOTFS=${2:-rootfs}
MEM=${3:-64}
CPU=${4:-1}
assets/lkvm run --name $NAME -c $CPU -m $MEM -d $ROOTFS -k assets/bzImage -p "panic=-1 ro selinux=0 nomodules random.trust_cpu=on quiet audit=0" -n
