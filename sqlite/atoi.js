const { createCif } = require('lib/ffi.js')

const atoi = createCif('atoi', ['string'], 'int32')

function test (str) {
  let val = 0
  for (let i = 0; i < count; i++) val = atoi(str)
  return val
}

const { memoryUsage, setTimeout, print } = just
const count = 10000000
let sign = 1
function next () {
  const start = Date.now()
  const str = (Math.floor(Math.random() * 10000 * sign)).toString()
  const val = test(`${str}\0`)
  const elapsed = (Date.now() - start) / 1000
  print(`${str} ${val} ${count} ${elapsed} ${(count / elapsed).toFixed(0)} ${memoryUsage().rss}`)
  sign = sign * -1
  setTimeout(next, 100)
}

next()
