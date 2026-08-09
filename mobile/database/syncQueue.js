/**
 * Sync queue helpers — uses the same shared SQLite connection as db.js
 * to avoid opening multiple database handles.
 * Imported lazily inside each function to prevent circular dependency.
 */
import * as SQLite from 'expo-sqlite';

let sharedDb;

export const getSyncDB = async () => {
  if (!sharedDb) {
    sharedDb = await SQLite.openDatabaseAsync('tuition_fee.db');
    await sharedDb.execAsync('PRAGMA journal_mode = WAL;');
  }
  return sharedDb;
};

/**
 * Enqueue a sync operation, replacing any existing entry for the same
 * operation + entity so we never have stale duplicates.
 */
export const enqueueSync = async (operation, entityType, entityId, payload) => {
  try {
    const db = await getSyncDB();
    // Remove any prior queued entry for this exact operation + entity
    await db.runAsync(
      `DELETE FROM sync_queue WHERE operation=? AND entity_type=? AND entity_id=?`,
      [operation, entityType, String(entityId)]
    );
    await db.runAsync(
      `INSERT INTO sync_queue (operation, entity_type, entity_id, payload) VALUES (?,?,?,?)`,
      [operation, entityType, String(entityId), JSON.stringify(payload)]
    );
  } catch (err) {
    console.log('enqueueSync error:', err.message);
  }
};

export const dequeueSync = async (id) => {
  try {
    const db = await getSyncDB();
    await db.runAsync(`DELETE FROM sync_queue WHERE id=?`, [id]);
  } catch (err) {
    console.log('dequeueSync error:', err.message);
  }
};

export const getPendingQueue = async () => {
  try {
    const db = await getSyncDB();
    return db.getAllAsync(`SELECT * FROM sync_queue ORDER BY created_at ASC`);
  } catch (err) {
    console.log('getPendingQueue error:', err.message);
    return [];
  }
};
