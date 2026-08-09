import * as SQLite from 'expo-sqlite';
import {
  syncStudent,
  deleteStudentFromCloud,
  syncFeeRecord,
  syncNotification,
  deleteNotificationFromCloud,
  updateNotificationReadInCloud,
  syncAttendanceRecord,
  deleteAttendanceFromCloud,
} from '../services/firebase';

let db;

// ─── DB Connection ────────────────────────────────────────────────────────────
export const getDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('tuition_fee.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
  }
  return db;
};

// ─── Schema Init ─────────────────────────────────────────────────────────────
export const initDB = async () => {
  const database = await getDB();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      class TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      parent_name TEXT DEFAULT '',
      monthly_fee REAL NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fee_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      status TEXT DEFAULT 'missing',
      amount_due REAL NOT NULL,
      amount_paid REAL DEFAULT 0,
      paid_at TEXT DEFAULT NULL,
      notes TEXT DEFAULT '',
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(student_id, month)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      fee_record_id INTEGER,
      month TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(student_id, month)
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes for fast lookups
    CREATE INDEX IF NOT EXISTS idx_fee_records_month     ON fee_records(month);
    CREATE INDEX IF NOT EXISTS idx_fee_records_student   ON fee_records(student_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read    ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(student_id);
  `);
};

// ─── Attendance table (created separately so existing installs upgrade cleanly)
export const initAttendanceTable = async () => {
  const database = await getDB();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'present',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(student_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_date    ON attendance(date);
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
  `);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// ─── Students ─────────────────────────────────────────────────────────────────
export const getStudents = async (search = '') => {
  const database = await getDB();
  if (search) {
    return database.getAllAsync(
      `SELECT * FROM students
       WHERE is_active=1 AND (name LIKE ? OR phone LIKE ?)
       ORDER BY name ASC`,
      [`%${search}%`, `%${search}%`]
    );
  }
  return database.getAllAsync(
    `SELECT * FROM students WHERE is_active=1 ORDER BY name ASC`
  );
};

export const getStudentById = async (id) => {
  const database = await getDB();
  return database.getFirstAsync(`SELECT * FROM students WHERE id=?`, [id]);
};

export const createStudent = async ({ name, class: cls, phone, email, parent_name, monthly_fee }) => {
  const database = await getDB();
  const result = await database.runAsync(
    `INSERT INTO students (name, class, phone, email, parent_name, monthly_fee)
     VALUES (?,?,?,?,?,?)`,
    [name, cls, phone, email || '', parent_name || '', monthly_fee]
  );
  const id = result.lastInsertRowId;
  const student = await getStudentById(id);
  syncStudent(student); // background cloud sync
  return id;
};

export const updateStudent = async (id, { name, class: cls, phone, email, parent_name, monthly_fee }) => {
  const database = await getDB();
  await database.runAsync(
    `UPDATE students
     SET name=?, class=?, phone=?, email=?, parent_name=?, monthly_fee=?
     WHERE id=?`,
    [name, cls, phone, email || '', parent_name || '', monthly_fee, id]
  );
  const student = await getStudentById(id);
  syncStudent(student);
};

export const deleteStudent = async (id) => {
  const database = await getDB();
  await database.runAsync(`DELETE FROM students WHERE id=?`, [id]);
  deleteStudentFromCloud(id);
};

// ─── Fee Records ──────────────────────────────────────────────────────────────

/**
 * Auto-create missing fee records for all active students for a given month.
 * Safe to call multiple times — uses INSERT OR IGNORE.
 */
export const generateMonthlyFees = async (month) => {
  const database = await getDB();
  // Single bulk INSERT — much faster than N individual inserts
  await database.runAsync(
    `INSERT OR IGNORE INTO fee_records (student_id, month, status, amount_due, amount_paid)
     SELECT id, ?, 'missing', monthly_fee, 0 FROM students WHERE is_active=1`,
    [month]
  );
};

export const getMonthlyFees = async (month) => {
  const database = await getDB();
  await generateMonthlyFees(month);
  return database.getAllAsync(
    `SELECT f.*, s.name, s.class, s.phone, s.monthly_fee
     FROM fee_records f
     JOIN students s ON f.student_id = s.id
     WHERE f.month=? AND s.is_active=1
     ORDER BY s.name ASC`,
    [month]
  );
};

export const updateFeeStatus = async (studentId, month, status, notes = '') => {
  const database = await getDB();
  const student = await getStudentById(studentId);

  let amountPaid = 0;
  let amountDue = student.monthly_fee;
  let paidAt = null;

  if (status === 'full') {
    amountPaid = student.monthly_fee;
    amountDue = student.monthly_fee;
    paidAt = new Date().toISOString();
  } else if (status === 'half') {
    amountPaid = Math.floor(student.monthly_fee / 2);
    amountDue = student.monthly_fee;
    paidAt = new Date().toISOString();
  } else if (status === 'absent') {
    // Absent: student didn't attend — exclude from totals entirely
    amountPaid = 0;
    amountDue = 0;
  } else {
    // missing: restore full amount_due in case reverting from absent
    amountPaid = 0;
    amountDue = student.monthly_fee;
  }

  await database.runAsync(
    `INSERT INTO fee_records (student_id, month, status, amount_due, amount_paid, paid_at, notes)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(student_id, month) DO UPDATE SET
       status=excluded.status,
       amount_due=excluded.amount_due,
       amount_paid=excluded.amount_paid,
       paid_at=excluded.paid_at,
       notes=excluded.notes`,
    [studentId, month, status, amountDue, amountPaid, paidAt, notes]
  );

  const feeRecord = await database.getFirstAsync(
    `SELECT * FROM fee_records WHERE student_id=? AND month=?`,
    [studentId, month]
  );

  // Manage notifications
  if (status === 'full') {
    // Collect cloud IDs before deleting locally
    const notifsToDelete = await database.getAllAsync(
      `SELECT id FROM notifications WHERE student_id=? AND month=?`,
      [studentId, month]
    );
    await database.runAsync(
      `DELETE FROM notifications WHERE student_id=? AND month=?`,
      [studentId, month]
    );
    for (const n of notifsToDelete) deleteNotificationFromCloud(n.id);
  } else {
    const type =
      status === 'missing' ? 'missing_fee' :
      status === 'half' ? 'partial_fee' : 'absent';

    const message =
      status === 'missing'
        ? `Fee not paid for ${student.name} - ${month}`
        : status === 'half'
        ? `Only half fee paid for ${student.name} - ${month}`
        : `${student.name} was absent for ${month}`;

    await database.runAsync(
      `INSERT INTO notifications (student_id, fee_record_id, month, type, message, is_read)
       VALUES (?,?,?,?,?,0)
       ON CONFLICT(student_id, month) DO UPDATE SET
         type=excluded.type,
         message=excluded.message,
         is_read=0`,
      [studentId, feeRecord?.id ?? null, month, type, message]
    );

    const notif = await database.getFirstAsync(
      `SELECT * FROM notifications WHERE student_id=? AND month=?`,
      [studentId, month]
    );
    if (notif) syncNotification(notif);
  }

  if (feeRecord) syncFeeRecord(feeRecord);
};

export const getStudentFeeHistory = async (studentId) => {
  const database = await getDB();
  return database.getAllAsync(
    `SELECT * FROM fee_records WHERE student_id=? ORDER BY month DESC`,
    [studentId]
  );
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const getNotifications = async () => {
  const database = await getDB();
  return database.getAllAsync(
    `SELECT * FROM notifications ORDER BY created_at DESC`
  );
};

export const markNotificationRead = async (id) => {
  const database = await getDB();
  await database.runAsync(`UPDATE notifications SET is_read=1 WHERE id=?`, [id]);
  updateNotificationReadInCloud(id, 1);
};

export const markAllNotificationsRead = async () => {
  const database = await getDB();
  const unread = await database.getAllAsync(
    `SELECT id FROM notifications WHERE is_read=0`
  );
  await database.runAsync(`UPDATE notifications SET is_read=1`);
  for (const n of unread) updateNotificationReadInCloud(n.id, 1);
};

export const deleteNotification = async (id) => {
  const database = await getDB();
  await database.runAsync(`DELETE FROM notifications WHERE id=?`, [id]);
  deleteNotificationFromCloud(id);
};

export const getUnreadNotificationCount = async () => {
  const database = await getDB();
  const row = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM notifications WHERE is_read=0`
  );
  return row?.count ?? 0;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboardData = async (month) => {
  const database = await getDB();
  await generateMonthlyFees(month);

  const totalStudents = (await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM students WHERE is_active=1`
  ))?.count ?? 0;

  const records = await database.getAllAsync(
    `SELECT f.*, s.name, s.class, s.phone, s.monthly_fee
     FROM fee_records f JOIN students s ON f.student_id=s.id
     WHERE f.month=? AND s.is_active=1`,
    [month]
  );

  // Absent students excluded from fee totals
  const billable = records.filter((r) => r.status !== 'absent');
  const totalDue = billable.reduce((s, r) => s + r.amount_due, 0);
  const totalCollected = billable.reduce((s, r) => s + r.amount_paid, 0);
  const totalPending = totalDue - totalCollected;
  const collectionRate = totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0;

  const fullPaid = records.filter((r) => r.status === 'full').length;
  const halfPaid = records.filter((r) => r.status === 'half').length;
  const missing = records.filter((r) => r.status === 'missing').length;
  const absent = records.filter((r) => r.status === 'absent').length;

  const pendingStudents = records
    .filter((r) => r.status === 'missing' || r.status === 'half')
    .map((r) => ({
      studentId: r.student_id,
      name: r.name,
      class: r.class,
      phone: r.phone,
      monthlyFee: r.monthly_fee,
      amountDue: r.amount_due,
      amountPaid: r.amount_paid,
      amountPending: r.amount_due - r.amount_paid,
      status: r.status,
      month: r.month,
    }));

  const absentStudents = records
    .filter((r) => r.status === 'absent')
    .map((r) => ({ studentId: r.student_id, name: r.name, class: r.class }));

  // Unread notification count
  const unreadNotifications = (await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM notifications WHERE is_read=0`
  ))?.count ?? 0;

  // Last 6 months trend — single query instead of 6 separate queries
  const trendMonths = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    trendMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const trendRows = await database.getAllAsync(
    `SELECT month,
       COALESCE(SUM(amount_paid), 0) AS collected,
       COALESCE(SUM(CASE WHEN status != 'absent' THEN amount_due ELSE 0 END), 0) AS due
     FROM fee_records
     WHERE month IN (${trendMonths.map(() => '?').join(',')})
     GROUP BY month`,
    trendMonths
  );

  // Build map and fill in zeros for months with no data
  const trendMap = {};
  for (const r of trendRows) trendMap[r.month] = r;
  const monthlyTrend = trendMonths.map((m) => ({
    month: m,
    collected: trendMap[m]?.collected ?? 0,
    due: trendMap[m]?.due ?? 0,
  }));

  return {
    totalStudents,
    totalDue,
    totalCollected,
    totalPending,
    collectionRate,
    statusBreakdown: { fullPaid, halfPaid, missing, absent },
    pendingStudents,
    absentStudents,
    unreadNotifications,
    monthlyTrend,
  };
};

// ─── Attendance ───────────────────────────────────────────────────────────────

// Date range constants: Aug 1 2026 → Aug 31 2027
export const ATTENDANCE_MIN_DATE = '2026-08-01';
export const ATTENDANCE_MAX_DATE = '2027-08-31';

export const getTodayDateStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Load attendance for a given date.
 * Returns all active students joined with their status for that date.
 * Students with no record yet default to 'present'.
 */
export const getAttendanceForDate = async (date) => {
  const database = await getDB();
  const students = await database.getAllAsync(
    `SELECT * FROM students WHERE is_active=1 ORDER BY name ASC`
  );
  const records = await database.getAllAsync(
    `SELECT * FROM attendance WHERE date=?`, [date]
  );
  const recordMap = {};
  for (const r of records) recordMap[r.student_id] = r;

  return students.map((s) => ({
    student_id: s.id,
    name: s.name,
    class: s.class,
    phone: s.phone,
    status: recordMap[s.id]?.status ?? 'present',
    attendance_id: recordMap[s.id]?.id ?? null,
  }));
};

/**
 * Save attendance for a date.
 * rows: [{ student_id, status }]
 * isHoliday: if true, all rows get status='holiday'
 */
export const saveAttendance = async (date, rows, isHoliday = false) => {
  const database = await getDB();
  // Wrap all inserts in a transaction — dramatically faster for many rows
  await database.withTransactionAsync(async () => {
    for (const row of rows) {
      const status = isHoliday ? 'holiday' : row.status;
      await database.runAsync(
        `INSERT INTO attendance (student_id, date, status)
         VALUES (?,?,?)
         ON CONFLICT(student_id, date) DO UPDATE SET status=excluded.status`,
        [row.student_id, date, status]
      );
    }
  });
  // Sync to cloud in background after transaction completes
  const saved = await database.getAllAsync(
    `SELECT * FROM attendance WHERE date=?`, [date]
  );
  for (const r of saved) syncAttendanceRecord(r);
};

/**
 * Check if a given date is marked as holiday
 * (all students have status='holiday' for that date)
 */
export const isHolidayDate = async (date) => {
  const database = await getDB();
  const row = await database.getFirstAsync(
    `SELECT COUNT(*) as total,
     SUM(CASE WHEN status='holiday' THEN 1 ELSE 0 END) as holidays
     FROM attendance WHERE date=?`,
    [date]
  );
  if (!row || row.total === 0) return false;
  return row.total === row.holidays;
};

/**
 * Get monthly attendance summary for a student — last 6 months.
 * Returns: [{ month, present, absent, holiday, total, percentage }]
 * Holidays excluded from working days count.
 */
export const getStudentAttendanceSummary = async (studentId) => {
  const database = await getDB();

  // Build last 6 month prefixes
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  // Single query — group by month prefix using substr
  const rows = await database.getAllAsync(
    `SELECT
       substr(date, 1, 7) AS month,
       SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present,
       SUM(CASE WHEN status='absent'  THEN 1 ELSE 0 END) AS absent,
       SUM(CASE WHEN status='holiday' THEN 1 ELSE 0 END) AS holiday
     FROM attendance
     WHERE student_id=? AND substr(date,1,7) IN (${months.map(() => '?').join(',')})
     GROUP BY substr(date, 1, 7)`,
    [studentId, ...months]
  );

  const rowMap = {};
  for (const r of rows) rowMap[r.month] = r;

  return months.map((prefix) => {
    const r       = rowMap[prefix];
    const present = r?.present  ?? 0;
    const absent  = r?.absent   ?? 0;
    const holiday = r?.holiday  ?? 0;
    const working = present + absent;
    const pct     = working > 0 ? Math.round((present / working) * 100) : null;
    return { month: prefix, present, absent, holiday, working, percentage: pct };
  });
};
