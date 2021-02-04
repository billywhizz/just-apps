# snapshotting and loading a vm

## run firecracker using our config
```
assets/firecracker --config-file vmconfig.json --api-sock /tmp/busy.sock
```

## pause the vm
```
curl --unix-socket /tmp/busy.sock -i \
    -X PATCH 'http://localhost/vm' \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{
            "state": "Paused"
    }'
```

## snapshot the vm
```
curl --unix-socket /tmp/busy.sock -i \
    -X PUT 'http://localhost/snapshot/create' \
    -H  'Accept: application/json' \
    -H  'Content-Type: application/json' \
    -d '{
            "snapshot_type": "Full",
            "snapshot_path": "./snapshot_file",
            "mem_file_path": "./mem_file",
            "version": "0.23.0"
    }'
```

## start a new empty firecracker instance
```
assets/firecracker --api-sock /tmp/foo.sock
```

## load the snapshot into the new instance
```
curl --unix-socket /tmp/foo.sock -i \
    -X PUT 'http://localhost/snapshot/load' \
    -H  'Accept: application/json' \
    -H  'Content-Type: application/json' \
    -d '{
            "snapshot_path": "./snapshot_file",
            "mem_file_path": "./mem_file",
            "enable_diff_snapshots": true,
            "resume_vm": false
    }'
```

## resume the new instance
```
curl --unix-socket /tmp/foo.sock -i \
    -X PATCH 'http://localhost/vm' \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{
            "state": "Resumed"
    }'
```

## resume the original instance
```
curl --unix-socket /tmp/busy.sock -i \
    -X PATCH 'http://localhost/vm' \
    -H 'Accept: application/json' \
    -H 'Content-Type: application/json' \
    -d '{
            "state": "Resumed"
    }'
```
