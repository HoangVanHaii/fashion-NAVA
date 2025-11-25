import { NextFunction, Request, Response } from 'express'
import *as orderService from '../../services/order'
import { AppError } from '../../utils/appError';
import *as productService from '../../services/product'
import { StatisticalOrder } from '../../interfaces/order';

export const changeStatusOrder = async (req: Request, res: Response, next: NextFunction) => {
    const { order_id, status } = req.body
    const dbBranch = req.dbBranch;
    const branch_code = req.user?.branch_code;

    if (!dbBranch || !dbBranch.connected) {
        throw new AppError(`${branch_code} is not connected`, 503);
    }
    try {
        await orderService.changeStatusOrder(dbBranch, order_id, status);
        return res.status(200).json({
            success: true,
            message: `Order ${status} successfully`
        });
    } catch (error) {
        next(error);
    }
    
}
export const getOrderOfBranch = async (req: Request, res: Response, next: NextFunction) => {
    const dbBranch = req.dbBranch;
    const branch_code = req.user?.branch_code;
    if (!dbBranch || !dbBranch.connected) {
        throw new AppError(`${branch_code} is not connected`, 503);
    }
    try {
        const order = await orderService.getOrderOfBranch(dbBranch);
        return res.status(200).json({
            success: true,
            message: `get order successfully`,
            data: order
        });
    } catch (error) {
        next(error);
    }
}

export const statisticalOrder = async (req: Request, res: Response, next: NextFunction) => {
    const dbBranch = req.dbBranch;
    const branch_code = req.user?.branch_code;
    if (!dbBranch || !dbBranch.connected) {
        throw new AppError(`${branch_code} is not connected`, 503);
    }
    try {
        const order_pending = await orderService.getOrderByStatus(dbBranch, 'pending');
        const order_completed = await orderService.getOrderByStatus(dbBranch, 'completed');
        const order_cancelled = await orderService.getOrderByStatus(dbBranch, 'cancelled');
        const order_shipped = await orderService.getOrderByStatus(dbBranch, 'shipped');
        const order_confirmed = await orderService.getOrderByStatus(dbBranch, 'confirmed');

        const product_banned = await productService.getProductByStatus(dbBranch, 'banned');

        const revenue = await orderService.getRevenueOfBranch(dbBranch);

        const statistical: StatisticalOrder = {
            order_pending,
            order_confirmed,
            order_completed,
            order_shipped,
            order_cancelled,
            product_banned,
            revenue,
            total_order: order_cancelled + order_completed + order_pending + order_shipped + order_confirmed
        }
        return res.status(200).json({
            success: true,
            message: `get statistical order successfully`,
            data: statistical
        });

    } catch (error) {
        next(error);
    }
}