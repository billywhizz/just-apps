const log = require('fs').readFile('trace.log')
const lines = log.split('\n')
const points = []
const summary = {}
const rx = /([\d\.]+)\s(\w+)\((.+)\)/
for (const line of lines) {
  const match = line.match(rx)
  if (!match) continue
  let [time, syscall, extra] = match.slice(1)
  if (extra.match(/FUTEX_WAIT,/)) break
  time = parseFloat(time)
  points.push({ time, syscall })
  if (summary[syscall]) {
    summary[syscall].time += time
    summary[syscall].count++
  } else {
    summary[syscall] = { count: 1, time }
  }
}
const total = points.reduce((p, c) => {
  p += c.time
  return p
}, 0.0)
const ms = Math.floor(total * 1000)
just.print(`${ms} ms`)
