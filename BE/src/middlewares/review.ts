import { body, param } from "express-validator";

// Validate tạo review
export const createReview = [
  body("order_item_id")
    .exists({ checkFalsy: true })
    .withMessage("order_item_id is required")
    .isString()
    .withMessage("order_item_id must be a string"),

  body("rating")
    .exists({ checkFalsy: true })
    .withMessage("rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("rating must be an integer between 1 and 5"),

  body("comment")
    .exists({ checkFalsy: true })
    .withMessage("comment is required")
    .isString()
    .withMessage("comment must be a string")
    .isLength({ max: 1000 })
    .withMessage("comment must be at most 1000 characters"),
];

// Validate update review
export const updateReview = [
  param("review_id")
    .exists({ checkFalsy: true })
    .withMessage("review_id is required")
    .isMongoId()
    .withMessage("review_id must be a valid MongoDB ObjectId"),

  body("order_item_id")
    .optional()
    .isString()
    .withMessage("order_item_id must be a string"),

  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("rating must be an integer between 1 and 5"),

  body("comment")
    .optional()
    .isString()
    .withMessage("comment must be a string")
    .isLength({ max: 1000 })
    .withMessage("comment must be at most 1000 characters"),
];

// Validate thêm child review
export const addChildReview = [
  param("parent_id")
    .exists({ checkFalsy: true })
    .withMessage("parent_id is required")
    .isMongoId()
    .withMessage("parent_id must be a valid MongoDB ObjectId"),

  body("comment")
    .exists({ checkFalsy: true })
    .withMessage("comment is required")
    .isString()
    .withMessage("comment must be a string")
    .isLength({ max: 1000 })
    .withMessage("comment must be at most 1000 characters"),
];

// Validate update child review
export const updateChildReview = [
  param("parent_id")
    .exists({ checkFalsy: true })
    .withMessage("parent_id is required")
    .isMongoId()
    .withMessage("parent_id must be a valid MongoDB ObjectId"),

  body("child_id")
    .exists({ checkFalsy: true })
    .withMessage("child_id is required")
    .isMongoId()
    .withMessage("child_id must be a valid MongoDB ObjectId"),

  body("comment")
    .optional()
    .isString()
    .withMessage("comment must be a string")
    .isLength({ max: 1000 })
    .withMessage("comment must be at most 1000 characters"),
];

// Validate delete review
export const deleteReview = [
  param("review_id_sql")
    .exists({ checkFalsy: true })
    .withMessage("review_id_sql is required")
    .isUUID()
    .withMessage("review_id_sql must be a valid UUID"),

  param("mongodb_id")
    .exists({ checkFalsy: true })
    .withMessage("mongodb_id is required")
    .isMongoId()
    .withMessage("mongodb_id must be a valid MongoDB ObjectId"),
];

// Validate delete child review
export const deleteChildReview = [
  param("parent_id")
    .exists({ checkFalsy: true })
    .withMessage("parent_id is required")
    .isMongoId()
    .withMessage("parent_id must be a valid MongoDB ObjectId"),

  param("child_id")
    .exists({ checkFalsy: true })
    .withMessage("child_id is required")
    .isMongoId()
    .withMessage("child_id must be a valid MongoDB ObjectId"),
];

// Validate get reviews by product id
export const getReviewsByProductId = [
  param("product_id")
    .exists({ checkFalsy: true })
    .withMessage("product_id is required")
    .isString()
    .withMessage("product_id must be a string"),
];
