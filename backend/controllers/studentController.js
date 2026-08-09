const Student = require('../models/Student');
const FeeRecord = require('../models/FeeRecord');
const Notification = require('../models/Notification');

// @desc  Create a new student
// @route POST /api/students
// @access Private
const createStudent = async (req, res) => {
  try {
    const { name, class: studentClass, contact, monthlyFee } = req.body;

    if (!name || !studentClass || !contact?.phone || !monthlyFee) {
      return res.status(400).json({
        success: false,
        message: 'Name, class, contact phone, and monthly fee are required.',
      });
    }

    const student = await Student.create({ name, class: studentClass, contact, monthlyFee });

    res.status(201).json({ success: true, message: 'Student created successfully.', student });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create student.', error: err.message });
  }
};

// @desc  Get all students
// @route GET /api/students
// @access Private
const getStudents = async (req, res) => {
  try {
    const { search, class: filterClass, isActive } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'contact.phone': { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } },
      ];
    }

    if (filterClass) query.class = filterClass;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const students = await Student.find(query).sort({ name: 1 });

    res.status(200).json({ success: true, count: students.length, students });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch students.', error: err.message });
  }
};

// @desc  Get single student
// @route GET /api/students/:id
// @access Private
const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    res.status(200).json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch student.', error: err.message });
  }
};

// @desc  Update student
// @route PUT /api/students/:id
// @access Private
const updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    res.status(200).json({ success: true, message: 'Student updated successfully.', student });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update student.', error: err.message });
  }
};

// @desc  Delete student + all associated records
// @route DELETE /api/students/:id
// @access Private
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    await Notification.deleteMany({ studentId: req.params.id });
    await FeeRecord.deleteMany({ studentId: req.params.id });
    await Student.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Student and all associated records deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete student.', error: err.message });
  }
};

// @desc  Get fee history for a student
// @route GET /api/students/:id/fees
// @access Private
const getStudentFeeHistory = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const feeRecords = await FeeRecord.find({ studentId: req.params.id }).sort({ month: -1 });

    res.status(200).json({ success: true, student, feeRecords });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch fee history.', error: err.message });
  }
};

module.exports = { createStudent, getStudents, getStudentById, updateStudent, deleteStudent, getStudentFeeHistory };
