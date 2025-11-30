import *as voucherService from '../services/voucher'
import *as userService from '../services/user'
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from "uuid";
import { Voucher } from '../interfaces/voucher';

export const getPublicVoucherById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const branch_code = "HN";
        const voucher = await voucherService.getVoucherById(id,branch_code);
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }
        return res.status(200).json({ voucher });
    } catch (err) {
        next(err);
    }
}

export const getVoucherCodeById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const branch_code = req.user!.branch_code;
        const voucherCode = await voucherService.getVoucherCodeById(id,branch_code)
        if (!voucherCode) {
            return res.status(404).json({ message: 'Voucher not found' });
        }
        return res.status(200).json({ voucherCode });
    } catch (err) {
        next(err);
    }
}
export const getPublicVoucherByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = req.params;
        const branch_code = "HN";
        const voucher = await voucherService.getVoucherByCode(code,branch_code);
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }
        return res.status(200).json({ voucher });
    } catch (err) {
        next(err);
    }
}

export const getVoucherByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = req.params;
        const branch_code = req.user!.branch_code;
        const voucher = await voucherService.getVoucherByCode(code,branch_code);
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }
        return res.status(200).json({ voucher });
    } catch (err) {
        next(err);
    }
}

export const getPublicAllVouchers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const branch_code = "HN";
        const vouchers = await voucherService.getAllVouchers(branch_code);
        return res.status(200).json({ vouchers });
    } catch (err) {
        next(err);
    }
}

export const getAllVouchers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const branch_code = req.user!.branch_code;
        const vouchers = await voucherService.getAllVouchers(branch_code);
        return res.status(200).json({ vouchers });
    } catch (err) {
        next(err);
    }
}

export const getVoucherById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const branch_code = req.user!.branch_code;
        const voucher = await voucherService.getVoucherById(id,branch_code);
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }
        return res.status(200).json({ voucher });
    } catch (err) {
        next(err);
    }
}

export const getPublicTopVouchers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const branch_code = 'HN';
        const top = req.query.top ? parseInt(req.query.top as string, 10) : 4;
        const vouchers = await voucherService.getTopVouchers(top, branch_code);
        
        return res.status(200).json({
            success: true,
            vouchers
        });
    } catch (err) {
        next(err);
    }
};

export const getTopVouchers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const branch_code = req.user!.branch_code;
        const top = req.query.top ? parseInt(req.query.top as string, 10) : 4;
        const vouchers = await voucherService.getTopVouchers(top, branch_code);
        
        return res.status(200).json({
            success: true,
            vouchers
        });
    } catch (err) {
        next(err);
    }
};

export const createVoucher = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_id = req.user!.id;
        const branch_code = req.user!.branch_code;
        const { code, description, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, usage_limit } = req.body;
        const voucher = {
            id:uuidv4(),
            code,
            description,
            discount_type,
            discount_value,
            max_discount,
            min_order_value,
            quantity: usage_limit,
            start_date,
            end_date,
            created_by: user_id
        } as Voucher;
        await voucherService.createVoucher(voucher,branch_code);
        return res.status(201).json({ message: 'Voucher created successfully' });
    }
    catch (err) {
        next(err);
    }
}

export const updateVoucher = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const branch_code= req.user!.branch_code
        const { code, description, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, usage_limit } = req.body;
        const voucher = {
            id: id,
            code,
            description,
            discount_type,
            discount_value,
            max_discount,
            min_order_value,
            start_date,
            end_date,
            quantity: usage_limit,
        } as Voucher;
        await voucherService.updateVoucher(voucher,branch_code);
        return res.status(200).json({ message: 'Voucher updated successfully' });
    }
    catch (err) {
        next(err);
    }
}

export const claimVoucherByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { code } = req.body;
        const branch_code=req.user!.branch_code
        await voucherService.claimVoucherByCode(userId, code,branch_code);

        res.status(201).json({
            success: true,
            message: "Voucher claimed successfully"
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};

export const getUserVouchers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const branch_code = req.user!.branch_code
        const vouchers = await voucherService.getUserVouchers(userId,branch_code);
        res.status(200).json({
            success: true,
            data: vouchers,
        });
    } catch (error) {
        next(error);
    }
};