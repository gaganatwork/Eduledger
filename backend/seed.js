/**
 * Seed script — creates admin user and sample students with fee records.
 * Run with: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Student = require('./models/Student');
const FeeRecord = require('./models/FeeRecord');

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getPrevMonth = (offset) => {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const sampleStudents = [
  { name: 'Aarav Sharma',  class: '10-A', contact: { phone: '9800000001', email: 'aarav@example.com',  parentName: 'Ravi Sharma'  }, monthlyFee: 2000 },
  { name: 'Priya Patel',   class: '10-A', contact: { phone: '9800000002', email: 'priya@example.com',  parentName: 'Suresh Patel' }, monthlyFee: 2000 },
  { name: 'Rohit Verma',   class: '9-B',  contact: { phone: '9800000003', email: 'rohit@example.com',  parentName: 'Mohan Verma'  }, monthlyFee: 1800 },
  { name: 'Sunita Rai',    class: '9-B',  contact: { phone: '9800000004', email: 'sunita@example.com', parentName: 'Hari Rai'     }, monthlyFee: 1800 },
  { name: 'Kiran Thapa',   class: '8-C',  contact: { phone: '9800000005', parentName: 'Bikram Thapa'  }, monthlyFee: 1500 },
  { name: 'Manish Joshi',  class: '8-C',  contact: { phone: '9800000006', parentName: 'Dinesh Joshi'  }, monthlyFee: 1500 },
  { name: 'Anita Gurung',  class: '7-A',  contact: { phone: '9800000007', email: 'anita@example.com',  parentName: 'Krishna Gurung' }, monthlyFee: 1200 },
  { name: 'Sanjay Karki',  class: '7-A',  contact: { phone: '9800000008', parentName: 'Ganesh Karki'  }, monthlyFee: 1200 },
];

const seedStatuses = ['full', 'full', 'half', 'missing', 'full', 'absent', 'full', 'half'];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await User.deleteMany({});
    await Student.deleteMany({});
    await FeeRecord.deleteMany({});
    console.log('🗑️  Cleared existing data');

    const admin = await User.create({
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin',
    });
    console.log(`👤 Admin created: ${admin.username}`);

    const students = await Student.insertMany(sampleStudents);
    console.log(`👨‍🎓 Created ${students.length} students`);

    const months = [getPrevMonth(2), getPrevMonth(1), getCurrentMonth()];

    for (const month of months) {
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const status = seedStatuses[i % seedStatuses.length];
        const amountPaid =
          status === 'full' ? student.monthlyFee :
          status === 'half' ? Math.floor(student.monthlyFee / 2) : 0;

        await FeeRecord.create({
          studentId: student._id,
          month,
          status,
          amountDue: status === 'absent' ? 0 : student.monthlyFee,
          amountPaid,
          paidAt: (status === 'full' || status === 'half') ? new Date() : null,
        });
      }
    }

    console.log(`💰 Created fee records for: ${months.join(', ')}`);
    console.log('\n🎉 Seed complete!');
    console.log(`   Login → username: ${process.env.ADMIN_USERNAME || 'admin'}, password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
