import { Router } from "express";
import * as flashSaleController from "../controllers/flashSale";
import { authMiddleware, isAdmin, isEmployee } from "../middlewares/authMiddleware";
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
router.post(
    "/item/:id",
    authMiddleware,
    isAdmin,
    flashSaleValidate.validateAddFlashSaleItem,
    validateRequest,
    flashSaleController.addFlashSaleItem
);
router.get("/active-not-in", authMiddleware, flashSaleController.getFlashSaleHotDeal);
router.get("/public/activeNotIn", flashSaleController.getFlashSaleHotDealPublic);

router.get("/flash-sale-home", flashSaleController.getFlashSaleHome);
router.get("/public/flash-sale-home", flashSaleController.getFlashSaleHomePublic);


export default router;