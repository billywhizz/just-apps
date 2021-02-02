const log = require('fs').readFile('trace.log')
const lines = log.split('\n')
const points = []
const summary = {}
const rx = /(\d\d):(\d\d):(\d\d).(\d\d\d\d\d\d)\s(\w+)\((.+)\)/

const M = 1000000

function calcTime (...args) {
  args = args.map(a => parseInt(a, 10))
  const [hour, minute, second, microsecond] = args
  return microsecond + (second * M) + (minute * 60 * M) + (hour * 60 * 60 * M)
}

let last = 0

for (const line of lines) {
  const match = line.match(rx)
  if (!match) continue
  const [hour, minute, second, microsecond, syscall, extra] = match.slice(1)
  if (extra.match(/FUTEX_WAIT,/)) break
  const ts = calcTime(hour, minute, second, microsecond)
  //just.print(`${hour}:${minute}:${second}.${microsecond} ${ts}`)
  if (last === 0) last = ts
  const time = ts - last
  points.push({ time, syscall })
  last = ts
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
}, 0)
const ms = Math.floor(total / (M / 1000))
just.print(`${ms} ms`)
