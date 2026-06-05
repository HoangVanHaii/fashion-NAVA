import express from "express";
import * as productController from "../controllers/product";
import { authMiddleware } from "../middlewares/authMiddleware";
import * as productMiddleware from "../middlewares/products";
import { validateRequest } from "../middlewares/validateRequest";

const router = express.Router();

router.get("/", authMiddleware, productController.getAllProducts);

router.get(
    "/best-seller",
    authMiddleware,
    productController.getTopProductsBestSeller
);
router.get(
    "/new",
    authMiddleware,
    productController.getTopProductsNew
);


router.get(
    "/category/gender",
    authMiddleware,
    productController.getAllProductsByGender
);
router.get(
    "/category/:category_id",
    authMiddleware,
    productMiddleware.getByCategoryValidation,
    validateRequest,
    productController.getAllProductsByCategoryId
);
router.get(
    "/getBySize/:size_id",
    authMiddleware,
    productController.getProductBySize
);
router.get(
    "/public/category/gender",
    productController.getAllProductsByGender
);
router.get(
    "/brand/:brand_id",
    authMiddleware,
    productMiddleware.getByBrandValidation,
    validateRequest,
    productController.getAllProductsByBrandId
);

router.get(
    "/best-seller",
    productController.getTopProductsBestSeller
);

router.get(
    "/new",
    authMiddleware,
    productController.getTopProductsNew
);
///

router.get("/public", productController.getAllProducts);
router.get(
    "/public/best-seller",
    productController.getTopProductsBestSeller
);
router.get(
    "/public/new",
    productController.getTopProductsNew
);
router.get(
    "/public/:id",
    productController.getProductDetail
);
router.get(
    "/public/category/:category_id",
    productMiddleware.getByCategoryValidation,
    validateRequest,
    productController.getAllProductsByCategoryId
);
router.get(
    "/public/brand/:brand_id",
    productMiddleware.getByBrandValidation,
    validateRequest,
    productController.getAllProductsByBrandId
);
router.get(
    "/:id",
    authMiddleware,
    productController.getProductDetail
);

export default router;
