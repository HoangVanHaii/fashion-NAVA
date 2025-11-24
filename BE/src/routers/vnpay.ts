import { Router } from 'express';
import { createPaymentQR, checkPayment } from '../controllers/vnpay';
import { authMiddleware } from '../middlewares/authMiddleware';
const router = Router();

router.post('/create-qr',authMiddleware, createPaymentQR);
router.get('/check-payment-vnpay', checkPayment);

export default router;
