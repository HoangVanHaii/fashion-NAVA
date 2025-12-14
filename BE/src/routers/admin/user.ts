import { Router } from 'express';
import * as admincontroller from '../../controllers/admin/user'
import * as userMiddleware from '../../middlewares/user'
import { validateRequest } from '../../middlewares/validateRequest';
import { authMiddleware, isEmployee, isAdmin } from '../../middlewares/authMiddleware';

const router = Router();
router.post(
    '/create-user',
    authMiddleware,
    isAdmin,
    userMiddleware.createAccount,
    validateRequest,
    admincontroller.registerAccount
);
router.put(
    '/change-role',
    authMiddleware,
    isAdmin,
    userMiddleware.changeRole,
    validateRequest,
    admincontroller.changeRole
);
router.get(
    '/user',
    authMiddleware,
    isAdmin,
    admincontroller.getAllUserForAdmin
);

export default router;