const { connect } = require('tools/fire.js')
const process = require('process')
const { fs } = just.library('fs')

const { launch, watch } = process
const { unlink } = fs

const config = require('vmconfig.json')
just.print(JSON.stringify(config))

async function main () {
  const sockName = 'busy.sock'
  unlink(sockName)
  const process = launch('assets/firecracker', ['--api-sock', sockName])
  let fire
  while (!fire) {
    try {
      fire = await connect(sockName)
    } catch (err) {
      just.print(err.message)
    }
  }
  let res

  res = await fire.put('/drives/rootfs', config.drives[0])
  just.print(JSON.stringify(res, null, '  '))
  res = await fire.put('/machine-config', config['machine-config'])
  just.print(JSON.stringify(res, null, '  '))
  res = await fire.put('/boot-source', config['boot-source'])
  just.print(JSON.stringify(res, null, '  '))
  res = await fire.put('/actions', { action_type: 'InstanceStart' })
  just.print(JSON.stringify(res, null, '  '))

  process.onStdout = (buf, bytes) => {
    just.net.write(just.sys.STDOUT_FILENO, buf, bytes)
  }
  process.onStderr = (buf, bytes) => {
    just.net.write(just.sys.STDERR_FILENO, buf, bytes)
  }
  const status = await watch(process)
  just.print(status)
/*
  const snapshot = {
    snapshot_path: './snapshot_file',
    mem_file_path: './mem_file',
    enable_diff_snapshots: false,
    resume_vm: true
  }
  res = await fire.put('/snapshot/load', snapshot)
  just.print(JSON.stringify(res, null, '  '))
  res = await fire.patch('/vm', { state: 'Paused' })
  just.print(JSON.stringify(res, null, '  '))

  const config = {
    snapshot_type: 'Full',
    snapshot_path: './snapshot_file2',
    mem_file_path: './mem_file2',
    version: '0.23.0'
  }
  res = await fire.put('/snapshot/create', config)
  just.print(JSON.stringify(res, null, '  '))

  res = await fire.patch('/vm', { state: 'Resumed' })
  just.print(JSON.stringify(res, null, '  '))
*/
}

main().catch(err => just.error(err.stack))
