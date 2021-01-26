const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)
const AD = '\u001b[0m'
const AG = '\u001b[32m'

function dump (o, name) {
  just.print(`${AG}${name}${AD}\n${stringify(o)}`)
}

dump(just.sys.pid(), 'PID')
dump(just.memoryUsage(), 'MEM')
dump(just.sys.env(), 'ENV')
dump(just.args, 'ARGS')
