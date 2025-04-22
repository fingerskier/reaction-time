/**
 * @description Reaction‑Times Data Accessors
 * ------------------------------
 * Provides CRUD helpers for the `reaction_times` table.
 * @depends on the core DB layer defined in `conx.js`.
 */
import { initialize, getDB, persist } from './conx.js'


/** @description Ensure the table exists before any operation */
function ensureSchema () {
  const db = getDB();
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


initialize()
.then(() => {
  ensureSchema()
})
.catch(console.error)


/**
 * @description Insert a new reaction‑time record and persist the DB.
 *
 * @param {string} testValue  arbitrary label for the test
 * @param {number} startTime  epoch ms when the stimulus was shown
 * @param {number} endTime    epoch ms when the response occurred
 * @param {number} reactionTime `endTime − startTime` in ms
 * @returns {Promise<void>}
 */
export async function addTest (testValue, startTime, endTime, reactionTime) {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT INTO reaction_times (testValue, startTime, endTime, reactionTime)
    VALUES (?, ?, ?, ?);
  `);
  stmt.run([testValue, startTime, endTime, reactionTime]);
  stmt.free();
  await persist();
}


/**
 * @description Retrieve every reaction‑time record.
 *
 * @returns {Promise<Array<{id:number,testValue:string,startTime:number,endTime:number,reactionTime:number}>>}
 */
export async function getAllTests () {
  const db = getDB();
  const res = db.exec(`
    SELECT id, testValue, startTime, endTime, reactionTime
      FROM reaction_times
      ORDER BY id;
  `);

  if (!res[0]) return [];
  return res[0].values.map(([id, testValue, startTime, endTime, reactionTime]) => ({
    id,
    testValue,
    startTime,
    endTime,
    reactionTime,
  }));
}
