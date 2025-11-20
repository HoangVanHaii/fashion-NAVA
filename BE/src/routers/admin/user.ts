import { Router } from 'express';
import * as admincontroller from '../../controllers/admin/user'
import * as userMiddleware from '../../middlewares/user'
import { validateRequest } from '../../middlewares/validateRequest';

const router = Router();
router.post('/register-employee',userMiddleware.registerEmployee, validateRequest ,admincontroller.registerEmployee);
router.put('/change-role', userMiddleware.changeRole, validateRequest, admincontroller.changeRole);

export default router;