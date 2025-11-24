import { body, param } from "express-validator";

export const addBrandValidator = [
    body("name")
        .notEmpty().withMessage("Brand name is required")
        .isLength({ max: 150 }).withMessage("Brand name must not exceed 150 characters"),

    body("description")
        .notEmpty().withMessage("Description is required")
        .isLength({ max: 255 }).withMessage("Description must not exceed 255 characters"),
    body("status")
        .optional()
        .isIn(["active", "banned"]).withMessage("Status must be 'active' or 'banned'"),
    body("logo").custom((value, { req }) => {
        if (!req.file) {
            throw new Error("Logo file is required");
        }
        return true;
    })
        
];
export const updateBrandValidator = [
    param("id")
        .isString().withMessage("Brand ID must be a string")
        .notEmpty().withMessage("Brand ID is required"),

    body("name")
        .optional()
        .notEmpty().withMessage("Brand name cannot be empty")
        .isLength({ max: 150 }).withMessage("Brand name must not exceed 150 characters"),

    body("description")
        .optional()
        .isLength({ max: 255 }).withMessage("Description must not exceed 255 characters"),

    body("status")
        .optional()
        .isIn(["active", "banned"]).withMessage("Status must be 'active' or 'banned'")
];

export const brandByIdValidator = [
    param("id")
        .isString().withMessage("Brand ID must be a string")
        .notEmpty().withMessage("Brand ID is required")
];
