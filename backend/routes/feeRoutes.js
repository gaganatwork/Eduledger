const express = require('express');
const router = express.Router();
const { getMonthlyFees, updateFeeStatus, getStudentFee, generateMonthlyFees } = require('../controllers/feeController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getMonthlyFees);
router.post('/generate', generateMonthlyFees);
router.route('/:studentId').get(getStudentFee).post(updateFeeStatus);

module.exports = router;
