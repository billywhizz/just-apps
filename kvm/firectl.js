const { connect } = require('tools/fire.js')

async function main (sockName = './busy.sock') {
  const fire = await connect(sockName)
  const snapshot = {
    snapshot_path: './snapshot_file',
    mem_file_path: './mem_file',
    enable_diff_snapshots: false,
    resume_vm: true
  }
  let res = await fire.put('/snapshot/load', snapshot)
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
}

main(...just.args.slice(2)).catch(err => just.error(err.stack))
