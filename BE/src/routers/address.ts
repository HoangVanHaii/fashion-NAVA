import express from 'express';
import * as addressController from '../controllers/address';
import { authMiddleware } from '../middlewares/authMiddleware'; 
import { validateRequest } from '../middlewares/validateRequest';
import * as addressValidator from '../middlewares/address';
const router = express.Router();
router.post("/", authMiddleware,addressValidator.addAddressValidator, validateRequest, addressController.addAddress);
router.get("/getAddressesByUser",authMiddleware,validateRequest,addressController.getAddressesByUser);
router.get("/:id",authMiddleware,addressValidator.addressByIdValidator,validateRequest,addressController.getAddressById);
router.put("/:id",authMiddleware,addressValidator.updateAddressValidator,validateRequest,addressController.updateAddress);
router.delete("/:id",authMiddleware,addressValidator.addressByIdValidator,validateRequest,addressController.deleteAddress
);

export default router;