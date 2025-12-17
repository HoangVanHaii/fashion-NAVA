import express from 'express';
import { authMiddleware,adminOrEmployee } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import *as voucherValidate from '../middlewares/voucher';
import *as voucherController from '../controllers/voucher'

const router = express.Router();
//public
router.get('/public/topVoucher', voucherController.getPublicTopVouchers);
router.get('/public/', voucherController.getPublicAllVouchers);
router.get('/public/getVoucherByCode/:code', voucherController.getPublicVoucherByCode);
router.get('/public/getVoucherCodeById/:id', voucherController.getPublicVoucherById);

//auth
router.get('/topVoucher', voucherController.getTopVouchers);
router.get('/',authMiddleware, voucherController.getAllVouchers);
router.get('/getVoucherByCode/:code',authMiddleware, voucherController.getVoucherByCode);
router.get('/getVoucherById/:id',authMiddleware, voucherController.getVoucherById);
router.get('/getVoucherCodeById/:id',authMiddleware, voucherController.getVoucherCodeById);

//user
router.post("/user/claim/code", authMiddleware, voucherValidate.claimVoucherByCodeData, validateRequest, voucherController.claimVoucherByCode);
router.get("/user/", authMiddleware, voucherController.getUserVouchers);

//adminOrEmployee
router.post('/createVoucher',authMiddleware,adminOrEmployee,voucherValidate.createVoucherData,validateRequest,voucherController.createVoucher);
router.put('/updateVoucher/:id',authMiddleware,voucherValidate.updateVoucherData,validateRequest,adminOrEmployee,voucherController.updateVoucher);
export default router;