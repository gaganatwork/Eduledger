const Notification = require('../models/Notification');
const FeeRecord = require('../models/FeeRecord');

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// @desc  Get all notifications
// @route GET /api/notifications
// @access Private
const getNotifications = async (req, res) => {
  try {
    const { isRead, month } = req.query;
    const query = {};
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (month) query.month = month;

    const notifications = await Notification.find(query)
      .populate('studentId', 'name class contact')
      .sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.status(200).json({ success: true, count: notifications.length, unreadCount, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.', error: err.message });
  }
};

// @desc  Mark notification(s) as read
// @route PUT /api/notifications/:id/read  (use "all" to mark all)
// @access Private
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === 'all') {
      await Notification.updateMany({}, { isRead: true });
      return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    }

    const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    res.status(200).json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark notification as read.', error: err.message });
  }
};

// @desc  Generate notifications for all pending/absent students this month
// @route POST /api/notifications/generate
// @access Private
const generateNotifications = async (req, res) => {
  try {
    const month = req.body.month || getCurrentMonth();

    const pendingRecords = await FeeRecord.find({
      month,
      status: { $in: ['missing', 'half', 'absent'] },
    }).populate('studentId', 'name class');

    let created = 0;

    for (const record of pendingRecords) {
      if (!record.studentId) continue;

      const notifType =
        record.status === 'missing' ? 'missing_fee' :
        record.status === 'half' ? 'partial_fee' : 'absent';

      const message =
        record.status === 'missing'
          ? `Fee not paid for ${record.studentId.name} - ${month}`
          : record.status === 'half'
          ? `Only half fee paid for ${record.studentId.name} - ${month}`
          : `${record.studentId.name} was absent for ${month}`;

      const exists = await Notification.findOne({ studentId: record.studentId._id, month });
      if (!exists) {
        await Notification.create({
          studentId: record.studentId._id,
          feeRecordId: record._id,
          month,
          type: notifType,
          message,
        });
        created++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Generated ${created} new notifications for ${month}.`,
      created,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate notifications.', error: err.message });
  }
};

// @desc  Delete a notification
// @route DELETE /api/notifications/:id
// @access Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    res.status(200).json({ success: true, message: 'Notification deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete notification.', error: err.message });
  }
};

module.exports = { getNotifications, markAsRead, generateNotifications, deleteNotification };
