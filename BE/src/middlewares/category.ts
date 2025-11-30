import { body, param } from "express-validator";

export const addCategoryValidator = [
    body("category_name")
        .notEmpty()
        .withMessage("Category name is required")
        .isLength({ max: 100 })
        .withMessage("Category name must not exceed 100 characters"),

    body("description")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Description must not exceed 255 characters"),

    body("status")
        .optional()
        .isIn(["active", "inactive"])
        .withMessage("Status must be either 'active' or 'inactive'"),
    body("gender")
        .optional()
        .isIn(["Nam", "Nữ", "Khác"]).withMessage("Gender is in Nam or Nu or Khac")
];

export const updateCategoryValidator = [
    param("id")
        .isString().withMessage('Product ID SQL must be a string')
        .notEmpty().withMessage('Product ID SQL is required'),
    body("category_name")
        .optional()
        .notEmpty()
        .withMessage("Category name cannot be empty")
        .isLength({ max: 100 })
        .withMessage("Category name must not exceed 100 characters"),

    body("description")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Description must not exceed 255 characters"),

    body("status")
        .optional()
        .isIn(["active", "inactive"])
        .withMessage("Status must be either 'active' or 'inactive'"),
    body("gender")
        .optional()
        .isIn(["Nam", "Nữ", "Khác"]).withMessage("Gender is in Nam or Nu or Khac")
];

export const categoryByIdValidator = [
    param("id")
        .isString().withMessage('Product ID SQL must be a string')
        .notEmpty().withMessage('Product ID SQL is required')
];
