import { Address } from '../interfaces/address';
import * as authService from '../services/user'; 
import {PROVINCE_TO_BRANCH_CODE_MAP} from '../utils/province'
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken'
import * as utilJwt from '../utils/token'
export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, phone, date_of_birth, gender, province, district, ward, street_address, bio, preferences } = req.body;

        const branch_code = PROVINCE_TO_BRANCH_CODE_MAP[province];
        const address: Address = {
            name,
            phone,
            province,
            district,
            ward,
            street_address
        } 
        await authService.registerUser(name, email, password, phone, date_of_birth, gender, address, branch_code, bio, preferences);
        
        return res.status(201).json({
            message: 'Registration successful. Please check your email for OTP.'
        });

    } catch (err) {
        next();
        // const error = err as Error;
        // console.error('Registration Error:', error.message);
        
        // if (error.message.includes('Email already in use')) {
        //     return res.status(409).json({ message: 'Email already in use.' });
        // }
        // // Xử lý lỗi Mongo duplicate key (nếu có lọt qua)
        // if (error.message.includes('E11000')) {
        //     return res.status(409).json({ message: 'Email already in use (MongoDB).' });
        // }

        // return res.status(500).json({ message: error.message || 'Internal server error' });
    }
};
export const verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, otp, branch_code } = req.body;

        console.log(otp);
        await authService.verifyOTP(email, otp, branch_code);

        return res.status(200).json({
            message: 'Account verified successfully. You can now log in.'
        });

    } catch (err) {
        next();
        // const error = err as Error;
        // console.error('Verification Error:', error.message);

        // if (error.message.includes('Invalid or expired OTP')) {
        //     return res.status(400).json({ message: 'Invalid or expired OTP.' });
        // }
        // return res.status(500).json({ message: error.message || 'Internal server error' });
    }
};
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const result = await authService.loginUser(email, password);

        return res.status(200).json({
            success: true,
            message: "Login success",
            data: result
        });

    } catch (err) {
        console.log(err);
        // throw err;
        next(err);
    }
}
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;

        jwt.verify(refreshToken, process.env.JWT_SECRET as string, (err: any, user: any) => {
            if (err) {
                // throw new AppError("Invalid or expired refresh token", 403);
            }
            const newAccessToken = utilJwt.accessToken(user.id, user.email, user.role, user.branch_code);

            return res.status(200).json({
                success: true,
                accessToken: newAccessToken
            })
        })

    } catch (err) {
        next(err);
    }
}
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        
        // const userEmail = req.user.email;
        const userEmail ='hvhaihoangvan@gmail.com'
        const fullProfile = await authService.getUserProfile(userEmail as string);

        return res.status(200).json({
            message: 'Get profile success',
            data: fullProfile
        });

    } catch (err) {
        next();
        // const error = err as Error;
        // console.error('Get Profile Error:', error.message);
        // return res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

export const changeAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userEmail = 'hvhaihoangvan@gmail.com';
        const avatarFile = req.file as Express.Multer.File;
        if (!avatarFile) {
            return res.status(400).json({ message: 'No avatar file uploaded.' });
        }

        const updatedAvatarUrl = await authService.updateAvatar(userEmail as string, avatarFile);

        return res.status(200).json({
            message: 'Avatar updated successfully.',
            avatarUrl: updatedAvatarUrl
        });

    } catch (err) {
        next();
        // const error = err as Error;
        // console.error('Change Avatar Error:', error.message);
        // return res.status(500).json({ message: error.message || 'Internal server error' });
    }
}
export const upadteProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userEmail = "hvhaihoangvan@gmail.com";
        const { name, phone, date_of_birth, gender, bio, preferences } = req.body;
 
        await authService.upadteUserProfile(userEmail as string, name, phone, date_of_birth, gender, bio, preferences);
        
        return res.status(200).json({
            message: 'Profile updated successfully.'
        });

    } catch (err) {
        next();
    }
}
export const forgetPasswordSendOTP = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        await authService.forgotPasswordSendOTP(email);

        return res.status(200).json({
            message: 'OTP sent successfully. Please check your email.'
        });

    } catch (err) {
        next();
    }
};
export const forgetPasswordVerifyOTP = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, otp } = req.body;
        await authService.forgotPasswordVerifyOTP(email, otp);

        return res.status(200).json({
            message: 'OTP verified successfully. You can now reset your password.'
        });

    } catch (err) {
        next();
    }
}
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, new_password } = req.body;
        await authService.forgotPasswordReset(email, new_password);

        return res.status(200).json({
            message: 'Password reset successfully. You can now log in with your new password.'
        });

    } catch (err) {
        next();
    }
}