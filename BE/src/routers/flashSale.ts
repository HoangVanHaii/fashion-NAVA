import { Router } from "express";
import * as flashSaleController from "../controllers/flashSale";
import { adminOrEmployee, authMiddleware, isAdmin, isEmployee } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import * as flashSaleValidate from '../middlewares/flashSale'
const router = Router();

router.post(
    "/",
    authMiddleware,
    isAdmin,
    flashSaleValidate.validateCreateFlashSale,
    validateRequest,
    flashSaleController.createFlashSale
);
router.put(
    "/:id",
    authMiddleware,
    isAdmin,
    validateRequest,
    flashSaleController.changeStatus
);
router.post(
    "/item/:id",
    authMiddleware,
    isAdmin,
    flashSaleValidate.validateAddFlashSaleItem,
    validateRequest,
    flashSaleController.addFlashSaleItem
);
router.delete('/item/:item', authMiddleware, adminOrEmployee,flashSaleController.sortDeleteItem);
router.delete('/sale/:flashSale', authMiddleware, adminOrEmployee, flashSaleController.sortDeleteFlashSale);

router.get("/productActive/:flash_id", authMiddleware, flashSaleController.getProductActiveByFlashSaleId);
router.get("/branch/productActive/:flash_id", authMiddleware, flashSaleController.getProductActiveByFlashSaleIdBranch);

router.get("/active-not-in", authMiddleware, flashSaleController.getFlashSaleHotDeal);
router.get("/public/active-not-in", flashSaleController.getFlashSaleHotDealPublic);
router.get("/productNotSale", authMiddleware, flashSaleController.getProductNotInFlashSale);


router.get("/flash-sale-home", authMiddleware, flashSaleController.getFlashSaleHome);
router.get("/public/flash-sale-home", flashSaleController.getFlashSaleHomePublic);
router.get("/flash-sale-active", authMiddleware, adminOrEmployee,  flashSaleController.getFlashSaleActive)

export default router;