/**
 * @description SQLite + IndexedDB Persistence Layer (Core)
 * @depends on the domain‑specific tables defined in their own modules
 * (see `reaction-times.js`).
 *
 * All functions are fully JSDoc‑annotated for IntelliSense.
 */

import initSqlJs from 'sql.js'
// 👇 Bundlers (Vite/Rollup/Webpack) copy the asset & give us its final URL
import wasmURL from 'sql.js/dist/sql-wasm.wasm?url'


// ╭──────────────────────────────────────────────────────────────╮
// │ Constants                                                    │
// ╰──────────────────────────────────────────────────────────────╯
/** @type {string} URL of the wasm binary at runtime */
const WASM_PATH = wasmURL
const IDB_DB_NAME   = 'my-sqlite-db'
const IDB_STORE     = 'sqlite-files'
const IDB_KEY       = 'sqlite-export'

// ╭──────────────────────────────────────────────────────────────╮
// │ Module‑scoped singletons (set by `initialize()`)             │
// ╰──────────────────────────────────────────────────────────────╯
/** @type {import('sql.js').SqlJsStatic | undefined} */
let SQL
/** @type {import('sql.js').Database | undefined} */
let db

// ╭──────────────────────────────────────────────────────────────╮
// │ Public API                                                   │
// ╰──────────────────────────────────────────────────────────────╯

/**
 * Initialise the sql.js runtime and open the database.  Subsequent calls
 * return the already‑initialised instance.
 *
 * @returns {Promise<import('sql.js').Database>} resolved DB instance
 */
export async function initialize () {
  if (db) return db; // already ready

  SQL = await initSqlJs({ locateFile: () => WASM_PATH })

  const binary = await _loadFromIDB()
  db = binary ? new SQL.Database(new Uint8Array(binary))
              : new SQL.Database()

  if (!binary) await persist(); // save blank DB for next launch
  return db
}


/**
 * Get the live DB instance.  Throws if `initialize()` hasn’t run yet.
 *
 * @throws {Error} if the DB is not yet initialised
 * @returns {import('sql.js').Database}
 */
export function getDB () {
  if (!db) throw new Error('DB not initialised – call initialize() first')
  return db
}


/**
 * Serialise the current DB and write it to IndexedDB.
 *
 * @returns {Promise<void>}
 */
export async function persist () {
  const data = getDB().export(); // Uint8Array
  await _saveToIDB(data)
}


// ╭──────────────────────────────────────────────────────────────╮
// │ IndexedDB plumbing (private)                                 │
// ╰──────────────────────────────────────────────────────────────╯

function _openIDB () {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}


/** @param {Uint8Array} binary */
async function _saveToIDB (binary) {
  const idb = await _openIDB()
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(binary, IDB_KEY)
    tx.oncomplete = resolve
    tx.onerror    = () => reject(tx.error)
  })
}


/**
 * @returns {Promise<ArrayBuffer|null>} stored DB binary or `null` if absent
 */
async function _loadFromIDB () {
  const idb = await _openIDB()
  return new Promise((resolve) => {
    const tx = idb.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror   = () => resolve(null)
  })
}