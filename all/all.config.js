module.exports = {
  v8flags: '--stack-trace-limit=10 --use-strict --disallow-code-generation-from-strings',
  v8flagsFromCommandLine: false,
  index: 'all.js',
  embeds: ['lib/inspector.js', 'lib/websocket.js']
}
