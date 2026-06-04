import { Address } from '../../interfaces/address';
import * as authService from '../../services/user';
import { AppError } from '../../utils/appError';
import { Request, Response, NextFunction } from 'express';

export const registerAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, phone, date_of_birth, gender, province, district, ward, street_address, bio, preferences, role } = req.body;

        const address: Address = {
            name,
            phone,
            province,
            district,
            ward,
            street_address
        };

        // Bỏ branch_code
        await authService.registerAccount(name, email, password, phone, date_of_birth, gender, address, bio, preferences, role);

        return res.status(201).json({
            message: 'Register successfully. You can login now'
        });
    } catch (err) {
        next(err);
    }
};

export const changeRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, newRole } = req.body;
        await authService.changeUserRole(email, newRole);

        return res.status(200).json({
            message: 'User role updated successfully.'
        });
    } catch (err) {
        next(err);
    }
};

export const getAllUserForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await authService.getAllUsers();

        return res.status(200).json({
            message: 'Get All User successfully',
            users
        });

    } catch (err) {
        next(err);
    }
};

const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(2));
};

export const getTotalUserComparisonForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const type = (req.params.type as string) || 'hôm nay';

        // Gọi service lấy dữ liệu thống kê tổng hợp (đã bỏ target_branch_code)
        const rawData = await authService.getTotalUserComparisonService(type);

        const changePercent = calculateGrowth(rawData.total, rawData.previousTotal);

        return res.status(200).json({
            success: true,
            message: "Get data user successfully",
            results: {
                total: rawData.total,
                changePercent: changePercent,
            }
        });
    } catch (err) {
        next(err);
    }
};