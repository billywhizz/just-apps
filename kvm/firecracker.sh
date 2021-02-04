#!/bin/bash
#assets/firecracker --no-api --log-path fire.log --config-file vmconfig.json
rm -f busy.sock
assets/firecracker --config-file vmconfig.json --api-sock busy.sock
