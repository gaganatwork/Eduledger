import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { getDB } from '../database/db';
import { enqueueSync, dequeueSync, getPendingQueue } from '../database/syncQueue';

// ─── Current user ID ──────────────────────────────────────────────────────────
const uid = () => auth().currentUser?.uid;

// ─── Per-user collection references ──────────────────────────────────────────
const studentsCol = () =>
  firestore().collection('users').doc(uid()).collection('students');
const feeRecordsCol = () =>
  firestore().collection('users').doc(uid()).collection('fee_records');
const notificationsCol = () =>
  firestore().collection('users').doc(uid()).collection('notifications');

// ─── Restore FROM Firestore → SQLite (on fresh install / new login) ───────────
export const restoreFromCloud = async () => {
  try {
    if (!uid()) return false;
    const database = await getDB();

    const studentsSnap = await studentsCol().get();
    for (const d of studentsSnap.docs) {
      const s = d.data();
      await database.runAsync(
        `INSERT OR REPLACE INTO students
           (id, name, class, phone, email, parent_name, monthly_fee, is_active, created_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          s.id, s.name, s.class, s.phone, s.email || '',
          s.parent_name || '', s.monthly_fee, s.is_active ?? 1,
          s.created_at || new Date().toISOString(),
        ]
      );
    }

    const feesSnap = await feeRecordsCol().get();
    for (const d of feesSnap.docs) {
      const f = d.data();
      await database.runAsync(
        `INSERT OR REPLACE INTO fee_records
           (id, student_id, month, status, amount_due, amount_paid, paid_at, notes)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          f.id, f.student_id, f.month, f.status, f.amount_due,
          f.amount_paid || 0, f.paid_at || null, f.notes || '',
        ]
      );
    }

    const notifsSnap = await notificationsCol().get();
    for (const d of notifsSnap.docs) {
      const n = d.data();
      await database.runAsync(
        `INSERT OR REPLACE INTO notifications
           (id, student_id, fee_record_id, month, type, message, is_read, created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          n.id, n.student_id, n.fee_record_id || null, n.month,
          n.type, n.message, n.is_read || 0,
          n.created_at || new Date().toISOString(),
        ]
      );
    }

    const attendanceSnap = await attendanceCol().get();
    for (const d of attendanceSnap.docs) {
      const a = d.data();
      await database.runAsync(
        `INSERT OR REPLACE INTO attendance
           (id, student_id, date, status, created_at)
         VALUES (?,?,?,?,?)`,
        [
          a.id, a.student_id, a.date, a.status,
          a.created_at || new Date().toISOString(),
        ]
      );
    }

    console.log('✅ Data restored from Firestore');
    return true;
  } catch (err) {
    console.log('⚠️ Restore failed (offline?):', err.message);
    return false;
  }
};

export const cloudHasData = async () => {
  try {
    if (!uid()) return false;
    const snap = await studentsCol().limit(1).get();
    return !snap.empty;
  } catch {
    return false;
  }
};

// ─── Sync student TO Firestore ────────────────────────────────────────────────
export const syncStudent = async (student) => {
  if (!uid()) return;
  const payload = {
    id: student.id,
    name: student.name,
    class: student.class,
    phone: student.phone,
    email: student.email || '',
    parent_name: student.parent_name || '',
    monthly_fee: student.monthly_fee,
    is_active: student.is_active ?? 1,
    created_at: student.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  try {
    await studentsCol().doc(String(student.id)).set(payload);
  } catch (err) {
    console.log('syncStudent failed — queued:', err.message);
    await enqueueSync('set', 'students', student.id, payload);
  }
};

export const deleteStudentFromCloud = async (id) => {
  if (!uid()) return;
  try {
    await studentsCol().doc(String(id)).delete();
    // Cascade-delete related fee records and notifications from cloud
    const fees = await feeRecordsCol().where('student_id', '==', Number(id)).get();
    for (const d of fees.docs) await d.ref.delete();
    const notifs = await notificationsCol().where('student_id', '==', Number(id)).get();
    for (const d of notifs.docs) await d.ref.delete();
  } catch (err) {
    console.log('deleteStudentFromCloud failed — queued:', err.message);
    await enqueueSync('delete', 'students', id, { id });
  }
};

// ─── Sync fee record TO Firestore ─────────────────────────────────────────────
export const syncFeeRecord = async (feeRecord) => {
  if (!uid()) return;
  const payload = {
    id: feeRecord.id,
    student_id: feeRecord.student_id,
    month: feeRecord.month,
    status: feeRecord.status,
    amount_due: feeRecord.amount_due,
    amount_paid: feeRecord.amount_paid || 0,
    paid_at: feeRecord.paid_at || null,
    notes: feeRecord.notes || '',
    updated_at: new Date().toISOString(),
  };
  try {
    await feeRecordsCol().doc(String(feeRecord.id)).set(payload);
  } catch (err) {
    console.log('syncFeeRecord failed — queued:', err.message);
    await enqueueSync('set', 'fee_records', feeRecord.id, payload);
  }
};

// ─── Sync notification TO Firestore ──────────────────────────────────────────
export const syncNotification = async (notif) => {
  if (!uid()) return;
  const payload = {
    id: notif.id,
    student_id: notif.student_id,
    fee_record_id: notif.fee_record_id || null,
    month: notif.month,
    type: notif.type,
    message: notif.message,
    is_read: notif.is_read || 0,
    created_at: notif.created_at || new Date().toISOString(),
  };
  try {
    await notificationsCol().doc(String(notif.id)).set(payload);
  } catch (err) {
    console.log('syncNotification failed — queued:', err.message);
    await enqueueSync('set', 'notifications', notif.id, payload);
  }
};

export const deleteNotificationFromCloud = async (id) => {
  if (!uid()) return;
  try {
    await notificationsCol().doc(String(id)).delete();
  } catch (err) {
    console.log('deleteNotificationFromCloud failed — queued:', err.message);
    await enqueueSync('delete', 'notifications', id, { id });
  }
};

export const updateNotificationReadInCloud = async (id, isRead) => {
  if (!uid()) return;
  const payload = { is_read: isRead };
  try {
    await notificationsCol().doc(String(id)).update(payload);
  } catch (err) {
    console.log('updateNotificationReadInCloud failed — queued:', err.message);
    await enqueueSync('update', 'notifications', id, { id, ...payload });
  }
};

// ─── Flush offline sync queue ─────────────────────────────────────────────────
export const flushSyncQueue = async () => {
  try {
    if (!uid()) return;
    const queue = await getPendingQueue();
    if (queue.length === 0) return;

    console.log(`🔄 Flushing ${queue.length} queued sync operations...`);

    for (const item of queue) {
      try {
        const payload = JSON.parse(item.payload);

        if (item.operation === 'set') {
          if (item.entity_type === 'students') {
            await studentsCol().doc(item.entity_id).set(payload);
          } else if (item.entity_type === 'fee_records') {
            await feeRecordsCol().doc(item.entity_id).set(payload);
          } else if (item.entity_type === 'notifications') {
            await notificationsCol().doc(item.entity_id).set(payload);
          } else if (item.entity_type === 'attendance') {
            await attendanceCol().doc(item.entity_id).set(payload);
          }
        } else if (item.operation === 'delete') {
          if (item.entity_type === 'students') {
            await studentsCol().doc(item.entity_id).delete();
            const fees = await feeRecordsCol()
              .where('student_id', '==', Number(item.entity_id)).get();
            for (const d of fees.docs) await d.ref.delete();
            const notifs = await notificationsCol()
              .where('student_id', '==', Number(item.entity_id)).get();
            for (const d of notifs.docs) await d.ref.delete();
          } else if (item.entity_type === 'fee_records') {
            await feeRecordsCol().doc(item.entity_id).delete();
          } else if (item.entity_type === 'notifications') {
            await notificationsCol().doc(item.entity_id).delete();
          } else if (item.entity_type === 'attendance') {
            await attendanceCol().doc(item.entity_id).delete();
          }
        } else if (item.operation === 'update') {
          if (item.entity_type === 'notifications') {
            const { id: _id, ...fields } = payload;
            await notificationsCol().doc(item.entity_id).update(fields);
          }
        }

        await dequeueSync(item.id);
        console.log(`✅ Flushed: ${item.operation} ${item.entity_type} #${item.entity_id}`);
      } catch (err) {
        console.log(`⚠️ Flush failed for ${item.entity_type} #${item.entity_id}:`, err.message);
      }
    }
  } catch (err) {
    console.log('flushSyncQueue error:', err.message);
  }
};

// ─── Attendance collection reference ─────────────────────────────────────────
const attendanceCol = () =>
  firestore().collection('users').doc(uid()).collection('attendance');

// ─── Sync attendance record TO Firestore ─────────────────────────────────────
export const syncAttendanceRecord = async (record) => {
  if (!uid()) return;
  const payload = {
    id: record.id,
    student_id: record.student_id,
    date: record.date,
    status: record.status,
    created_at: record.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  try {
    await attendanceCol().doc(String(record.id)).set(payload);
  } catch (err) {
    console.log('syncAttendanceRecord failed — queued:', err.message);
    await enqueueSync('set', 'attendance', record.id, payload);
  }
};

// ─── Delete attendance record FROM Firestore ──────────────────────────────────
export const deleteAttendanceFromCloud = async (id) => {
  if (!uid()) return;
  try {
    await attendanceCol().doc(String(id)).delete();
  } catch (err) {
    console.log('deleteAttendanceFromCloud failed — queued:', err.message);
    await enqueueSync('delete', 'attendance', id, { id });
  }
};

// ─── Clear local SQLite data on logout ───────────────────────────────────────
export const clearLocalData = async () => {
  try {
    const database = await getDB();
    await database.runAsync(`DELETE FROM students`);
    await database.runAsync(`DELETE FROM fee_records`);
    await database.runAsync(`DELETE FROM notifications`);
    await database.runAsync(`DELETE FROM attendance`);
    await database.runAsync(`DELETE FROM sync_queue`);
    console.log('✅ Local data cleared on logout');
  } catch (err) {
    console.log('clearLocalData error:', err.message);
  }
};
