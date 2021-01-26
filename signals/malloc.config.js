const libs = []
const version = just.version.just
const v8flags = '--stack-trace-limit=10 --use-strict --disallow-code-generation-from-strings'
const v8flagsFromCommandLine = true
const debug = false
const modules = []
const embeds = []
const target = 'malloc'
const main = 'malloc.js'
module.exports = { version, libs, modules, target, main, v8flags, embeds, static: false, debug, v8flagsFromCommandLine }
