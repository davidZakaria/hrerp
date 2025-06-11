const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Example route (placeholder)
router.get('/', (req, res) => {
  res.json({ msg: 'Users route working!' });
});

// Admin: Update an employee's vacation days left
router.put('/:userId/vacation-days', auth, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    const { vacationDaysLeft } = req.body;
    if (typeof vacationDaysLeft !== 'number' || vacationDaysLeft < 0) {
      return res.status(400).json({ msg: 'Invalid vacation days value' });
    }
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    user.vacationDaysLeft = vacationDaysLeft;
    await user.save();
    res.json({ msg: 'Vacation days updated', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 