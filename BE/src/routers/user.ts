import { Router } from 'express';
import * as userController from '../controllers/user'
import * as userMiddleware from '../middlewares/user'
import { validateRequest } from '../middlewares/validateRequest';
import { uploadUser } from '../utils/uploadUser';

const router = Router();

router.post('/register', userMiddleware.sendOTP, validateRequest ,userController.register);
router.post('/verify-otp', userMiddleware.verifyOTP, validateRequest, userController.verify);
router.post('/login', userMiddleware.login, validateRequest, userController.loginUser);
router.post("/refreshToken", userController.refreshToken);

router.post('/forgot-password-send-otp',userMiddleware.sendOTPReset, userController.forgetPasswordSendOTP);
router.post('/forgot-password-verify-otp', userMiddleware.verifyOTP, validateRequest, userController.forgetPasswordVerifyOTP);
router.post('/reset-password', userMiddleware.resetPassword, validateRequest, userController.resetPassword);

router.put('/changeAvatar', uploadUser.single('avatar'), userController.changeAvatar);
router.put('/updateProfile', userController.upadteProfile);

router.get('/profile', userController.getProfile);


export default router;