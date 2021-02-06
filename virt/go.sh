#!/bin/bash
sudo just build.js app.js rootfs 24 && ./firecracker --config-file vmconfig.json --no-api