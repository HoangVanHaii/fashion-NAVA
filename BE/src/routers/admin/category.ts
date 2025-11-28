import { Router } from "express";
import * as categoryController from "../../controllers/admin/category";
import * as categoriesValidator  from "../../middlewares/category"
import { validateRequest } from "../../middlewares/validateRequest";
import { authMiddleware, isAdmin } from "../../middlewares/authMiddleware";
const router = Router();

router.post("/", authMiddleware, isAdmin, categoriesValidator.addCategoryValidator, validateRequest, categoryController.addCategory);
router.put("/:id", authMiddleware, isAdmin, categoriesValidator.updateCategoryValidator, validateRequest, categoryController.updateCategory);
router.delete("/:id", authMiddleware, isAdmin, categoriesValidator.categoryByIdValidator, validateRequest, categoryController.deleteCategory);
router.get("/inactive", authMiddleware, isAdmin, categoryController.getAllInactiveCategories);

export default router;
