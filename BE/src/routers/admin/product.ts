import express from "express";
import * as productController from "../../controllers/admin/product";
import { upload } from "../../utils/upload";
import {
  authMiddleware,
  isAdmin,
} from "../../middlewares/authMiddleware";
import * as productMiddleware from "../../middlewares/products";
import { validateRequest } from "../../middlewares/validateRequest";

const router = express.Router();

router.post(
    "/add-color/:id",
    authMiddleware,
    isAdmin,
    upload.any(),
    productMiddleware.mapColorFileUpdate,
    productMiddleware.AddProductColorValidation,
    validateRequest,
    productController.AddProductColor
);
router.get(
    "/best-seller",
    authMiddleware,
    isAdmin, // Middleware chặn chỉ cho Admin
    productController.getTopProductsBestSellerForAdmin
);
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
    "/video",
    authMiddleware,
    isAdmin,
    upload.any(),
    validateRequest,
    productController.updateProductVideo
);
router.put(
    "/color-size",
    authMiddleware,
    isAdmin,
    upload.any(),
    productMiddleware.mapColorFileUpdate,
    productMiddleware.updateProductColorValidation,
    validateRequest,
    productController.updateProductColor
);
router.put(
    "/status/all",
    authMiddleware,
    isAdmin,
    productMiddleware.statusAllValidation,
    validateRequest,
    productController.updateProductStatusALL
);
router.put(
    "/stock/all",
    authMiddleware,
    isAdmin,
    productMiddleware.stockAllValidation,
    validateRequest,
    productController.updateProductStockALL
);
router.delete(
    "/delete/color",
    authMiddleware,
    isAdmin,
    productMiddleware.deleteColorValidation,
    validateRequest,
    productController.deleteProductColor
);

// router.delete(
//     "/delete",
//     authMiddleware,
//     isAdmin,
//     validateRequest,
//     productController.deleteBranchInnventory
// );
export default router;
