import { Router } from "express";
import * as brandController from "../../controllers/employee/brand";
import * as brandsValidator  from "../../middlewares/brand"
import { validateRequest } from "../../middlewares/validateRequest";
import { authMiddleware, adminOrEmployee } from "../../middlewares/authMiddleware";
import { upload } from "../../utils/upload";

const router = Router();

router.post("/", authMiddleware, adminOrEmployee, upload.single('logo'), brandsValidator.addBrandValidator, validateRequest, brandController.createBrand);
router.put("/change-logo/:id", authMiddleware, adminOrEmployee, upload.single('logo'), brandController.changeLogoBrand);
router.put("/:id", authMiddleware, brandsValidator.updateBrandValidator, validateRequest, brandController.updateBrand);
router.delete("/:id", authMiddleware, adminOrEmployee, brandsValidator.brandByIdValidator, validateRequest, brandController.deleteBrand);

export default router;
