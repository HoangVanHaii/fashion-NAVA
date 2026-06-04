import express from 'express';
import * as orderController from '../../controllers/employee/order'
import { authMiddleware, adminOrEmployee, isAdmin } from '../../middlewares/authMiddleware';
import *as orderMiddleware from '../../middlewares/order'
import { validateRequest } from '../../middlewares/validateRequest';
const router = express.Router();

router.get(
    '/orderOfSystem/:method_order',
    authMiddleware,
    adminOrEmployee,
    orderController.getOrderOfSystem
);
router.get(
    '/orderOfTypeBranch',
    authMiddleware,
    isAdmin,
    orderController.getOrderOfTypeBranch
);
router.get(
    '/topOrder/:top',
    authMiddleware,
    adminOrEmployee,
    orderController.getTopOrder
);
router.get(
    '/statistical',
    authMiddleware,
    adminOrEmployee,
    orderController.statisticalOrder
)
router.get(
    '/dashboard/daily-comparison/:type',
    authMiddleware,
    isAdmin,
    orderController.getDailyOrderComparisonForAdmin
);
router.get(
    '/total/daily-comparison/:type',
    authMiddleware,
    isAdmin,
    orderController.getTotalOrderComparisonForAdmin
);
router.get(
    '/total-month/:year',
    authMiddleware,
    isAdmin,
    orderController.getRevenueYearForAdmin
);
router.get(
    '/total-cancelled/daily-comparison/:type',
    authMiddleware,
    isAdmin,
    orderController.getTotalCancelledOrderForAdmin
);
router.get(
    '/daily-comparison/:type',
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