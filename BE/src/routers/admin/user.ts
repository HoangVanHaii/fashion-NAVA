import { Router } from 'express';
import * as admincontroller from '../../controllers/admin/user'
import * as userMiddleware from '../../middlewares/user'
import { validateRequest } from '../../middlewares/validateRequest';
import { authMiddleware, isEmployee, isAdmin } from '../../middlewares/authMiddleware';

const router = Router();
router.post(
    '/register-employee',
    // authMiddleware,
    // isAdmin,
    userMiddleware.registerEmployee,
    validateRequest,
    admincontroller.registerEmployee
);
router.put(
    '/change-role',
    authMiddleware,
    isAdmin,
    userMiddleware.changeRole,
    validateRequest,
    admincontroller.changeRole
);

export default router;