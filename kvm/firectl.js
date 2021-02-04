const { connect } = require('tools/fire.js')
const { fs } = just.library('fs')
const { sys } = just.library('sys')

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
  while (!fire) {
    try {
      fire = await connect(sockName)
    } catch (err) {
      just.sys.usleep(100000)
    }
  }
  let res
  if (just.args[2] === 'snapshot') {
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
  res = await fire.put('/drives/rootfs', config.drives[0])
  if (res.statusCode !== 204) throw new Error('Could not add drive')
  res = await fire.put('/machine-config', config['machine-config'])
  if (res.statusCode !== 204) throw new Error('Could not machine config')
  res = await fire.put('/boot-source', config['boot-source'])
  if (res.statusCode !== 204) throw new Error('Could not boot source')
  res = await fire.put('/actions', { action_type: 'InstanceStart' })
  if (res.statusCode !== 204) throw new Error('Could not start micro vm')
  just.setTimeout(async () => {
    res = await fire.patch('/vm', { state: 'Paused' })
    if (res.statusCode !== 204) throw new Error('Could not pause vm')
    res = await fire.put('/snapshot/create', {
      snapshot_type: 'Full',
      snapshot_path: './snapshot_file',
      mem_file_path: './mem_file',
      version: '0.23.0'
    })
    if (res.statusCode !== 204) throw new Error('Could not create snapshot')
    res = await fire.patch('/vm', { state: 'Resumed' })
    if (res.statusCode !== 204) throw new Error('Could not resume vm')
  }, 1000)
}

main().catch(err => just.error(err.stack))
