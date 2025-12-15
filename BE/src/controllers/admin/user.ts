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



const ALL_BRANCHES = ['HN', 'DN', 'HCM'];
const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(2));
};

export const getTotalUserComparisonForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const dbBranch = req.dbBranch;
        const branch_code = req.user?.branch_code;

        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }

        const type = (req.params.type as string) || 'hôm nay';
        console.log(type)
        
        let rawData = { total: 0, previousTotal: 0 };

        if (req.user?.branch_code !== "CT") {
            rawData = await authService.getTotalUserComparisonForAdmin(dbBranch, type);
        } 
        
        else {
            const promises = ALL_BRANCHES.map(async (bn) => {
                const branchPool = getBranchPool(bn);
                if (!branchPool || !branchPool.connected) return null;
        
                return await authService.getTotalUserComparisonForAdmin(branchPool, type);
            });
        
            const results = await Promise.all(promises);
        
            rawData = results.reduce<{ total: number; previousTotal: number }>(
                (acc, curr) => {
                    if (!curr) return acc;
                    acc.total += curr.total;
                    acc.previousTotal += curr.previousTotal;
        
                    return acc;
                },
                { total: 0, previousTotal: 0 } 
            );
        }

        const changePercent = calculateGrowth(rawData.total, rawData.previousTotal);

        const finalResult = {
            total: rawData.total,
            changePercent: changePercent,
        };

        return res.status(200).json({
            success: true,
            message: "Get data user successfully",
            results: finalResult
        });
    }
    catch (err) {
        next(err);
    }
};