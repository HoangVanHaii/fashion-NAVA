import { Router } from "express";
import * as categoryController from "../../controllers/employee/category";
import * as categoriesValidator  from "../../middlewares/category"
import { validateRequest } from "../../middlewares/validateRequest";
import { authMiddleware, adminOrEmployee } from "../../middlewares/authMiddleware";
const router = Router();

router.post("/", authMiddleware, adminOrEmployee, categoriesValidator.addCategoryValidator, validateRequest, categoryController.addCategory);
router.put("/:id", authMiddleware, adminOrEmployee, categoriesValidator.updateCategoryValidator, validateRequest, categoryController.updateCategory);
router.delete("/:id", authMiddleware, adminOrEmployee, categoriesValidator.categoryByIdValidator, validateRequest, categoryController.deleteCategory);
router.get("/inactive", authMiddleware, adminOrEmployee, categoryController.getAllInactiveCategories);

export default router;
