import initSqlJs from "sql.js";
// Vite/Rollup will copy the file and give us a URL at build time
import wasmURL from "sql.js/dist/sql-wasm.wasm?url";

// ----------------------------------------
// Constants
// ----------------------------------------
const WASM_PATH = wasmURL;              // e.g. /assets/sql-wasm-abcdef.wasm
const IDB_DB_NAME   = "my-sqlite-db";
const IDB_STORE_NAME = "sqlite-files";
const IDB_KEY       = "sqlite-export";

// These are set by `initialize()` and kept as module‑singletons
let SQL; // the sql.js module (contains Database class, etc.)
let db;  // the live in‑memory SQLite DB instance

// ╭──────────────────────────────────────────────────────────────╮
// │ Public API                                                  │
// ╰──────────────────────────────────────────────────────────────╯

/**
 * Initialise / re‑hydrate the in‑memory DB.  Must be awaited.
 */
export async function initialize () {
  SQL = await initSqlJs({ locateFile: () => WASM_PATH });

  const binary = await loadFromIDB();
  if (binary) {
    db = new SQL.Database(new Uint8Array(binary));
  } else {
    db = new SQL.Database();
    createSchema();
    await persist();
  }

  return db;
}

/**
 * Insert a new reaction‑time test row and persist.
 */
export async function addTest (testValue, startTime, endTime, reactionTime) {
  const stmt = db.prepare(
    `INSERT INTO reaction_times (testValue, startTime, endTime, reactionTime)
     VALUES (?, ?, ?, ?);`
  );
  stmt.run([testValue, startTime, endTime, reactionTime]);
  stmt.free();
  await persist();
}

/**
 * Fetch all tests as plain JS objects.
 */
export function getAllTests () {
  const res = db.exec(`SELECT id, testValue, startTime, endTime, reactionTime FROM reaction_times;`);
  if (!res[0]) return [];
  return res[0].values.map(([id, testValue, startTime, endTime, reactionTime]) => ({
    id,
    testValue,
    startTime,
    endTime,
    reactionTime,
  }));
}

// ╭──────────────────────────────────────────────────────────────╮
// │ Internal helpers                                            │
// ╰──────────────────────────────────────────────────────────────╯

function createSchema () {
  db.exec(/*sql*/`
    CREATE TABLE IF NOT EXISTS reaction_times (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      testValue    TEXT    NOT NULL,
      startTime    INTEGER NOT NULL,
      endTime      INTEGER NOT NULL,
      reactionTime INTEGER NOT NULL
    );
  `);
}

async function persist () {
  const data = db.export();          // Uint8Array
  await saveToIDB(data);
}

// ───── IndexedDB wrappers ─────────────────────────────────────

function openIDB () {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function saveToIDB (binary) {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE_NAME, "readwrite");
    tx.objectStore(IDB_STORE_NAME).put(binary, IDB_KEY);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

async function loadFromIDB () {
  const idb = await openIDB();
  return new Promise((resolve) => {
    const tx = idb.transaction(IDB_STORE_NAME, "readonly");
    const req = tx.objectStore(IDB_STORE_NAME).get(IDB_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror   = () => resolve(null);
  });
}
