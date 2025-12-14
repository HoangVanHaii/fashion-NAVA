import { Router } from "express";
import * as brandController from "../controllers/brand";
import * as brandsValidator  from "../middlewares/brand"
import { validateRequest } from "../middlewares/validateRequest";
import { authMiddleware } from "../middlewares/authMiddleware";
const router = Router();

router.get("/all", authMiddleware, brandController.getAllBrands);
router.get("/detail/:id", authMiddleware, brandsValidator.brandByIdValidator, validateRequest, brandController.getBrandById);
router.get("/rating/:id", authMiddleware, brandController.getBrandRating);

router.get("/public/rating/:id", brandController.getBrandRating);
router.get("/public", brandController.getAllBrandsForGuest);
router.get("/public/detail/:id", brandsValidator.brandByIdValidator, validateRequest, brandController.getBrandByIdForGuest);

export default router;
