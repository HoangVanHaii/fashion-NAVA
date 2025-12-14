import { body, param } from "express-validator";

// --- VALIDATOR GỐC (Dùng cho Create) ---

const validateName = body("name")
  .notEmpty().withMessage("Name is required")
  .isLength({ min: 3, max: 50 }).withMessage("Name must be between 3 and 50 characters")
  .bail();

const validatePhone = body("phone")
  .notEmpty().withMessage("Phone is required")
  .isMobilePhone("vi-VN").withMessage("Invalid phone number")
  .bail();


// -- CÁC FIELD ĐỊA CHỈ MỚI --
const validateProvince = body("province")
  .notEmpty().withMessage("Province is required")
  .isString().withMessage("Province must be a string")
  .bail();

const validateDistrict = body("district")
  .notEmpty().withMessage("District is required")
  .isString().withMessage("District must be a string")
  .bail();

const validateWard = body("ward")
  .notEmpty().withMessage("Ward is required")
  .isString().withMessage("Ward must be a string")
  .bail();

const validateStreetAddress = body("street_address")
  .notEmpty().withMessage("Street address is required")
  .isLength({ min: 5 }).withMessage("Street address must be at least 5 characters")
  .bail();


const validateIsDefault = body("is_default")
  .optional()
  .isBoolean().withMessage("is_default must be true or false")
  .bail();

export const addAddressValidator = [
  validateName,
  validatePhone,
  validateProvince,
  validateDistrict,
  validateWard,
  validateStreetAddress,
  validateIsDefault,
];

export const addressByIdValidator = [
  param("id")
    .isUUID().withMessage("Address ID must be a valid UUID")
];


const updateName = body("name").optional().isLength({ min: 3, max: 50 }).withMessage("Name must be between 3 and 50 characters").bail();
const updatePhone = body("phone").optional().isMobilePhone("vi-VN").withMessage("Invalid phone number").bail();

const updateProvince = body("province").optional().notEmpty().withMessage("Province cannot be empty").bail();
const updateDistrict = body("district").optional().notEmpty().withMessage("District cannot be empty").bail();
const updateWard = body("ward").optional().notEmpty().withMessage("Ward cannot be empty").bail();
const updateStreetAddress = body("street_address").optional().isLength({ min: 5 }).withMessage("Street address must be at least 5 characters").bail();

const updateIsDefault = validateIsDefault; 

export const updateAddressValidator = [
  ...addressByIdValidator, 
  updateName,
  updatePhone,
  updateProvince,
  updateDistrict,
  updateWard,
  updateStreetAddress,
  updateIsDefault,
];