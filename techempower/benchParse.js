const { http } = just.library('http')

const { parseRequests } = http

const response = 'GET /foo HTTP/1.1\r\nHost: foobar123\r\nAccept: application/json\r\n\r\n'
const AD = '\u001b[0m'
const AG = '\u001b[32m'
const AY = '\u001b[33m'

function test (maxPipeline = 16) {
  const buf = ArrayBuffer.fromString(response.repeat(maxPipeline))
  const len = buf.byteLength
  const runs = 2000000 / (maxPipeline / 16)
  let total = 0
  const start = Date.now()
  for (let i = 0; i < runs; i++) {
    total += parseRequests(buf, len)
  }
  const elapsed = (Date.now() - start) / 1000
  just.print(`${AG}${maxPipeline.toString().padEnd(8, ' ')}${AD} : ${AY}${total}${AD} in ${AY}${elapsed.toFixed(2)}${AD} s ${AY}${Math.floor(total / elapsed)}${AD} rps ${AY}${just.memoryUsage().rss}${AD} rss`)
}

while (1) {
  test(16)
  test(32)
  test(64)
  test(128)
  test(256)
  test(512)
  test(1024)
}
