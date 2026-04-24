const { body, param, validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

const validateProduct = [
  body('plu').isInt({ min: 1 }).withMessage('PLU must be a positive integer'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isInt({ min: 0 }).withMessage('Price must be a non-negative integer'),
  body('weight_or_piece').isIn(['W', 'P']).withMessage("weight_or_piece must be 'W' or 'P'"),
  body('item_group').optional().isInt({ min: 1 }),
  body('sell_by_days').optional().isInt({ min: 0 }),
  handleValidationErrors,
];

const validateProductUpdate = [
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('price').optional().isInt({ min: 0 }).withMessage('Price must be a non-negative integer'),
  body('weight_or_piece').optional().isIn(['W', 'P']),
  body('item_group').optional().isInt({ min: 1 }),
  body('sell_by_days').optional().isInt({ min: 0 }),
  handleValidationErrors,
];

const validateScale = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('ip_address')
    .trim()
    .notEmpty()
    .withMessage('IP address is required')
    .matches(/^(\d{1,3}\.){3}\d{1,3}$/)
    .withMessage('Invalid IP address format'),
  handleValidationErrors,
];

const validateScaleUpdate = [
  body('name').optional().trim().notEmpty(),
  body('location').optional().trim().notEmpty(),
  body('ip_address')
    .optional()
    .matches(/^(\d{1,3}\.){3}\d{1,3}$/)
    .withMessage('Invalid IP address format'),
  handleValidationErrors,
];

module.exports = {
  validateProduct,
  validateProductUpdate,
  validateScale,
  validateScaleUpdate,
  handleValidationErrors,
};
