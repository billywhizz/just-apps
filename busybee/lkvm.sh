#!/bin/bash
./lkvm run --name foo -c 1 -m 64 -d rootfs -k ../kvm/assets/bzImage -p "panic=-1 ro selinux=0 nomodules random.trust_cpu=on quiet audit=0" --network mode=tap,tapif=tap0