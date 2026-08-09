const express = require('express');
const router = express.Router();
const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentFeeHistory,
} = require('../controllers/studentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getStudents).post(createStudent);
router.route('/:id').get(getStudentById).put(updateStudent).delete(deleteStudent);
router.get('/:id/fees', getStudentFeeHistory);

module.exports = router;
