const FeeRecord = require('../models/FeeRecord');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// @desc  Get dashboard summary for a given month
// @route GET /api/dashboard?month=YYYY-MM
// @access Private
const getDashboard = async (req, res) => {
  try {
    const month = req.query.month || getCurrentMonth();

    const totalStudents = await Student.countDocuments({ isActive: true });

    const feeRecords = await FeeRecord.find({ month }).populate(
      'studentId',
      'name class contact monthlyFee isActive'
    );

    // Only include records for active students
    const active = feeRecords.filter((r) => r.studentId?.isActive);

    // Exclude absent from totals (they contribute ₹0 to both due and collected)
    const billable = active.filter((r) => r.status !== 'absent');
    const totalDue = billable.reduce((sum, r) => sum + r.amountDue, 0);
    const totalCollected = billable.reduce((sum, r) => sum + r.amountPaid, 0);
    const totalPending = totalDue - totalCollected;
    const collectionRate = totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0;

    const fullPaid = active.filter((r) => r.status === 'full').length;
    const halfPaid = active.filter((r) => r.status === 'half').length;
    const missing = active.filter((r) => r.status === 'missing').length;
    const absent = active.filter((r) => r.status === 'absent').length;

    const pendingStudents = active
      .filter((r) => r.status === 'missing' || r.status === 'half')
      .map((r) => ({
        feeRecordId: r._id,
        studentId: r.studentId._id,
        name: r.studentId.name,
        class: r.studentId.class,
        phone: r.studentId.contact?.phone,
        monthlyFee: r.studentId.monthlyFee,
        amountDue: r.amountDue,
        amountPaid: r.amountPaid,
        amountPending: r.amountDue - r.amountPaid,
        status: r.status,
        month: r.month,
      }));

    const absentStudents = active
      .filter((r) => r.status === 'absent')
      .map((r) => ({
        studentId: r.studentId._id,
        name: r.studentId.name,
        class: r.studentId.class,
        month: r.month,
      }));

    const unreadNotifications = await Notification.countDocuments({ isRead: false });

    // Last 6 months trend
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const records = await FeeRecord.find({ month: m });
      const collected = records.reduce((s, r) => s + r.amountPaid, 0);
      const due = records.reduce((s, r) => s + r.amountDue, 0);
      monthlyTrend.push({ month: m, collected, due });
    }

    res.status(200).json({
      success: true,
      month,
      summary: { totalStudents, totalDue, totalCollected, totalPending, collectionRate },
      statusBreakdown: { fullPaid, halfPaid, missing, absent },
      pendingStudents,
      absentStudents,
      unreadNotifications,
      monthlyTrend,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data.', error: err.message });
  }
};

module.exports = { getDashboard };
