const express = require('express');
const router = express.Router();

router.all('*', (req, res) => {
    res.status(404).json({ msg: 'Excuse requests are no longer available' });
});

module.exports = router;
