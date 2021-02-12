const { ffi } = just.library('ffi')
const handle = just.sys.dlopen('libsqlite3.so')

if (!handle) throw new Error('Clould not create handle')

const { FFI_TYPE_POINTER, FFI_TYPE_UINT32, FFI_TYPE_SINT32 } = ffi

/* eslint-disable */
const codes = {
  SQLITE_OK          : 0, // Successful result
  SQLITE_ERROR       : 1, // Generic error
  SQLITE_INTERNAL    : 2, // Internal logic error in SQLite
  SQLITE_PERM        : 3, // Access permission denied
  SQLITE_ABORT       : 4, // Callback routine requested an abort
  SQLITE_BUSY        : 5, // The database file is locked
  SQLITE_LOCKED      : 6, // A table in the database is locked
  SQLITE_NOMEM       : 7, // A malloc() failed
  SQLITE_READONLY    : 8, // Attempt to write a readonly database
  SQLITE_INTERRUPT   : 9, // Operation terminated by sqlite3_interrupt()
  SQLITE_IOERR      : 10, // Some kind of disk I/O error occurred
  SQLITE_CORRUPT    : 11, // The database disk image is malformed
  SQLITE_NOTFOUND   : 12, // Unknown opcode in sqlite3_file_control()
  SQLITE_FULL       : 13, // Insertion failed because database is full
  SQLITE_CANTOPEN   : 14, // Unable to open the database file
  SQLITE_PROTOCOL   : 15, // Database lock protocol error
  SQLITE_EMPTY      : 16, // Internal use only
  SQLITE_SCHEMA     : 17, // The database schema changed
  SQLITE_TOOBIG     : 18, // String or BLOB exceeds size limit
  SQLITE_CONSTRAINT : 19, // Abort due to constraint violation
  SQLITE_MISMATCH   : 20, // Data type mismatch
  SQLITE_MISUSE     : 21, // Library used incorrectly
  SQLITE_NOLFS      : 22, // Uses OS features not supported on host
  SQLITE_AUTH       : 23, // Authorization denied
  SQLITE_FORMAT     : 24, // Not used
  SQLITE_RANGE      : 25, // 2nd parameter to sqlite3_bind out of range
  SQLITE_NOTADB     : 26, // File opened that is not a database file
  SQLITE_NOTICE     : 27, // Notifications from sqlite3_log()
  SQLITE_WARNING    : 28, // Warnings from sqlite3_log()
  SQLITE_ROW        : 100, // sqlite3_step() has another row ready
  SQLITE_DONE       : 101 // sqlite3_step() has finished executing
}
/* eslint-enable */

class SQLiteError extends Error {
  constructor (apicall, code, db) {
    if (!db) {
      super(`${apicall} (${code})`)
      this.name = 'SQLiteError'
      return
    }
    super(`${apicall} (${code}) ${errmsg(db)}`)
    this.name = 'SQLiteError'
  }
}

function wrapStrlen () {
  const dv = createCif('strlen', [FFI_TYPE_POINTER], FFI_TYPE_UINT32)
  const fp = new DataView(new ArrayBuffer(8))
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  function strlen (ptr) {
    fp.setBigUint64(0, ptr, true)
    return dv.call()
  }
  return strlen
}
const strlen = wrapStrlen()

function createCif (funcName, params = [], rtype = FFI_TYPE_UINT32) {
  const fn = just.sys.dlsym(handle, funcName)
  if (!fn) throw new Error('Could not find symbol')
  const cif = new ArrayBuffer(8 * params.length)
  const status = ffi.ffiPrepCif(cif, rtype, params)
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const dv = new DataView(cif)
  // todo - this is ugly but it has a nice interface, we should wrap it in a nicer interface for setting parameters
  dv.call = () => ffi.ffiCall(cif, fn)
  return dv
}

function wrapOpen () {
  const dv = createCif('sqlite3_open', [FFI_TYPE_POINTER, FFI_TYPE_POINTER])
  const fp = new DataView(new ArrayBuffer(8))
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  const fp3 = new DataView(new ArrayBuffer(8))
  const fp2 = new DataView(new ArrayBuffer(8))
  fp2.setBigUint64(0, fp3.buffer.getAddress(), true)
  dv.setBigUint64(8, fp2.buffer.getAddress(), true) 
  return fileName => {
    const buf = ArrayBuffer.fromString(`${fileName}\0`)
    fp.setBigUint64(0, buf.getAddress(), true)
    const r = dv.call()
    if (r !== codes.SQLITE_OK) throw new SQLiteError('close', r)
    return fp2.getBigUint64(0, true)
  }
}

function wrapClose () {
  const dv = createCif('sqlite3_close', [FFI_TYPE_POINTER])
  return (db) => {
    dv.setBigUint64(0, db, true)
    const r = dv.call()
    if (r !== codes.SQLITE_OK) throw new SQLiteError('close', r, db)
    return r
  }
}

function wrapVersion () {
  const dv = createCif('sqlite3_libversion', [], FFI_TYPE_POINTER)
  let cachedVersion = ''
  return () => {
    if (cachedVersion) return cachedVersion
    const ptr = dv.call()
    const len = strlen(ptr)
    cachedVersion = just.sys.readMemory(ptr, ptr + BigInt(len)).readString(len)
    return cachedVersion
  }
}

function wrapPrepare () {
  const dv = createCif('sqlite3_prepare_v3', [FFI_TYPE_POINTER, FFI_TYPE_POINTER, FFI_TYPE_SINT32, FFI_TYPE_UINT32, FFI_TYPE_POINTER, FFI_TYPE_POINTER], FFI_TYPE_UINT32)
  // *zSql
  const fp = new DataView(new ArrayBuffer(8))
  dv.setBigUint64(8, fp.buffer.getAddress(), true)
  // nByte
  const av = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(16, av.buffer.getAddress(), true)
  // prepFlags
  const bv = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(24, av.buffer.getAddress(), true)
  // **ppStmt
  const pv = new DataView(new ArrayBuffer(8))
  const fpv = new DataView(new ArrayBuffer(8))
  pv.setBigUint64(0, fpv.buffer.getAddress(), true)
  dv.setBigUint64(32, pv.buffer.getAddress(), true)
  // **pzTail
  const qv = new DataView(new ArrayBuffer(8))
  const fqv = new DataView(new ArrayBuffer(8))
  qv.setBigUint64(0, fqv.buffer.getAddress(), true)
  dv.setBigUint64(40, qv.buffer.getAddress(), true)
  return (db, sql, nbyte = -1, flags = 0) => {
    dv.setBigUint64(0, db, true)
    const str = ArrayBuffer.fromString(`${sql}\0`)
    fp.setBigUint64(0, str.getAddress(), true)
    av.setInt32(0, nbyte, true)
    bv.setUint32(0, flags, true)
    const status = dv.call()
    if (status !== codes.SQLITE_OK) throw new SQLiteError('prepare_v3', status, db)
    return {
      status,
      stmt: fpv.getBigUint64(0, true),
      ztail: fqv.getBigUint64(0, true)
    }
  }
}

function wrapErrmsg () {
  const dv = createCif('sqlite3_errmsg', [FFI_TYPE_POINTER], FFI_TYPE_POINTER)
  return db => {
    dv.setBigUint64(0, db, true)
    const ptr = dv.call()
    const len = strlen(ptr)
    return just.sys.readMemory(ptr, ptr + BigInt(len)).readString(len)
  }
}

function wrapStep () {
  const dv = createCif('sqlite3_step', [FFI_TYPE_POINTER], FFI_TYPE_UINT32)
  const fp = new DataView(new ArrayBuffer(8))
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  return stmt => {
    fp.setBigUint64(0, stmt, true)
    const r = dv.call()
    if (!(r === codes.SQLITE_ROW || r === codes.SQLITE_DONE)) throw new SQLiteError('step', r)
    return r
  }
}

function wrapFinalize () {
  const dv = createCif('sqlite3_finalize', [FFI_TYPE_POINTER], FFI_TYPE_UINT32)
  const fp = new DataView(new ArrayBuffer(8))
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  return stmt => {
    fp.setBigUint64(0, stmt, true)
    const r = dv.call()
    if (r !== codes.SQLITE_OK) throw new SQLiteError('finalize', r)
    return r
  }
}

function wrapReset () {
  const dv = createCif('sqlite3_reset', [FFI_TYPE_POINTER], FFI_TYPE_UINT32)
  const fp = new DataView(new ArrayBuffer(8))
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  return stmt => {
    fp.setBigUint64(0, stmt, true)
    const r = dv.call()
    if (r !== codes.SQLITE_OK) throw new SQLiteError('reset', r)
    return r
  }
}

function wrapClearBindings () {
  const dv = createCif('sqlite3_clear_bindings', [FFI_TYPE_POINTER], FFI_TYPE_UINT32)
  const fp = new DataView(new ArrayBuffer(8))
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  return stmt => {
    fp.setBigUint64(0, stmt, true)
    const r = dv.call()
    if (r !== codes.SQLITE_OK) throw new SQLiteError('clear_bindings', r)
    return r
  }
}

// const unsigned char *sqlite3_column_text(sqlite3_stmt*, int iCol);
// int sqlite3_column_int(sqlite3_stmt*, int iCol);
// sqlite3_int64 sqlite3_column_int64(sqlite3_stmt*, int iCol);
// const void *sqlite3_column_blob(sqlite3_stmt*, int iCol);

function wrapColumnText () {
  const dv = createCif('sqlite3_column_text', [FFI_TYPE_POINTER, FFI_TYPE_UINT32], FFI_TYPE_POINTER)
  // sqlite3_stmt*
  const fp = new DataView(new ArrayBuffer(8))
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  // iCol
  const av = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(8, av.buffer.getAddress(), true)
  return (stmt, index) => {
    fp.setBigUint64(0, stmt, true)
    av.setInt32(0, index, true)
    const ptr = dv.call()
    const len = strlen(ptr)
    return just.sys.readMemory(ptr, ptr + BigInt(len)).readString(len)
  }
}

function wrapColumnInt () {
  const dv = createCif('sqlite3_column_int', [FFI_TYPE_POINTER, FFI_TYPE_UINT32], FFI_TYPE_UINT32)
  // sqlite3_stmt*
  const fp = new DataView(new ArrayBuffer(8))
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  // iCol
  const av = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(8, av.buffer.getAddress(), true)
  return (stmt, index) => {
    fp.setBigUint64(0, stmt, true)
    av.setInt32(0, index, true)
    return dv.call()
  }
}

/*
int sqlite3_exec(
  sqlite3*,                                  // An open database
  const char *sql,                           // SQL to be evaluated
  int (*callback)(void*,int,char**,char**),  // Callback function
  void *,                                    // 1st argument to callback
  char **errmsg                              // Error msg written here
);
*/

function wrapExec () {
  const params = [FFI_TYPE_POINTER, FFI_TYPE_POINTER, FFI_TYPE_POINTER, FFI_TYPE_POINTER, FFI_TYPE_POINTER]
  const dv = createCif('sqlite3_exec', params)
  const fp = new DataView(new ArrayBuffer(8))
  dv.setBigUint64(8, fp.buffer.getAddress(), true)
  const args = new ArrayBuffer(24)
  dv.setBigUint64(16, args.getAddress(), true)
  dv.setBigUint64(24, args.getAddress() + 8n, true)
  dv.setBigUint64(32, args.getAddress() + 16n, true)
  return (db, sql) => {
    dv.setBigUint64(0, db, true)
    const buf = ArrayBuffer.fromString(`${sql}\0`)
    fp.setBigUint64(0, buf.getAddress(), true)
    return dv.call()
  }
}

// https://sqlite.org/c3ref/bind_blob.html
// int sqlite3_bind_int(sqlite3_stmt*, int, int);
// int sqlite3_bind_text(sqlite3_stmt*,int,const char*,int,void(*)(void*));
function wrapBindText () {
  const dv = createCif('sqlite3_bind_text', [FFI_TYPE_POINTER, FFI_TYPE_UINT32, FFI_TYPE_POINTER, FFI_TYPE_UINT32, FFI_TYPE_POINTER], FFI_TYPE_UINT32)
  const fp = new DataView(new ArrayBuffer(32))
  const address = fp.buffer.getAddress()
  dv.setBigUint64(0, address, true)
  dv.setBigUint64(8, address + 8n, true)
  dv.setBigUint64(16, address + 12n, true)
  dv.setBigUint64(24, address + 20n, true)
  dv.setBigUint64(32, address + 24n, true)
  return (stmt, index, value) => {
    fp.setBigUint64(0, stmt, true)
    fp.setUint32(8, index, true)
    const buf = ArrayBuffer.fromString(value)
    fp.setBigUint64(12, buf.getAddress(), true)
    fp.setUint32(20, buf.byteLength, true)
    const r = dv.call()
    if (r !== codes.SQLITE_OK) throw new SQLiteError('bind_text', r)
    return r
  }
}

function wrapBindInt () {
  const dv = createCif('sqlite3_bind_int', [FFI_TYPE_POINTER, FFI_TYPE_UINT32, FFI_TYPE_UINT32], FFI_TYPE_UINT32)
  const fp = new DataView(new ArrayBuffer(16))
  const address = fp.buffer.getAddress()
  dv.setBigUint64(0, address, true)
  dv.setBigUint64(8, address + 8n, true)
  dv.setBigUint64(16, address + 12n, true)
  return (stmt, index, value) => {
    fp.setBigUint64(0, stmt, true)
    fp.setUint32(8, index, true)
    fp.setUint32(12, value, true)
    const r = dv.call()
    if (r !== codes.SQLITE_OK) throw new SQLiteError('bind_int', r)
    return r
  }
}

const errmsg = wrapErrmsg()

module.exports = {
  open: wrapOpen(),
  close: wrapClose(),
  version: wrapVersion(),
  strlen: wrapStrlen(),
  prepare: wrapPrepare(),
  errmsg,
  step: wrapStep(),
  finalize: wrapFinalize(),
  columnText: wrapColumnText(),
  columnInt: wrapColumnInt(),
  exec: wrapExec(),
  bindText: wrapBindText(),
  bindInt: wrapBindInt(),
  reset: wrapReset(),
  clearBindings: wrapClearBindings(),
  codes,
  SQLiteError
}
