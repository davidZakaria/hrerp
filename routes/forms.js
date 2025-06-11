const express = require('express');
const router = express.Router();
const Form = require('../models/Form');
const User = require('../models/User');

// Middleware to verify JWT token
const auth = require('../middleware/auth');

// Submit a new form
router.post('/', auth, async (req, res) => {
    try {
        const { type, startDate, endDate, reason, vacationType, fromHour, toHour } = req.body;
        
        // Duplicate vacation form check
        if (type === 'vacation' && startDate && endDate) {
            const overlap = await Form.findOne({
                user: req.user.id,
                type: 'vacation',
                $or: [
                    // Overlap: new start is between existing start and end
                    { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
                ],
                status: { $in: ['pending', 'approved'] }
            });
            if (overlap) {
                return res.status(400).json({ msg: 'You already have a vacation request for these dates.' });
            }
        }

        const newForm = new Form({
            user: req.user.id,
            type,
            startDate,
            endDate,
            reason,
            vacationType,
            fromHour,
            toHour
        });

        const form = await newForm.save();
        res.json(form);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get all forms for admin
router.get('/admin', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const forms = await Form.find()
            .populate('user', 'name email department')
            .sort({ createdAt: -1 });
        res.json(forms);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get user's own forms
router.get('/my-forms', auth, async (req, res) => {
    try {
        const forms = await Form.find({ user: req.user.id })
            .sort({ createdAt: -1 });
        res.json(forms);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update form status (admin only)
router.put('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const { status, adminComment } = req.body;
        const form = await Form.findById(req.params.id);

        if (!form) {
            return res.status(404).json({ msg: 'Form not found' });
        }

        // Only decrement vacationDaysLeft if approving an annual vacation and it was previously pending
        if (
            form.type === 'vacation' &&
            form.vacationType === 'annual' &&
            status === 'approved' &&
            form.status === 'pending'
        ) {
            // Calculate number of days (inclusive)
            const start = new Date(form.startDate);
            const end = new Date(form.endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            const employee = await User.findById(form.user);
            if (employee) {
                employee.vacationDaysLeft = Math.max(0, (employee.vacationDaysLeft || 21) - days);
                await employee.save();
            }
        }

        form.status = status;
        form.adminComment = adminComment;
        form.updatedAt = Date.now();

        await form.save();
        res.json(form);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Delete form (admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const form = await Form.findByIdAndDelete(req.params.id);
        if (!form) {
            return res.status(404).json({ msg: 'Form not found' });
        }
        res.json({ msg: 'Form deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get current user's vacation days left
router.get('/vacation-days', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ vacationDaysLeft: user.vacationDaysLeft });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get any user's vacation days left (admin only)
router.get('/vacation-days/:userId', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (admin.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ vacationDaysLeft: user.vacationDaysLeft });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Admin: Get report of all users and their vacation days left
router.get('/vacation-days-report', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (admin.role !== 'admin') {
            return res.status(403).json({ msg: 'Not authorized' });
        }
        const users = await User.find({}, 'name email department vacationDaysLeft');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router; 