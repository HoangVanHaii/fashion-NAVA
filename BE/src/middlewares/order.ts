import { body, param } from "express-validator";

export const createOrder = [
    body("orderItems")
        .exists({ checkFalsy: true })
        .withMessage("Order items list is required")
        .isArray({ min: 1 })
        .withMessage("orderItems must be an array and contain at least one product"),

    body("orderItems.*.size_id")
        .exists({ checkFalsy: true })
        .withMessage("size_id for each product is required")
        .isString() 
        .withMessage("size_id must be a string"),

    body("orderItems.*.quantity")
        .exists({ checkFalsy: true })
        .withMessage("Quantity for each product is required")
        .isInt({ min: 1 })
        .withMessage("Quantity must be a positive integer"),

    body("voucherCode")
        .optional({ nullable: true, checkFalsy: true }) // Allows null, undefined, or empty string
        .isString()
        .withMessage("Voucher code must be a string")
        .trim()
        .isLength({ max: 50 })
        .withMessage("Voucher code must be at most 50 characters long"),

    body("address")
        .exists({ checkFalsy: true })
        .withMessage("Address information is required"),

    body("address.name")
        .exists({ checkFalsy: true })
        .withMessage("Recipient name in the address is required")
        .isString()
        .withMessage("Recipient name must be a string")
        .trim()
        .isLength({ max: 100 })
        .withMessage("Recipient name must be at most 100 characters"),

    body("address.phone")
        .exists({ checkFalsy: true })
        .withMessage("Phone number in the address is required")
        .isMobilePhone("any")
        .withMessage("Invalid phone number format"),

    body("address.province")
        .exists({ checkFalsy: true })
        .withMessage("Province is required")
        .isString()
        .withMessage("Province must be a string"),

    body("address.district")
        .exists({ checkFalsy: true })
        .withMessage("District is required")
        .isString()
        .withMessage("District must be a string"),

    body("address.ward")
        .exists({ checkFalsy: true })
        .withMessage("Ward is required")
        .isString()
        .withMessage("Ward must be a string"),

    body("address.street_address")
        .exists({ checkFalsy: true })
        .withMessage("Street address is required")
        .isString()
        .withMessage("Street address must be a string")
        .trim()
        .isLength({ max: 200 })
        .withMessage("Street address must be at most 200 characters"),

    body("payment_method")
        .exists({ checkFalsy: true })
        .withMessage("Payment method is required")
        .isString()
        .withMessage("Payment method must be a string")
        .isIn(["cod", "vnpay", "momo", "stripe"]) // Example: Specify allowed methods
        .withMessage("Invalid payment method specified")
];

export const cancelOrderValidation = [
    param("id")
        .exists()
        .withMessage("Order ID (id) is required in the URL params")
        .isInt({gt: 0})
        .withMessage("Order ID must be a positive integer")
];

export const changeStatusOrderValidation = [
    body("order_id")
        .exists({ checkFalsy: true })
        .withMessage("Order ID (order_id) is required")
        .isInt({gt: 0})
        .withMessage("Order ID must be a positive integer"),

    body("status")
        .exists({ checkFalsy: true })
        .withMessage("Status is required")
        .isString()
        .withMessage("Status must be a string")
        .isIn(["pending", "confirmed", "shipped", "completed", "cancelled"])
        .withMessage("Status must be one of: pending, confirmed, shipped, completed, cancelled")
];

export const createOrderByEmployee = [
    body("orderItems")
        .exists({ checkFalsy: true })
        .withMessage("Order items list is required")
        .isArray({ min: 1 })
        .withMessage("orderItems must be an array and contain at least one product"),

    body("orderItems.*.size_id")
        .exists({ checkFalsy: true })
        .withMessage("size_id for each product is required")
        .isString()
        .withMessage("size_id must be a string"),

    body("orderItems.*.quantity")
        .exists({ checkFalsy: true })
        .withMessage("Quantity for each product is required")
        .isInt({ min: 1 })
        .withMessage("Quantity must be a positive integer")
]