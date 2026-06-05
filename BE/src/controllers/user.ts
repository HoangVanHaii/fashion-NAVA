import { Address } from '../interfaces/address';
import * as authService from '../services/user';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as utilJwt from '../utils/token';
import { User } from '../interfaces/user';
import { AppError } from '../utils/appError';

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            name, email, password, phone, date_of_birth, gender,
            province, district, ward, street_address, bio, preferences
        } = req.body;

        const address: Address = { name, phone, province, district, ward, street_address };

        await authService.registerUser(
            name, email, password, phone, date_of_birth,
            gender, address, bio, preferences
        );

        return res.status(201).json({
            message: 'Registration successful. Please check your email for OTP.'
        });
    } catch (err) {
        next(err);
    }
};

export const verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, otp } = req.body;
        await authService.verifyOTP(email, otp);

        return res.status(200).json({
            message: 'Account verified successfully. You can now log in.'
        });
    } catch (err) {
        next(err);
    }
};

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const result = await authService.loginUser(email, password);

        return res.status(200).json({
            success: true,
            message: 'Login success',
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken: token } = req.body;

        jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
            if (err) {
                return next(new AppError("Invalid or expired refresh token", 403));
            }
            const newAccessToken = utilJwt.accessToken(user.id, user.email, user.role);

            return res.status(200).json({
                success: true,
                accessToken: newAccessToken
            });
        });
    } catch (err) {
        next(err);
    }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userEmail = req.user?.email;
        const fullProfile: User = await authService.getUserProfile(userEmail as string);

        return res.status(200).json({
            message: 'Get profile success',
            data: fullProfile
        });
    } catch (err) {
        console.error("Error getting user profile:", err);
        next(err);
    }
};

export const changeAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userEmail = req.user?.email;
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
        next(err);
    }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userEmail = req.user?.email;
        const { name, phone, date_of_birth, gender, bio, preferences } = req.body;

        await authService.updateUserProfile(
            userEmail as string, name, phone, date_of_birth, gender, bio, preferences
        );

        return res.status(200).json({
            message: 'Profile updated successfully.'
        });
    } catch (err) {
        next(err);
    }
};

export const forgetPasswordSendOTP = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        await authService.forgotPasswordSendOTP(email);

        return res.status(200).json({
            message: 'OTP sent successfully. Please check your email.'
        });
    } catch (err) {
        next(err);
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
        next(err);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, new_password } = req.body;
        await authService.forgotPasswordReset(email, new_password);

        return res.status(200).json({
            message: 'Password reset successfully. You can now log in with your new password.'
        });
    } catch (err) {
        next(err);
    }
};