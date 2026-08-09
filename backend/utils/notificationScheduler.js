const cron = require('node-cron');
const FeeRecord = require('../models/FeeRecord');
const Notification = require('../models/Notification');

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Auto-generates notifications for students with missing/partial/absent fees.
 * Runs every day at 9:00 AM.
 */
const scheduleNotificationJob = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running scheduled notification check...');
    const month = getCurrentMonth();

    try {
      const pendingRecords = await FeeRecord.find({
        month,
        status: { $in: ['missing', 'half', 'absent'] },
        notificationSent: false,
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

        const exists = await Notification.findOne({
          studentId: record.studentId._id,
          month,
        });

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

        await FeeRecord.findByIdAndUpdate(record._id, { notificationSent: true });
      }

      console.log(`✅ Notification job complete. Created: ${created} notifications.`);
    } catch (err) {
      console.error('❌ Notification scheduler error:', err.message);
    }
  });

  console.log('📅 Notification scheduler started (runs daily at 9:00 AM)');
};

module.exports = { scheduleNotificationJob };
