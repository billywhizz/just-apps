#!/bin/bash
NAME=${1:-busy}
ROOTFS=${2:-rootfs}
MEM=${3:-64}
CPU=${4:-1}
for i in {1..5}
do
  echo "trace with time elapsed since"
  sudo strace -r ../assets/lkvm-static run --name $NAME -c $CPU -m $MEM -d ../$ROOTFS -k ../assets/bzImage 2>trace.log && just sum-elapsed.js
  echo "trace with timestamps"
  sudo strace -tt ../assets/lkvm-static run --name $NAME -c $CPU -m $MEM -d ../$ROOTFS -k ../assets/bzImage 2>trace.log && just sum-timestamp.js
done
