const fs = require('fs')

function ls (path) {
  return fs.readDir(path)
}

function cwd () {
  return just.sys.cwd()
}

const api = {
  ls, cwd
}

let [command] = just.args
command = command.replace('./', '')
const result = api[command](...just.args.slice(1))
just.print(JSON.stringify(result, null, '  '))
