import express from 'express';
import * as orderController from '../../controllers/employee/order'
import { authMiddleware, adminOrEmployee } from '../../middlewares/authMiddleware';
import *as orderMiddleware from '../../middlewares/order'
import { validateRequest } from '../../middlewares/validateRequest';
const router = express.Router();

router.get(
    '/orderOfBranch',
    authMiddleware,
    adminOrEmployee,
    orderController.getOrderOfBranch
);
router.get(
    '/statistical',
    authMiddleware,
    adminOrEmployee,
    orderController.statisticalOrder
)
router.put(
    '/changeStatus',
    orderMiddleware.changeStatusOrderValidation,
    validateRequest,
    authMiddleware,
    adminOrEmployee,
    orderController.changeStatusOrder
)

export default router