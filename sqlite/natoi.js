const ffi = require('ffi-napi')

const current = ffi.Library(null, {
  atoi: ['int', ['string']]
})

const atoi = current.atoi

function test (str = '1234') {
  let val = 0
  for (let i = 0; i < count; i++) {
    val = atoi(str)
  }
  return val
}

const { memoryUsage } = process
const print = console.log
const count = 300000
function next () {
  const start = Date.now()
  const val = test()
  const elapsed = (Date.now() - start) / 1000
  print(`${val} ${count} ${elapsed} ${(count / elapsed).toFixed(0)} ${memoryUsage().rss}`)
  setTimeout(next, 100)
}

next()
