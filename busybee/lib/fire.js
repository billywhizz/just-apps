const { createClient } = require('@unix')
const { createParser, HTTP_RESPONSE } = require('@http')

function connect (sockName) {
  return new Promise((resolve, reject) => {
    function onClientConnect (err, sock) {
      if (err) {
        reject(err)
        return
      }
      const requests = []
      const buf = new ArrayBuffer(4096)
      const parser = createParser(buf, HTTP_RESPONSE)
      parser.onResponses = count => {
        const response = { statusCode: parser.status(0), headers: parser.headers(0) }
        response.contentLength = parseInt(response.headers['Content-Length'] || 0, 10)
        if (response.contentLength === 0) {
          response.chunked = (response.headers['Transfer-Encoding'] || '').toLowerCase() === 'chunked'
        }
        response.contentType = response.headers['Content-Type']
        if (buf.remaining) {
          if (buf.remaining === response.contentLength) {
            const text = buf.readString(buf.remaining, buf.offset)
            if (response.contentType === 'application/json') {
              response.json = JSON.parse(text)
            } else {
              response.text = text
            }
          } else {
            just.print(`remaining ${buf.remaining} contentLength ${response.contentLength}`)
            // todo, buffer the body? emit it in chunks?
          }
        }
        requests.shift().callback(response)
      }
      sock.onData = bytes => {
        if (bytes > 0) parser.parse(bytes)
      }
      sock.onClose = () => parser.free()
      function writeHeaders (verb, headers, url) {
        const keys = Object.keys(headers)
        let strHeaders = ''
        if (keys.length) {
          strHeaders = Object.keys(headers).map(k => `${k}: ${headers[k]}`).join('\r\n')
        }
        sock.writeString(`${verb.toUpperCase()} ${url} HTTP/1.1\r\n${strHeaders}\r\n\r\n`)
      }
      function send (verb, url, json, headers = { 'Content-Type': 'application/json' }) {
        return new Promise(resolve => {
          requests.push({ url, headers, callback: resolve })
          const text = JSON.stringify(json)
          const len = just.sys.utf8Length(text)
          headers['Content-Length'] = len
          writeHeaders(verb, headers, url)
          if (len) sock.writeString(text)
        })
      }
      sock.get = (url, headers = { Accept: 'application/json' }) => {
        return new Promise(resolve => {
          requests.push({ url, headers, callback: resolve })
          writeHeaders('get', headers, url)
        })
      }
      sock.put = (...args) => send('put', ...args)
      sock.patch = (...args) => send('patch', ...args)
      sock.post = (...args) => send('post', ...args)
      just.sys.nextTick(() => resolve(sock))
      return parser.buffer
    }
    const client = createClient(sockName)
    client.onConnect = onClientConnect
    client.connect()
  })
}

module.exports = { connect }
