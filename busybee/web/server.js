const { encode } = just.library('encode')
const { http } = just.library('http')
const { signal } = just.library('signal')
const { crypto } = just.library('crypto', 'openssl.so')

const { Parser, createBinaryMessage } = require('websocket')
const { readFileBytes } = require('fs')
const { join } = require('path')

const { sys, net } = just
const { EPOLLIN, EPOLLERR, EPOLLHUP } = just.loop
const { loop } = just.factory
const {
  SOMAXCONN, O_NONBLOCK, SOCK_STREAM, AF_UNIX, AF_INET, SOCK_NONBLOCK,
  SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT, IPPROTO_TCP, TCP_NODELAY,
  SO_KEEPALIVE, socketpair
} = net
const { spawn } = just.sys

function sha1 (str) {
  const source = new ArrayBuffer(str.length)
  const len = sys.writeString(source, str)
  const dest = new ArrayBuffer(64)
  const hash = crypto.create(crypto.SHA1, source, dest)
  crypto.update(hash, len)
  const b64Length = encode.base64Encode(dest, source, crypto.digest(hash))
  return sys.readString(source, b64Length)
}

function startWebSocket (request, program, cwd, args) {
  const { fd, url, headers } = request
  request.sessionId = url.slice(1)
  const key = headers['Sec-WebSocket-Key']
  const hash = sha1(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
  const res = []
  res.push('HTTP/1.1 101 Upgrade')
  res.push('Upgrade: websocket')
  res.push('Connection: Upgrade')
  res.push(`Sec-WebSocket-Accept: ${hash}`)
  res.push('Content-Length: 0')
  res.push('')
  res.push('')
  websockets[fd] = request
  const stdin = []
  const stdout = []
  socketpair(AF_UNIX, SOCK_STREAM, stdin)
  socketpair(AF_UNIX, SOCK_STREAM, stdout)
  const buf = new ArrayBuffer(1 * 1024 * 1024)
  request.pid = spawn(program, cwd, args, stdin[1], stdout[1], stdout[1])
  just.sys.waitpid(new Uint32Array(2), request.pid)
  loop.add(stdout[0], (fd, event) => {
    if (event & net.EPOLLERR || event & net.EPOLLHUP) {
      net.close(fd)
      return
    }
    if (event && EPOLLIN) {
      const bytes = net.read(fd, buf)
      const msg = createBinaryMessage(buf, bytes)
      net.send(request.fd, msg)
    }
  })
  const parser = new Parser()
  parser.onChunk = (off, len, header) => {
    let size = len
    let pos = 0
    const bytes = new Uint8Array(rbuf, off, len)
    while (size--) {
      bytes[pos] = bytes[pos] ^ header.maskkey[pos % 4]
      pos++
    }
    net.write(stdin[0], rbuf, len, off)
  }
  request.onData = (off, len) => {
    request.parser.execute(new Uint8Array(rbuf, off, len), 0, len)
  }
  request.parser = parser
  net.send(fd, wbuf, sys.writeString(wbuf, res.join('\r\n')))
}

function sendResponse (request, statusCode = 200, statusMessage = 'OK', body, hdr = {}) {
  const { fd } = request
  const headers = []
  let len = 0
  if (body) {
    len = body.byteLength
  }
  headers.push(`HTTP/1.1 ${statusCode} ${statusMessage}`)
  headers.push(`Content-Length: ${len}`)
  for (const k of Object.keys(hdr)) {
    headers.push(`${k}: ${hdr[k]}`)
  }
  headers.push('')
  headers.push('')
  const hstr = headers.join('\r\n')
  const buf = ArrayBuffer.fromString(hstr)
  let bytes = net.send(fd, buf)
  if (!len) return
  const chunks = Math.ceil(len / 4096)
  bytes = 0
  for (let i = 0, off = 0; i < chunks; ++i, off += 4096) {
    const towrite = Math.min(len - off, 4096)
    bytes = net.write(fd, body, towrite, off)
    if (bytes <= 0) break
  }
}

function onSocketEvent (fd, event) {
  if (event & EPOLLERR || event & EPOLLHUP) return closeSocket(fd)
  if (event & EPOLLIN) {
    const bytes = net.recv(fd, rbuf)
    if (bytes < 0) {
      const errno = sys.errno()
      if (errno !== net.EAGAIN) {
        just.print(`recv error: ${sys.strerror(errno)} (${errno})`)
        closeSocket(fd)
      }
      return
    }
    if (bytes === 0) return closeSocket(fd)
    if (websockets[fd]) return websockets[fd].onData(0, bytes)
    const answer = [0]
    const count = http.parseRequests(rbuf, rbuf.offset + bytes, 0, answer)
    if (count > 0) {
      const requests = http.getRequests(count)
      for (const request of requests) {
        request.fd = fd
        if (request.method !== 'GET') {
          return sendResponse(request, 403, 'Forbidden')
        }
        if (request.headers.Upgrade && request.headers.Upgrade.toLowerCase() === 'websocket') {
          //const program = '/bin/sh'
          const program = 'just'
          const cwd = join(just.sys.cwd(), '../')
          const args = ['run.js']
          //const args = []
          return startWebSocket(request, program, cwd, args)
        }
        if (request.url === '/' || request.url === '/index.html') {
          return sendResponse(request, 200, 'OK', readFileBytes(join(webPath, 'index.html')), { 'Content-Type': 'text/html' })
        }
        if (request.url === '/term.min.css') {
          return sendResponse(request, 200, 'OK', readFileBytes(join(webPath, 'term.min.css')), { 'Content-Type': 'text/css' })
        }
        if (request.url === '/term.min.js') {
          return sendResponse(request, 200, 'OK', readFileBytes(join(webPath, 'term.min.js')), { 'Content-Type': 'application/json' })
        }
        if (request.url === '/favicon.ico') {
          return sendResponse(request, 200, 'OK', readFileBytes(join(webPath, 'favicon.ico')), { 'Content-Type': 'image/x-icon' })
        }
        sendResponse(request, 404, 'Not Found')
      }
    }
    if (answer[0] > 0) {
      const start = rbuf.offset + bytes - answer[0]
      const len = answer[0]
      if (start > rbuf.offset) {
        rbuf.copyFrom(rbuf, 0, len, start)
      }
      rbuf.offset = len
      return
    }
    rbuf.offset = 0
  }
}

function closeSocket (fd) {
  const request = websockets[fd]
  loop.remove(fd)
  net.close(fd)
  if (request && request.pid) {
    just.sys.kill(request.pid, signal.SIGTERM)
  }
  delete websockets[fd]
}

function onListenEvent (fd, event) {
  const clientfd = net.accept(fd)
  net.setsockopt(clientfd, IPPROTO_TCP, TCP_NODELAY, 1)
  net.setsockopt(clientfd, SOL_SOCKET, SO_KEEPALIVE, 1)
  let flags = sys.fcntl(clientfd, sys.F_GETFL, 0)
  flags |= O_NONBLOCK
  sys.fcntl(clientfd, sys.F_SETFL, flags)
  loop.add(clientfd, onSocketEvent)
}

let webPath
const websockets = {}
const rbuf = new ArrayBuffer(1 * 1024 * 1024)
rbuf.offset = 0
const wbuf = new ArrayBuffer(1 * 1024 * 1024)
wbuf.offset = 0

function main (args) {
  const sockfd = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
  net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, 1)
  net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEPORT, 1)
  webPath = '.'
  net.bind(sockfd, '0.0.0.0', parseInt(args[0] || 8888, 10))
  net.listen(sockfd, SOMAXCONN)
  loop.add(sockfd, onListenEvent)
}

main(just.args.slice(2))
