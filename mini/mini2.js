const AD = '\u001b[0m'
const AG = '\u001b[32m'

function dump (o, name) {
  const fields = Object.getOwnPropertyNames(o).sort()
  just.print(`${AG}${name}${AD}\n${JSON.stringify(fields, null, '  ')}`)
  for (const field of fields) {
    if ((typeof o[field]) === 'object') dump(o[field], `${name}.${field}`)
  }
}

dump(just, 'just')
just.print(`versions
  just:   ${just.version.just}
  kernel: ${just.version.kernel.os} ${just.version.kernel.release} ${just.version.kernel.version}
  v8:     ${just.version.v8}
args
${just.args.map((v, i) => '  ' + i.toString().padEnd(6, ' ') + ': ' + v).join('\n')}
`)
