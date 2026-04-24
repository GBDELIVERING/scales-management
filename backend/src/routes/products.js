const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { validateProduct, validateProductUpdate } = require('../middleware/validation');

router.get('/export', productController.exportCSV);
router.post('/import', productController.importCSV);
router.post('/bulk-update', productController.bulkUpdate);
router.get('/', productController.list);
router.post('/', validateProduct, productController.create);
router.get('/:plu', productController.get);
router.put('/:plu', validateProductUpdate, productController.update);
router.delete('/:plu', productController.delete);

module.exports = router;
