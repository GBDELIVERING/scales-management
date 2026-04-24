const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

router.post('/all', syncController.syncAll);
router.get('/logs', syncController.getLogs);
router.get('/logs/:scaleId', syncController.getScaleLogs);

module.exports = router;
