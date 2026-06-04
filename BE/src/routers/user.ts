import { Router } from 'express';
import * as userController from '../controllers/user'
import * as userMiddleware from '../middlewares/user'
import { validateRequest } from '../middlewares/validateRequest';
import { uploadUser } from '../utils/uploadUser';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', userMiddleware.sendOTP, validateRequest ,userController.register);
router.post('/verify-otp', userMiddleware.verifyOTP, validateRequest, userController.verify);
router.post('/login', userMiddleware.login, validateRequest, userController.loginUser);
router.post("/refreshToken", userController.refreshToken);

router.post(
    '/forgot-password-send-otp',
    authMiddleware,
    userMiddleware.sendOTPReset,
    userController.forgetPasswordSendOTP
);
router.post(
    '/forgot-password-verify-otp',
    authMiddleware,
    userMiddleware.verifyOTP,
    validateRequest,
    userController.forgetPasswordVerifyOTP
);
router.post(
    '/reset-password',
    authMiddleware,
    userMiddleware.resetPassword,
    validateRequest,
    userController.resetPassword
);

router.put(
    '/changeAvatar',
    authMiddleware,
    uploadUser.single('avatar'),
    userController.changeAvatar
);
router.put(
    '/updateProfile',
    authMiddleware,
    userController.updateProfile
);

router.get(
    '/profile',
    authMiddleware,
    userController.getProfile
);


export default router;