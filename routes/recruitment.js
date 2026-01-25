const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validateObjectId');
const Recruitment = require('../models/Recruitment');
const User = require('../models/User');

// Get all recruits (admin only)
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const recruits = await Recruitment.find().sort({ createdAt: -1 });
    res.json(recruits);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Add new recruit (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const {
      source,
      name,
      phone,
      email,
      position,
      hrInterviewer,
      technicalInterviewer,
      hrAssessment,
      finalStatus
    } = req.body;

    const newRecruit = new Recruitment({
      source,
      name,
      phone,
      email,
      position,
      hrInterviewer,
      technicalInterviewer,
      hrAssessment,
      finalStatus
    });

    const recruit = await newRecruit.save();
    res.json(recruit);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update recruit (admin only)
router.put('/:id', auth, validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const {
      source,
      name,
      phone,
      email,
      position,
      hrInterviewer,
      technicalInterviewer,
      hrAssessment,
      finalStatus
    } = req.body;

    const recruit = await Recruitment.findById(req.params.id);
    if (!recruit) {
      return res.status(404).json({ msg: 'Recruit not found' });
    }

    recruit.source = source;
    recruit.name = name;
    recruit.phone = phone;
    recruit.email = email;
    recruit.position = position;
    recruit.hrInterviewer = hrInterviewer;
    recruit.technicalInterviewer = technicalInterviewer;
    recruit.hrAssessment = hrAssessment;
    recruit.finalStatus = finalStatus;
    recruit.updatedAt = Date.now();

    await recruit.save();
    res.json(recruit);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete recruit (admin only)
router.delete('/:id', auth, validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const recruit = await Recruitment.findByIdAndDelete(req.params.id);
    if (!recruit) {
      return res.status(404).json({ msg: 'Recruit not found' });
    }
    res.json({ msg: 'Recruit deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 