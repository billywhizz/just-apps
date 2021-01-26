#!/bin/bash
./linux quiet root=/dev/root rootfstype=hostfs rootflags=$(pwd)/initramfs rw mem=64M init=/init
