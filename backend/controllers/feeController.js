const FeeRecord = require('../models/FeeRecord');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// @desc  Get or auto-generate fee records for a month (all active students)
// @route GET /api/fees?month=YYYY-MM
// @access Private
const getMonthlyFees = async (req, res) => {
  try {
    const month = req.query.month || getCurrentMonth();

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Invalid month format. Use YYYY-MM.' });
    }

    const students = await Student.find({ isActive: true });

    // Bulk upsert — only insert if no record exists yet
    const upsertOps = students.map((s) => ({
      updateOne: {
        filter: { studentId: s._id, month },
        update: {
          $setOnInsert: {
            studentId: s._id,
            month,
            status: 'missing',
            amountDue: s.monthlyFee,
            amountPaid: 0,
          },
        },
        upsert: true,
      },
    }));

    if (upsertOps.length > 0) await FeeRecord.bulkWrite(upsertOps);

    const feeRecords = await FeeRecord.find({ month })
      .populate('studentId', 'name class contact monthlyFee')
      .sort({ 'studentId.name': 1 });

    res.status(200).json({ success: true, month, count: feeRecords.length, feeRecords });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch monthly fees.', error: err.message });
  }
};

// @desc  Update fee status for one student
// @route POST /api/fees/:studentId
// @access Private
const updateFeeStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, status, notes } = req.body;
    const targetMonth = month || getCurrentMonth();

    if (!['full', 'half', 'missing', 'absent'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: full, half, missing, absent.',
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    let feeRecord = await FeeRecord.findOne({ studentId, month: targetMonth });
    if (!feeRecord) {
      feeRecord = new FeeRecord({ studentId, month: targetMonth, amountDue: student.monthlyFee });
    }

    feeRecord.status = status;
    if (notes !== undefined) feeRecord.notes = notes;
    await feeRecord.save();

    // Sync notifications
    if (status === 'full') {
      await Notification.deleteMany({ studentId, month: targetMonth });
    } else {
      const notifType =
        status === 'missing' ? 'missing_fee' : status === 'half' ? 'partial_fee' : 'absent';
      const message =
        status === 'missing'
          ? `Fee not paid for ${student.name} - ${targetMonth}`
          : status === 'half'
          ? `Only half fee paid for ${student.name} - ${targetMonth}`
          : `${student.name} was absent for ${targetMonth}`;

      await Notification.findOneAndUpdate(
        { studentId, month: targetMonth },
        { studentId, feeRecordId: feeRecord._id, month: targetMonth, type: notifType, message, isRead: false },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ success: true, message: 'Fee status updated.', feeRecord });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update fee status.', error: err.message });
  }
};

// @desc  Get a single student's fee record for a month
// @route GET /api/fees/:studentId?month=YYYY-MM
// @access Private
const getStudentFee = async (req, res) => {
  try {
    const { studentId } = req.params;
    const month = req.query.month || getCurrentMonth();

    const feeRecord = await FeeRecord.findOne({ studentId, month }).populate(
      'studentId',
      'name class contact monthlyFee'
    );

    if (!feeRecord) {
      return res.status(404).json({ success: false, message: 'Fee record not found.' });
    }

    res.status(200).json({ success: true, feeRecord });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch fee record.', error: err.message });
  }
};

// @desc  Pre-generate fee records for all active students
// @route POST /api/fees/generate
// @access Private
const generateMonthlyFees = async (req, res) => {
  try {
    const month = req.body.month || getCurrentMonth();

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Invalid month format. Use YYYY-MM.' });
    }

    const students = await Student.find({ isActive: true });
    let created = 0;
    let skipped = 0;

    for (const student of students) {
      const exists = await FeeRecord.findOne({ studentId: student._id, month });
      if (!exists) {
        await FeeRecord.create({
          studentId: student._id,
          month,
          status: 'missing',
          amountDue: student.monthlyFee,
          amountPaid: 0,
        });
        created++;
      } else {
        skipped++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Fee records generated for ${month}.`,
      created,
      skipped,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate fee records.', error: err.message });
  }
};

module.exports = { getMonthlyFees, updateFeeStatus, getStudentFee, generateMonthlyFees };
