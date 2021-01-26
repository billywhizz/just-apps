const { S_IFBLK, S_IFCHR, S_IFIFO, S_IRUSR, S_IWUSR, S_IRGRP, S_IWGRP, S_IROTH, S_IWOTH } = just.fs
const { launch, watch } = require('process')

function mknod (target, stype, smode, ...args) {
  args = args.map(v => Number(v))
  let type = S_IFCHR
  if (stype === 'b') type = S_IFBLK
  if (stype === 'p') type = S_IFIFO
  const full = [S_IRUSR, S_IWUSR, S_IRGRP, S_IWGRP, S_IROTH, S_IWOTH]
  const perms = smode.split('')
  let mode = 0
  for (const perm of perms) {
    const next = full.shift()
    if (perm !== '-') mode |= next
  }
  return just.fs.mknod(target, type, mode, ...args)
}

const fs = require('fs')

async function main () {
  if (!fs.isDir('initramfs')) {
    // create the directory
    just.fs.mkdir('initramfs')
    just.fs.chdir('initramfs')
    // make dev and proc
    just.fs.mkdir('dev')
    just.fs.mkdir('proc')
    // make tty and console devices
    mknod('dev/tty', 'c', 'rwr-r-', 5, 0)
    mknod('dev/console', 'c', 'rwr-r-', 5, 1)
    just.fs.chdir('../')
  }
  just.fs.chdir('./app')
  const buildModule = just.require('build')
  if (!buildModule) throw new Error('Build not Available')
  const config = just.require('configure').configure('init.js', { clean: true, static: true })
  await buildModule.run(config, { clean: true, static: true })
  just.print('build complete')
  just.fs.chdir('../')
  just.fs.rename('app/init', 'initramfs/init')
  fs.writeFile('initramfs/app.js', fs.readFileBytes('app/app.js'))
  let p, status
  p = launch('make', ['-j', '4', '-C', 'linux-5.6.9', 'ARCH=um'])
  status = await watch(p)
  just.print(`make ${status}`)
  just.fs.rename('linux-5.6.9/linux', 'linux')
  p = launch('sudo', ['setcap', 'cap_net_raw,cap_net_admin+ep', 'linux'])
  status = await watch(p)
  just.print(`setcap ${status}`)
  p = launch('sudo', ['setcap', 'CAP_MKNOD=ep', 'linux'])
  status = await watch(p)
  just.print(`setcap ${status}`)
}

main().catch(err => just.error(err.stack))
