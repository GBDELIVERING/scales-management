const express = require('express');
const router = express.Router();
const scaleController = require('../controllers/scaleController');
const { validateScale, validateScaleUpdate } = require('../middleware/validation');

router.get('/', scaleController.list);
router.post('/', validateScale, scaleController.create);
router.get('/:id', scaleController.get);
router.put('/:id', validateScaleUpdate, scaleController.update);
router.delete('/:id', scaleController.delete);
router.post('/:id/sync', scaleController.sync);
router.get('/:id/status', scaleController.status);

module.exports = router;
