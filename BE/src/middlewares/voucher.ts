import { body } from "express-validator";

const voucherData = [
    body('code').notEmpty().withMessage('Code is required'),
    body('description').notEmpty().withMessage('Description is required'),
    
    body('discount_type').isIn(['PERCENT', 'FIXED']).withMessage('Discount type must be either PERCENT or FIXED'),
    
    body('discount_value').isFloat({ gt: 0 }).withMessage('Discount value must be a positive number'),

    body('min_order_value').isFloat({ min: 0 }).withMessage('Minimum order value must be a positive number or 0'),

    body('max_discount').optional({ nullable: true }).isFloat({ gt: 0 }).withMessage('Maximum discount must be a positive number'),

    body('quantity').isInt({ gt: 0 }).withMessage('Quantity must be a positive integer'),

    body('start_date').isISO8601().toDate().withMessage('Start date must be a valid date'),
  
    body('end_date').isISO8601().toDate().withMessage('End date must be a valid date')
        .custom((value, { req }) => {
            if (req.body.start_date && value <= req.body.start_date) {
                throw new Error('End date must be after start date');
            }
            return true;
        }),
];


export const createVoucherData = [...voucherData];

const makeOptionalValidator = (validator: any) => validator.optional({ nullable: true });

export const updateVoucherData = [
    ...voucherData.map(makeOptionalValidator)
];

export const claimVoucherByCodeData = [
    body("code")
        .notEmpty()
        .withMessage("Code is required")
        .isString()
        .withMessage("Code must be a string"),
];