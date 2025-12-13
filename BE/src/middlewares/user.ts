import { Request, Response, NextFunction } from "express";
import { body, ValidationChain, validationResult } from "express-validator";

export const sendOTP = [
    body("name")
        .exists({ checkFalsy: true })
        .withMessage("Name is required")
        .isString()
        .withMessage("Name must be a string")
        .trim()
        .isLength({ max: 100 })
        .withMessage("Name must be at most 100 characters"),

    body("email")
        .exists({ checkFalsy: true })
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Email must be valid")
        .normalizeEmail(),

    body("password")
        .exists({ checkFalsy: true })
        .withMessage("Password is required")
        .isString()
        .withMessage("Password must be a string")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters"),

    body("phone")
        .exists({ checkFalsy: true })
        .withMessage("Phone is required")
        .isMobilePhone("any")
        .withMessage("Phone must be a valid phone number"),

    body("date_of_birth")
        .exists({ checkFalsy: true })
        .withMessage("date_of_birth is required")
        .isISO8601()
        .withMessage("date_of_birth must be a valid ISO8601 date")
        .toDate(),

    body("gender")
        .exists({ checkFalsy: true })
        .withMessage("Gender is required")
        .isIn(["male", "female", "other"])
        .withMessage("Gender must be one of: male, female, other"),

    body("province")
        .exists({ checkFalsy: true })
        .withMessage("Province is required")
        .isString()
        .withMessage("Province must be a string")
        .trim()
        .isLength({ max: 100 })
        .withMessage("Province must be at most 100 characters"),

    body("district")
        .exists({ checkFalsy: true })
        .withMessage("District is required")
        .isString()
        .withMessage("District must be a string")
        .trim()
        .isLength({ max: 100 })
        .withMessage("District must be at most 100 characters"),

    body("ward")
        .exists({ checkFalsy: true })
        .withMessage("Ward is required")
        .isString()
        .withMessage("Ward must be a string")
        .trim()
        .isLength({ max: 100 })
        .withMessage("Ward must be at most 100 characters"),

    body("street_address")
        .exists({ checkFalsy: true })
        .withMessage("Street address is required")
        .isString()
        .withMessage("Street address must be a string")
        .trim()
        .isLength({ max: 200 })
        .withMessage("Street address must be at most 200 characters"),

    body("bio")
        .optional({ nullable: true })
        .isString()
        .withMessage("Bio must be a string")
        .trim()
        .isLength({ max: 500 })
        .withMessage("Bio must be at most 500 characters"),
];
export const verifyOTP =  [
    body("email")
        .exists({ checkFalsy: true })
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Email must be valid")
        .normalizeEmail(),
    body('otp')
        .exists({ checkFalsy: true })
        .withMessage("otp is required")
        .isString()
        .withMessage("otp must be valid")

]
export const login = [
    body("email")
        .exists({ checkFalsy: true })
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Email must be valid")
        .normalizeEmail(),
    body("password")
        .exists({ checkFalsy: true })
        .withMessage("Password is required")
        .isString()
        .withMessage("Password must be a string")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters")
]

export const sendOTPReset = [
    body("email")
        .exists({ checkFalsy: true })
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Email must be valid")
        .normalizeEmail()
];
export const resetPassword = [
    body("email")
        .exists({ checkFalsy: true })
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Email must be valid")
        .normalizeEmail(),
    body("new_password")
        .exists({ checkFalsy: true })
        .withMessage("new password is required")
        .isString()
        .withMessage("new password must be a string")
        .isLength({ min: 6 })
        .withMessage("new password must be at least 6 characters")
];

export const createAccount = [
    body("name")
        .exists({ checkFalsy: true })
        .withMessage("Name is required")
        .isString()
        .withMessage("Name must be a string")
        .trim()
        .isLength({ max: 100 })
        .withMessage("Name must be at most 100 characters"),

    body("email")
        .exists({ checkFalsy: true })
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Email must be valid")
        .normalizeEmail(),

    body("password")
        .exists({ checkFalsy: true })
        .withMessage("Password is required")
        .isString()
        .withMessage("Password must be a string"),

    body("phone")
        .exists({ checkFalsy: true })
        .withMessage("Phone is required")
        .isMobilePhone("any")
        .withMessage("Phone must be a valid phone number"),

    body("date_of_birth")
        .exists({ checkFalsy: true })
        .withMessage("date_of_birth is required")
        .isISO8601()
        .withMessage("date_of_birth must be a valid ISO8601 date")
        .toDate(),

    body("gender")
        .exists({ checkFalsy: true })
        .withMessage("Gender is required")
        .isIn(["male", "female", "other"])
        .withMessage("Gender must be one of: male, female, other"),

    body("province")
        .exists({ checkFalsy: true })
        .withMessage("Province is required")
        .isString()
        .withMessage("Province must be a string")
        .trim()
        .isLength({ max: 100 })
        .withMessage("Province must be at most 100 characters"),

    body("district")
        .exists({ checkFalsy: true })
        .withMessage("District is required")
        .isString()
        .withMessage("District must be a string")
        .trim()
        .isLength({ max: 100 })
        .withMessage("District must be at most 100 characters"),

    body("ward")
        .exists({ checkFalsy: true })
        .withMessage("Ward is required")
        .isString()
        .withMessage("Ward must be a string")
        .trim()
        .isLength({ max: 100 })
        .withMessage("Ward must be at most 100 characters"),

    body("street_address")
        .exists({ checkFalsy: true })
        .withMessage("Street address is required")
        .isString()
        .withMessage("Street address must be a string")
        .trim()
        .isLength({ max: 200 })
        .withMessage("Street address must be at most 200 characters"),
    body('role')
        .exists({ checkFalsy: true })
        .withMessage("Role is required")
        .isIn(['employee', 'customer', 'admin'])
        .withMessage("Role must be one of: employee, customer, admin")
];
export const changeRole = [
    body("email")
        .exists({ checkFalsy: true })
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Email must be valid") 
        .normalizeEmail(),
    body("newRole")
        .exists({ checkFalsy: true })  
        .withMessage("New role is required")
        .isIn(['employee', 'customer', 'admin'])
        .withMessage("New role must be one of: employee, customer, admin")
];