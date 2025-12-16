import { pool } from 'mssql';
import { Address } from '../../interfaces/address';
import * as authService from '../../services/user';
import { AppError } from '../../utils/appError';
import { PROVINCE_TO_BRANCH_CODE_MAP } from '../../utils/province'
import { Request, Response, NextFunction } from 'express';
import { getBranchPool } from '../../config/database';

export const registerAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, phone, date_of_birth, gender, province, district, ward, street_address, bio, preferences, role } = req.body;
        console.log(req.body);
        const branch_code = PROVINCE_TO_BRANCH_CODE_MAP[province];
        const address: Address = {
            name,
            phone,
            province,
            district,
            ward,
            street_address
        } 
        await authService.registerAccount(name, email, password, phone, date_of_birth, gender, address, branch_code, bio, preferences, role);
        
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
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }

        let users;
        if (req.user?.branch_code === 'CT') {
            users = await authService.getAllUserForCentral();
        }
        else {
            users = await authService.getAllUser(req.dbBranch, req.user!.branch_code);
        }
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

        // Lấy branch từ query (cho Admin chọn) hoặc từ token (cho Employee/Local Admin)
        const target_branch_code = (req.query.branch as string) || req.user?.branch_code;

        if (!target_branch_code) {
            throw new AppError("Branch code is required", 400);
        }
        let rawData;
        if (req.user?.branch_code !== "CT") {
            rawData = await authService.getTotalUserComparisonService(req.user?.branch_code || 'DN', type);   
        }
        else {
            rawData = await authService.getTotalUserComparisonService(target_branch_code, type);
        }
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