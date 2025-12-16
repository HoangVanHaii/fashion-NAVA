import { FlashSale, FlashSaleItem } from "../interfaces/flashSale";
import { Request, Response, NextFunction } from "express";
import * as FlashSaleService from "../services/flashSale";
import { AppError } from "../utils/appError";
import { getBranchPool } from "../config/database";
import { getBranchIdByCode } from "../services/product";
import mssql, { pool } from 'mssql';

export const createFlashSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { title, startDate, endDate } = req.body;
        const created_by = req.user!.id;
        const dbBranch = req.dbBranch;
        const branch_code = req.user?.branch_code;
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        const flashSale: FlashSale = { title, start_date: startDate, end_date: endDate, created_by };
        const flash_sale_id = await FlashSaleService.createFlashSale(flashSale, dbBranch);
        return res.status(201).json({
            success: true,
            message: 'Flash sale created successfully',
            data: flash_sale_id
        })
    } catch (err) {
        next(err);
    }
}

export const addFlashSaleItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const flashSaleId = req.params.id as string;
        const { items, branch_code } = req.body;
        // console.log(req.body);
        const item: FlashSaleItem[] = items;
        console.log(item);
        let branchCode = branch_code;
        if (req.user?.branch_code !== 'CT') {
            branchCode = req.user?.branch_code;
        }
        const pool = getBranchPool(branchCode)
        if (!pool || !pool.connected) {
            throw new AppError(`${branchCode} is not connected`, 503);
        }
        console.log(1);
        const branchId = await getBranchIdByCode(pool, branchCode);
        if (!branchId) {
            throw new AppError("branch_id not found", 404);
        }
        console.log(2);
        const flash_sale_item_id = await FlashSaleService.addItemToFlashSale(branchId, flashSaleId, item, pool);
        console.log(3);
        return res.status(201).json({
            success: true,
            message: 'Flash sale item added successfully',
            data: flash_sale_item_id
        })
    } catch (err) {
        console.log(err);
        next(err);
    }
}
export const sortDeleteItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const dbBranch = req.dbBranch;
        const idItem = req.params.item;
        const branch_code = req.user?.branch_code;
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        const flash_Sale = await FlashSaleService.sortDeleteItem(dbBranch, idItem)
        return res.status(200).json({
            success: true,
            message: 'Remove item by id successfully'
        })
    } catch (error) {
        next(error)
    }
}

const ALL_BRANCHES = ['HN', 'DN', 'HCM', 'CT'];
// const ALL_BRANCHES = ['CT', 'DN',];

export const changeStatus = async (req: Request, res: Response, next: NextFunction) => {
    const activeTransactions: mssql.Transaction[] = [];

    try {
        const flash_sale_id = req.params.id;

        for (const bn of ALL_BRANCHES) {
            const pool = getBranchPool(bn);
            
            if (!pool || !pool.connected) {
                console.warn(`Skipping branch ${bn}: Disconnected or Pool not found.`);
                continue;
            }

            const branchId = await getBranchIdByCode(pool, bn);
            if (!branchId) {
                throw new AppError(`Branch ID not found for ${bn}`, 500);
            }

            const transaction = new mssql.Transaction(pool);
            
            await transaction.begin();
            activeTransactions.push(transaction);
            await FlashSaleService.updateFlashSaleStatusWithTransaction(transaction, flash_sale_id, branchId);
        }
        await Promise.all(activeTransactions.map(tr => tr.commit()));

        return res.status(200).json({
            success: true,
            message: 'Change Status successfully updated across all branches.'
        });

    } catch (error) {
       
        console.error("Error occurred, rolling back all branches:", error);
        await Promise.all(activeTransactions.map(tr => tr.rollback()));

        next(error);
    }
}


export const sortDeleteFlashSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const dbBranch = req.dbBranch;
        const idFlashSale = req.params.flashSale;
        const branch_code = req.user?.branch_code;
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        const flash_Sale = await FlashSaleService.sortDeleteFlashSale(dbBranch, idFlashSale)
        return res.status(200).json({
            success: true,
            message: 'Remove item by id successfully'
        })
    } catch (error) {
        next(error)
    }
}
export const getFlashSaleActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const dbBranch = req.dbBranch;
        const branch_code = req.user?.branch_code;
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        const flash_Sale = await FlashSaleService.getFlashSaleActive(dbBranch)
        return res.status(200).json({
            success: true,
            message: 'Get flash sale active successfully',
            flash_sale: flash_Sale
        })
    } catch (error) {
        next(error);
    }
}
export const getFlashSaleHotDeal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const excludeIdsParam = req.query.excludeIds as string;

        // const excludeIds: string[] = excludeIdsParam

        const dbBranch = req.dbBranch;
        const branch_code = req.user?.branch_code;
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        // const branch_id = req./
        
        const { flash_sale, products } = await FlashSaleService.getFlashSaleHotDeal(excludeIdsParam, dbBranch, req.user?.branch_id!, req.user?.role!);

        return res.status(200).json({
            success: true,
            message: 'Get flash sale by id successfully',
            flash_sale,
            products
        })
    } catch (err) {
        next(err)
    }
}
export const getFlashSaleHotDealPublic = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const excludeIdsParam = req.query.excludeIds as string;

        // const excludeIds: string[] = excludeIdsParam

        const branch_code = 'DN';
        const dbBranch = getBranchPool(branch_code);
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        // const branch_id = req./

        const { flash_sale, products } = await FlashSaleService.getFlashSaleHotDeal(excludeIdsParam, dbBranch, '73F306BD-316A-462F-B646-6DF61FE5CAA0', 'customer');

        return res.status(200).json({
            success: true,
            message: 'Get flash sale by id successfully',
            flash_sale,
            products
        })
    } catch (err) {
        next(err)
    }
}

export const getFlashSaleHome = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const dbBranch = req.dbBranch;
        const branch_code = req.user?.branch_code;
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        const { flash_sale, products } = await FlashSaleService.getFlashSaleHome(dbBranch, req.user?.branch_id!, req.user?.role!);
        return res.status(200).json({
            success: true,
            message: 'Get flash sale by id successfully',
            flash_sale,
            products
        })
    } catch (err) {
        next(err);
    }
}
export const getFlashSaleHomePublic = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const branch_code = 'DN';
        const dbBranch = getBranchPool(branch_code);
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        const { flash_sale, products } = await FlashSaleService.getFlashSaleHome(dbBranch, '73F306BD-316A-462F-B646-6DF61FE5CAA0','customer');
        return res.status(200).json({
            success: true,
            message: 'Get flash sale by id successfully',
            flash_sale,
            products
        })
    } catch (err) {
        next(err);
    }
}
const productHasPrice = (product: any): boolean => {

    return product.colors?.some((color: any) =>
        color.sizes?.some((size: any) =>
            typeof size.price === 'number'
        )
    );
};

export const getProductActiveByFlashSaleId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const dbBranch = req.dbBranch;
        const branch_code = req.user?.branch_code;
        const id = req.params.flash_id;
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        let products = await FlashSaleService.getProductsActive(id, dbBranch, req.user?.branch_id!, req.user?.role!);
        products = products.filter(productHasPrice);
        return res.status(200).json({
            success: true,
            message: 'Get product sale by id successfully',
            data: products
        })
    } catch (err) {
        next(err);
    }
}
export const getProductActiveByFlashSaleIdBranch = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const branch_code = req.query.branch_code as string;
        const pool = getBranchPool(branch_code)
        if (!pool || !pool.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        const branch_id = await getBranchIdByCode(pool, branch_code);
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        const id = req.params.flash_id;
        let products = await FlashSaleService.getProductsActive(id, pool, branch_id, req.user?.role!);
        products = products.filter(productHasPrice);
        return res.status(200).json({
            success: true,
            message: 'Get product sale by id successfully',
            data: products
        })
    } catch (err) {
        next(err);
    }
}

export const getProductNotInFlashSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const branch_code = req.query.branch_code as string;
        const pool = getBranchPool(branch_code)
        if (!pool || !pool.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        const branch_id = await getBranchIdByCode(pool, branch_code);
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        let products = await FlashSaleService.getProductsNotSale(pool, branch_id);
        products = products.filter(productHasPrice);
        return res.status(200).json({
            success: true,
            message: 'Get product Not sale by id successfully',
            products
        })
    } catch (err) {
        next(err);
    }
}
