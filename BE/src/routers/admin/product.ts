import express from "express";
import * as productController from "../../controllers/employee/product";
import { upload } from "../../utils/upload";
import {
  authMiddleware,
  isAdmin,
} from "../../middlewares/authMiddleware";
import * as productMiddleware from "../../middlewares/products";
import { validateRequest } from "../../middlewares/validateRequest";

const router = express.Router();

router.post(
    "/",
    authMiddleware,
    isAdmin,
    upload.any(),
    productMiddleware.mapColorFile,
    productMiddleware.createProductValidation,
    validateRequest,
    productController.createProduct
);
router.put(
    "/status/:id",
    authMiddleware,
    isAdmin,
    productMiddleware.changeStatusValidation,
    validateRequest,
    productController.changeStatusProduct
);
router.put(
    "/info/:id",
    authMiddleware,
    isAdmin,
    productMiddleware.updateProductInfoValidation,
    validateRequest,
    productController.updateProductInfo
);

router.put(
    "/color-size",
    authMiddleware,
    isAdmin,
    upload.any(),
    productMiddleware.updateProductColorValidation,
    validateRequest,
    productController.updateProductColor
);
export default router;
