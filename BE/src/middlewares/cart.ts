import { body, ValidationChain, validationResult,param } from "express-validator";

export const addtoCart = [
    body("product_id_sql")
        .exists({ checkFalsy: true })
        .withMessage("product_id_sql is required")
        .isUUID() 
        .withMessage("product_id_sql must be a valid UUID/GUID"), 
    body("size_id_mongo")
        .exists({ checkFalsy: true })
        .withMessage("size_id_mongo is required")
        .isMongoId() 
        .withMessage("size_id_mongo must be a valid MongoDB ObjectId"),
    body("quantity")
        .exists({ checkFalsy: true })
        .withMessage("quantity is required")
        .isInt({ min: 1 })
        .withMessage("quantity must be a valid positive integer")
        .toInt(), 
];
export const updateCartItemQuantity: ValidationChain[] = [
    param("id")
        .exists({ checkFalsy: true }).withMessage("Cart item ID (id) is required in parameters")
        .isMongoId().withMessage("ID in parameters must be a valid MongoDB ObjectId"),
    body("newQuantity")
        .exists({ checkFalsy: true }).withMessage("newQuantity is required")
        .isInt({ min: 1 }).withMessage("newQuantity must be a positive integer (>= 1)")
        .toInt(),
];

export const updateCartItem: ValidationChain[] = [
    param("id")
        .exists({ checkFalsy: true }).withMessage("Cart item ID (id) is required in parameters")
        .isMongoId().withMessage("ID in parameters must be a valid MongoDB ObjectId"),
    body("new_size_id")
        .exists({ checkFalsy: true }).withMessage("new_size_id is required")
        .isMongoId().withMessage("new_size_id must be a valid MongoDB ObjectId"),
];

export const removeCartItem: ValidationChain[] = [
    param("id")
        .exists({ checkFalsy: true }).withMessage("Cart item ID (id) is required in parameters")
        .isMongoId().withMessage("ID in parameters must be a valid MongoDB ObjectId"),
];

