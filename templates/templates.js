const HEADER = '<!DOCTYPE html><html><head><title>Fortunes</title></head><body><table><tr><th>id</th><th>message</th></tr>'
const FOOTER = '</table></body></html>'
const S1 = '<tr><td>'
const S2 = '</td><td>'
const S3 = '</td></tr>'
function getHTML (rows) {
  let html = HEADER
  for (const row of rows) {
    html += (S1 + row[0] + S2 + row[1] + S3)
  }
  return html + FOOTER
}

const rows = [
  [
    11,
    '&lt;script&gt;alert(&quot;This should not be displayed in a browser alert box.&quot;);&lt;/script&gt;'
  ],
  [
    4,
    'A bad random number generator: 1, 1, 1, 1, 1, 4.33e+67, 1, 1, 1'
  ],
  [
    5,
    'A computer program does what you tell it to do, not what you want it to do.'
  ],
  [
    2,
    'A computer scientist is someone who fixes things that aren\'t broken.'
  ],
  [
    8,
    'A list is only as strong as its weakest link. — Donald Knuth'
  ],
  [
    0,
    'Additional fortune added at request time.'
  ],
  [
    3,
    'After enough decimal places, nobody gives a damn.'
  ],
  [
    7,
    'Any program that runs right is obsolete.'
  ],
  [
    10,
    'Computers make very fast, very accurate mistakes.'
  ],
  [
    6,
    'Emacs is a nice operating system, but I prefer UNIX. — Tom Christaensen'
  ],
  [
    9,
    'Feature: A bug with seniority.'
  ],
  [
    1,
    'fortune: No such file or directory'
  ],
  [
    12,
    'フレームワークのベンチマーク'
  ]
]

function getHTML2 (dirname, entries) {
  return html`<!DOCTYPE html><html><head><title>Fortunes</title></head><body><table><tr><th>id</th><th>message</th></tr>${rows.map(row => html`<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`)}</table></body></html>`
}

function html (strings, ...values) {
  const l = strings.length - 1
  let html = ''
  for (let i = 0; i < l; i++) {
    let v = values[i]
    if (v instanceof Array) {
      v = v.join('')
    }
    const s = strings[i] + v
    html += s
  }
  html += strings[l]
  return html
}

just.print(getHTML(rows).length)
just.print(getHTML2(rows).length)
