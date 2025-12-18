import express from 'express';
import * as orderController from '../controllers/order'
import { validateRequest } from '../middlewares/validateRequest';
import *as orderMiddleware from '../middlewares/order'
import { authMiddleware } from '../middlewares/authMiddleware';
const router = express.Router();

router.post(
    '/createOrder',
    authMiddleware,
    orderMiddleware.createOrder,
    validateRequest,
    orderController.createOrder
);
router.get(
    '/me',
    authMiddleware,
    orderController.getOrderOfMe
);
router.get(
    '/:id',
    authMiddleware,
    orderController.getOrderDetail
);
router.get(
    '/admin/:id',
    authMiddleware,
    orderController.getOrderDetail
);
router.put(
    '/:id/cancel',
    authMiddleware,
    orderMiddleware.cancelOrderValidation,
    validateRequest,
    orderController.cancelOrder
);
export default router;