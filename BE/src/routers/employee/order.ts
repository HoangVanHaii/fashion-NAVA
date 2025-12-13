import express from 'express';
import * as orderController from '../../controllers/employee/order'
import { authMiddleware, adminOrEmployee } from '../../middlewares/authMiddleware';
import *as orderMiddleware from '../../middlewares/order'
import { validateRequest } from '../../middlewares/validateRequest';
const router = express.Router();

router.get(
    '/orderOfBranch/:method_order',
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
router.get(
    '/daily-comparison/type',
    authMiddleware,
    adminOrEmployee,
    orderController.getDailyOrderComparison
);
router.put(
    '/changeStatus',
    orderMiddleware.changeStatusOrderValidation,
    validateRequest,
    authMiddleware,
    adminOrEmployee,
    orderController.changeStatusOrder
)
router.post(
    '/createOrderByEmployee',
    orderMiddleware.createOrderByEmployee,
    validateRequest,
    authMiddleware,
    adminOrEmployee,
    orderController.createOrderByEmployee
)
export default router