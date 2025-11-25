import { body } from "express-validator";

export const validateCreateFlashSale = [
    body('title')
        .isString().withMessage('Title must be a string')
        .notEmpty().withMessage('Title is required')
        .bail(),
    body('startDate')
        .notEmpty().withMessage('Start date is required')
        .isISO8601().withMessage('Start date must be a valid date')
        .toDate()
        .bail(),
    body('endDate')
        .notEmpty().withMessage('End date is required')
        .isISO8601().withMessage('End date must be a valid date')
        .toDate()
        .bail()
]

export const validateAddFlashSaleItem = [
    body('items')
        .isArray({ min: 1 }).withMessage('Items must be a non-empty array')
        .bail(),
    body('items.*.size_id_mongo')
        .notEmpty().withMessage((value, { path }) => `${path} is required`)
        .isString().withMessage((value, { path }) => `${path} must be a positive integer`)
        .bail(),
    body('items.*.flash_sale_price')
        .notEmpty().withMessage((value, { path }) => `${path} is required`)
        .isFloat({ gt: 0 }).withMessage((value, { path }) => `${path} must be a positive number`)
        .bail(),
    body('items.*.stock')
        .notEmpty().withMessage((value, { path }) => `${path} is required`)
        .isInt({ gt: -1 }).withMessage((value, { path }) => `${path} must be a non-negative integer`)
        .bail()
];