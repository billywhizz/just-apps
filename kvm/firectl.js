const { fs } = just.library('fs')
const { sys } = just.library('sys')

const { connect } = require('tools/fire.js')

const { unlink } = fs
const { fork, waitpid, exec } = sys
const { SystemError } = just

const config = require('vmconfig.json')

function launch (program, ...args) {
  const child = fork()
  if (child === 0) {
    const r = exec(program, args)
    throw new SystemError(`exec ${r}`)
  } else if (child < 0) {
    throw new SystemError(`fork ${child}`)
  }
  return child
}

async function main () {
  const sockName = 'busy.sock'
  unlink(sockName)
  launch('assets/firecracker', '--api-sock', sockName)
  let fire
  // connect to the socket
  while (!fire) {
    try {
      fire = await connect(sockName)
    } catch (err) {
      just.sys.usleep(100000)
    }
  }
  let res
  if (just.args[2] === 'snapshot') {
    // loading a full snapshot into the vm
    const snapshot = {
      snapshot_path: './snapshot_file',
      mem_file_path: './mem_file',
      enable_diff_snapshots: false,
      resume_vm: true
    }
    res = await fire.put('/snapshot/load', snapshot)
    if (res.statusCode !== 204) throw new Error('Could not load snapshot')
    return
  }
  // add the root filesystem
  res = await fire.put('/drives/rootfs', config.drives[0])
  if (res.statusCode !== 204) throw new Error('Could not add drive')
  // add the machine configuration
  res = await fire.put('/machine-config', config['machine-config'])
  if (res.statusCode !== 204) throw new Error('Could not machine config')
  // add linux OS image
  res = await fire.put('/boot-source', config['boot-source'])
  if (res.statusCode !== 204) throw new Error('Could not boot source')
  if (just.args[2] !== 'dump') {
    // add a memory baloon
    res = await fire.put('/balloon', {
      amount_mb: 64,
      deflate_on_oom: true,
      stats_polling_interval_s: 0
    })
    if (res.statusCode !== 204) throw new Error('Could not create balloon')
  }
  // start the vm
  res = await fire.put('/actions', { action_type: 'InstanceStart' })
  if (res.statusCode !== 204) throw new Error('Could not start micro vm')
  if (just.args[2] === 'dump') {
    // pause the vm
    res = await fire.patch('/vm', { state: 'Paused' })
    if (res.statusCode !== 204) throw new Error('Could not pause vm')
    // create the snapshot
    res = await fire.put('/snapshot/create', {
      snapshot_type: 'Full',
      snapshot_path: './snapshot_file',
      mem_file_path: './mem_file',
      version: '0.23.0'
    })
    if (res.statusCode !== 204) throw new Error('Could not create snapshot')
    // resume the vm
    res = await fire.patch('/vm', { state: 'Resumed' })
    if (res.statusCode !== 204) throw new Error('Could not resume vm')
  }
}

main().catch(err => just.error(err.stack))
