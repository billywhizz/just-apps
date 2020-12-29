const { zlib } = just.library('zlib')
const { rocksdb } = just.library('rocksdb')
const {
  open,
  get,
  remove,
  putString,
  createReadOptions,
  createWriteOptions,
  createOptions,
  createIfMissing
} = rocksdb

function getPrompt () {
  return `${AG}>${AY} `
}

const { net, sys } = just
const { sleep } = sys
const { STDIN_FILENO, STDOUT_FILENO } = just.sys
const { SOCK_STREAM, AF_UNIX, socketpair } = net
const stdinfds = []
const stdoutfds = []
const AD = '\u001b[0m'
const AG = '\u001b[32m'
const AY = '\u001b[33m'
socketpair(AF_UNIX, SOCK_STREAM, stdinfds)
socketpair(AF_UNIX, SOCK_STREAM, stdoutfds)
const buf = new ArrayBuffer(1 * 1024 * 1024)
const options = createOptions()
createIfMissing(options, true)
const db = open(options, '/dev/shm/rocksdb-testing')
const writeOptions = createWriteOptions()
const readOptions = createReadOptions()
while (1) {
  net.writeString(STDOUT_FILENO, getPrompt())
  const bytes = net.read(STDIN_FILENO, buf)
  if (bytes === 0) break
  if (bytes < 0) {
    sleep(1)
    continue
  }
  const stmt = buf.readString(bytes)
  const parts = stmt.split(' ').map(v => v.trim())
  const [command, ...args] = parts
  if (command === 'get') {
    const key = args[0]
    const val = get(db, readOptions, key).readString()
    net.writeString(STDOUT_FILENO, `${AD}${val}`)
  } else if (command === 'delete') {
    const key = args[0]
    remove(db, writeOptions, key)
    net.writeString(STDOUT_FILENO, `${AD}delete ok`)
  } else if (command === 'put') {
    const key = args[0]
    const value = args[1]
    putString(db, writeOptions, key, value)
    net.writeString(STDOUT_FILENO, `${AD}put ok`)
  }
  net.writeString(STDOUT_FILENO, '\n')
}
