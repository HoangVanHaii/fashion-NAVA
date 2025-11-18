import * as authService from '../services/user'; 
import { Request, Response } from 'express';

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, phone, date_of_birth, gender } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({ message: 'Missing required fields: name, email, password, phone.' });
        }

        await authService.registerUser(name, email, password, phone, date_of_birth, gender);

        return res.status(201).json({
            message: 'Registration successful. Please check your email for OTP.'
        });

    } catch (err) {
        const error = err as Error;
        console.error('Registration Error:', error.message);

        if (error.message.includes('Email already in use')) {
            return res.status(409).json({ message: 'Email already in use.' });
        }
        // Xử lý lỗi Mongo duplicate key (nếu có lọt qua)
        if (error.message.includes('E11000')) {
            return res.status(409).json({ message: 'Email already in use (MongoDB).' });
        }

        return res.status(500).json({ message: error.message || 'Internal server error' });
    }
};