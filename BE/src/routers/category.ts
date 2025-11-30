import { Router } from "express";
import * as categoryController from "../controllers/category";
import * as categoriesValidator  from "../middlewares/category"
import { validateRequest } from "../middlewares/validateRequest";
import { authMiddleware } from "../middlewares/authMiddleware";
const router = Router();

router.get("/active", authMiddleware, categoryController.getAllActiveCategories);
router.get('/categoryName', authMiddleware, categoryController.getCategoryNameByGender);
router.get("/:id", authMiddleware, categoriesValidator.categoryByIdValidator, validateRequest, categoryController.getCategoryById);

router.get("/public/active", categoryController.getAllActiveCategoriesForGuest);
router.get('/public/categoryName', categoryController.getCategoryNameByGenderForGuest);
router.get("/public/:id", categoriesValidator.categoryByIdValidator, validateRequest, categoryController.getCategoryByIdForGuest);



export default router;
