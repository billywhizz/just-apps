const { fs } = just.library('fs')
const { sys } = just.library('sys')

const config = require('vmconfig.json')
const { SystemError } = just
const { fork, exec, waitpid } = sys
const { unlink } = fs
const { connect } = require('lib/fire.js')

const { loop } = just.factory

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

function createInterface (name, cidr) {
  /*
  sudo ip tuntap add tap0 mode tap
  sudo ip addr add 172.16.0.1/24 dev tap0
  sudo ip link set tap0 up
  sudo iptables -t nat -A POSTROUTING -o wlp1s0 -j MASQUERADE
  sudo iptables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
  sudo iptables -A FORWARD -i tap0 -o wlp1s0 -j ACCEPT
  */
}

const flags = just.sys.getTerminalFlags(just.sys.STDIN_FILENO)
const ICANON = 2
const ECHO = 8

function enableRawMode () {
  const newflags = flags & ~(ECHO | ICANON)
  just.sys.setTerminalFlags(just.sys.STDIN_FILENO, newflags)
}

function disableRawMode () {
  just.sys.setTerminalFlags(just.sys.STDIN_FILENO, flags)
}

async function main () {
  function shutdown () {
    just.print('shutting down')
    if (timer) just.clearInterval(timer)
    if (fire && !fire.closing) fire.close()
    disableRawMode()
    unlink(sockName)
    if (!Object.keys(loop.handles).length) loop.count = 0
    just.exit(0)
  }
  const sockName = 'busy.sock'
  unlink(sockName)
  enableRawMode()
  const child = launch('firecracker', '--api-sock', sockName)
  let fire
  while (!fire) {
    try {
      fire = await connect(sockName)
    } catch (err) {
      just.sys.usleep(100000)
    }
  }
  let res
  let timer
  const status = new Uint32Array(2)
  fire.onClose = shutdown
  try {
    res = await fire.put('/drives/rootfs', config.drives[0])
    if (res.statusCode !== 204) throw new Error('Could not add drive')
    res = await fire.put('/machine-config', config['machine-config'])
    if (res.statusCode !== 204) throw new Error('Could not machine config')
    res = await fire.put('/boot-source', config['boot-source'])
    if (res.statusCode !== 204) throw new Error('Could not boot source')

    const eth0 = {
      iface_id: 'eth0',
      guest_mac: 'AA:FC:00:00:00:01',
      host_dev_name: 'tap0'
    }
    res = await fire.put('/network-interfaces/eth0', eth0)
    if (res.statusCode !== 204) throw new Error('Could not add network interface')

    res = await fire.put('/actions', { action_type: 'InstanceStart' })
    if (res.statusCode !== 204) throw new Error('Could not start micro vm')
    timer = just.setInterval(async () => {
      waitpid(status)
      if (status[1] === child) shutdown()
    }, 3000)
  } catch (err) {
    just.error(err.stack)
    shutdown()
  }
}

main().catch(err => just.error(err.stack))
