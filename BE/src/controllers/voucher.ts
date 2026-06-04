import * as voucherService from '../services/voucher';
import { Request, Response, NextFunction } from 'express';
import { Voucher } from '../interfaces/voucher';

export const getPublicVoucherById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const voucher = await voucherService.getVoucherById(Number(id));
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }
        return res.status(200).json({ voucher });
    } catch (err) {
        next(err);
    }
};

export const getVoucherCodeById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const voucherCode = await voucherService.getVoucherCodeById(Number(id));
        if (!voucherCode) {
            return res.status(404).json({ message: 'Voucher not found' });
        }
        return res.status(200).json({ voucherCode });
    } catch (err) {
        next(err);
    }
};

export const getPublicVoucherByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = req.params;
        const voucher = await voucherService.getVoucherByCode(code);
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }
        return res.status(200).json({ voucher });
    } catch (err) {
        next(err);
    }
};

export const getVoucherByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = req.params;
        const voucher = await voucherService.getVoucherByCode(code);
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }
        return res.status(200).json({ voucher });
    } catch (err) {
        next(err);
    }
};

export const getPublicAllVouchers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vouchers = await voucherService.getAllVouchers();
        return res.status(200).json({ vouchers });
    } catch (err) {
        next(err);
    }
};

export const getAllVouchers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vouchers = await voucherService.getAllVouchers();
        return res.status(200).json({ vouchers });
    } catch (err) {
        next(err);
    }
};

export const getVoucherById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const voucher = await voucherService.getVoucherById(Number(id));
        if (!voucher) {
            return res.status(404).json({ message: 'Voucher not found' });
        }
        return res.status(200).json({ voucher });
    } catch (err) {
        next(err);
    }
};

export const getPublicTopVouchers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const top = req.query.top ? parseInt(req.query.top as string, 10) : 4;
        const vouchers = await voucherService.getTopVouchers(top);
        
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
        const top = req.query.top ? parseInt(req.query.top as string, 10) : 4;
        const vouchers = await voucherService.getTopVouchers(top);
        
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
        const { code, description, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, usage_limit } = req.body;
        
        // Không truyền id vào nữa vì MySQL dùng AUTO_INCREMENT
        const voucher = {
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
        
        await voucherService.createVoucher(voucher);
        return res.status(201).json({ message: 'Voucher created successfully' });
    } catch (err) {
        next(err);
    }
};

export const updateVoucher = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { code, description, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, usage_limit } = req.body;
        
        const voucher = {
            id: Number(id), 
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
        
        await voucherService.updateVoucher(voucher);
        return res.status(200).json({ message: 'Voucher updated successfully' });
    } catch (err) {
        next(err);
    }
};

export const claimVoucherByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = Number(req.user!.id);
        const { code } = req.body;
        
        await voucherService.claimVoucherByCode(userId, code);

        res.status(201).json({
            success: true,
            message: "Voucher claimed successfully"
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

export const getUserVouchers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = Number(req.user!.id);
        const vouchers = await voucherService.getUserVouchers(userId);
        
        res.status(200).json({
            success: true,
            data: vouchers,
        });
    } catch (error) {
        next(error);
    }
};