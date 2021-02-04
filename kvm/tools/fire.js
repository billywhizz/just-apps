const { createClient } = require('unix.js')
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
        const response = parser.get(1)[0]
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
          }
        }
        requests.shift().callback(response)
      }
      sock.onData = bytes => parser.parse(bytes)
      sock.onClose = () => parser.free()
      just.sys.nextTick(() => resolve(sock))
      sock.get = (url, headers = {}) => {
        return new Promise(resolve => {
          requests.push({ url, headers, callback: resolve })
          const keys = Object.keys(headers)
          let strHeaders = ''
          if (keys.length) {
            strHeaders = Object.keys(headers).map(k => `${k}: ${headers[k]}`).join('\r\n')
          }
          sock.writeString(`GET ${url} HTTP/1.1\r\n${strHeaders}\r\n`)
        })
      }
      sock.put = (url, json, headers = { 'Content-Type': 'application/json' }) => {
        return new Promise(resolve => {
          requests.push({ url, headers, callback: resolve })
          const text = JSON.stringify(json)
          const len = just.sys.utf8Length(text)
          headers['Content-Length'] = len
          const keys = Object.keys(headers)
          let strHeaders = ''
          if (keys.length) {
            strHeaders = Object.keys(headers).map(k => `${k}: ${headers[k]}`).join('\r\n')
          }
          sock.writeString(`PUT ${url} HTTP/1.1\r\n${strHeaders}\r\n\r\n`)
          if (len) sock.writeString(text)
        })
      }
      sock.patch = (url, json, headers = { 'Content-Type': 'application/json' }) => {
        return new Promise(resolve => {
          requests.push({ url, headers, callback: resolve })
          const text = JSON.stringify(json)
          const len = just.sys.utf8Length(text)
          headers['Content-Length'] = len
          const keys = Object.keys(headers)
          let strHeaders = ''
          if (keys.length) {
            strHeaders = Object.keys(headers).map(k => `${k}: ${headers[k]}`).join('\r\n')
          }
          sock.writeString(`PATCH ${url} HTTP/1.1\r\n${strHeaders}\r\n\r\n`)
          if (len) sock.writeString(text)
        })
      }
      return parser.buffer
    }
    const client = createClient(sockName)
    client.onConnect = onClientConnect
    client.connect()
  })
}

module.exports = { connect }
