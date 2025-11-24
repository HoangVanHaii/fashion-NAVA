import { Address } from '../../interfaces/address';
import * as authService from '../../services/user';
import { PROVINCE_TO_BRANCH_CODE_MAP } from '../../utils/province'
import { Request, Response, NextFunction } from 'express';

export const registerEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, phone, date_of_birth, gender, province, district, ward, street_address, bio, preferences, role } = req.body;

        const branch_code = PROVINCE_TO_BRANCH_CODE_MAP[province];
        const address: Address = {
            name,
            phone,
            province,
            district,
            ward,
            street_address
        } 
        await authService.registerEmployee(name, email, password, phone, date_of_birth, gender, address, branch_code, bio, preferences, role);
        
        return res.status(201).json({
            message: 'Employee registration successful. Please check your email for OTP.'
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