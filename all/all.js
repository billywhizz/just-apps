const mem = just.memoryUsage().rss
function library (name, lib = name) {
  return just.load(name)
}
const AD = '\u001b[0m'
const AG = '\u001b[32m'
const AM = '\u001b[35m'

function dump (o, name) {
  if (!o) return
  const fields = Object.getOwnPropertyNames(o).sort()
  just.print(`${AG}${name}${AD}\n${JSON.stringify(fields, null, '  ')}`)
  for (const field of fields) {
    if ((typeof o[field]) === 'object') dump(o[field], `${name}.${field}`)
  }
}

// builtins
function dumpBuiltins () {
  just.print(`${AM}builtins${AD}`)
  dump(require('acorn'), 'acorn')
  dump(require('build'), 'build')
  dump(require('configure'), 'configure')
  dump(require('fs'), 'fs')
  dump(require('inspector'), 'inspector')
  dump(require('loop'), 'loop')
  dump(require('path'), 'path')
  dump(require('process'), 'process')
  dump(require('repl'), 'repl')
  dump(require('websocket'), 'websocket')
}

// c++ modules
function dumpModules () {
  just.print(`${AM}modules${AD}`)
  const { blake3 } = library('blake3')
  dump(blake3, 'blake3')
  const { crypto } = library('crypto', 'openssl')
  dump(crypto, 'crypto')
  const { encode } = library('encode')
  dump(encode, 'encode')
  const { epoll } = library('epoll')
  dump(epoll, 'epoll')
  const { ffi } = library('ffi')
  dump(ffi, 'ffi')
  const { fs } = library('fs')
  dump(fs, 'fs')
  const { html } = library('html')
  dump(html, 'html')
  const { http } = library('http')
  dump(http, 'http')
  const { inspector } = library('inspector')
  dump(inspector, 'inspector')
  const { net } = library('net')
  dump(net, 'net')
  const { pg } = library('pg')
  dump(pg, 'pg')
  //const { rocksdb } = library('rocksdb')
  //dump(rocksdb, 'rocksdb')
  const { sha1 } = library('sha1')
  dump(sha1, 'sha1')
  const { signal } = library('signal')
  dump(signal, 'signal')
  const { sys } = library('sys')
  dump(sys, 'sys')
  const { tcc } = library('tcc')
  dump(tcc, 'tcc')
  const { thread } = library('thread')
  dump(thread, 'thread')
  const { tls } = library('tls', 'openssl')
  dump(tls, 'tls')
  const { udp } = library('udp')
  dump(udp, 'udp')
  const { vm } = library('vm')
  dump(vm, 'vm')
  const { zlib } = library('zlib')
  dump(zlib, 'zlib')
}

// blessed libs
function dumpLibs () {
  just.print(`${AM}libs${AD}`)
  const binary = require('@binary')
  dump(binary, 'binary')
  const dns = require('@dns')
  dump(dns, 'dns')
  const fetch = require('@fetch')
  dump(fetch, 'fetch')
  const http = require('@http')
  dump(http, 'http')
  const packet = require('@packet')
  dump(packet, 'packet')
  const pg = require('@pg')
  dump(pg, 'pg')
  const stringify = require('@stringify')
  dump(stringify, 'stringify')
  const tcp = require('@tcp')
  dump(tcp, 'tcp')
  const wasm = require('@wasm')
  dump(wasm, 'wasm')
}

dumpBuiltins()
dumpModules()
dumpLibs()
const rss = just.memoryUsage().rss
just.print(`${mem} ${rss} ${rss - mem}`)
