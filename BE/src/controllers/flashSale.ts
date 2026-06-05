import { FlashSale, FlashSaleItem } from "../interfaces/flashSale";
import { Request, Response, NextFunction } from "express";
import * as FlashSaleService from "../services/flashSale";
import { AppError } from "../utils/appError";
import { mysqlPool } from "../config/database"; // Đảm bảo import mysqlPool

export const createFlashSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { title, startDate, endDate } = req.body;

        if (!req.user) throw new AppError("Unauthorized", 401);
        const created_by = req.user.id;

        const flashSale: FlashSale = { title, start_date: startDate, end_date: endDate, created_by };

        const flash_sale_id = await FlashSaleService.createFlashSale(flashSale);

        return res.status(201).json({
            success: true,
            message: 'Flash sale created successfully',
            data: flash_sale_id
        });
    } catch (err) {
        next(err);
    }
};

export const addFlashSaleItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const flashSaleId = Number(req.params.id);
        const { items } = req.body;

        const item: FlashSaleItem[] = items;

        await FlashSaleService.addItemToFlashSale(flashSaleId, item);

        return res.status(201).json({
            success: true,
            message: 'Flash sale item added successfully'
        });
    } catch (err) {
        next(err);
    }
};

export const sortDeleteItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const idItem = Number(req.params.item);

        await FlashSaleService.sortDeleteItem(idItem);

        return res.status(200).json({
            success: true,
            message: 'Remove item by id successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const changeStatus = async (req: Request, res: Response, next: NextFunction) => {
    const flash_sale_id = Number(req.params.id);
    const connection = await mysqlPool.getConnection();

    try {
        await connection.beginTransaction();

        await FlashSaleService.updateFlashSaleStatusWithTransaction(connection, flash_sale_id);

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'Change Status successfully updated.'
        });

    } catch (error) {
        await connection.rollback();
        console.error("Error occurred, rolling back transaction:", error);
        next(error);
    } finally {
        connection.release();
    }
};

export const sortDeleteFlashSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const idFlashSale = Number(req.params.flashSale);

        await FlashSaleService.sortDeleteFlashSale(idFlashSale);

        return res.status(200).json({
            success: true,
            message: 'Remove flash sale successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const getFlashSaleActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const flash_Sale = await FlashSaleService.getFlashSaleActive();

        return res.status(200).json({
            success: true,
            message: 'Get flash sale active successfully',
            flash_sale: flash_Sale
        });
    } catch (error) {
        next(error);
    }
};

export const getFlashSaleHotDeal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const excludeIdsParam = req.query.excludeIds as string || '';
        const role = req.user?.role || 'customer';

        const { flash_sale, products } = await FlashSaleService.getFlashSaleHotDeal(excludeIdsParam, role);

        return res.status(200).json({
            success: true,
            message: 'Get flash sale hot deal successfully',
            flash_sale,
            products
        });
    } catch (err) {
        next(err);
    }
};

export const getFlashSaleHotDealPublic = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const excludeIdsParam = req.query.excludeIds as string || '';

        const { flash_sale, products } = await FlashSaleService.getFlashSaleHotDeal(excludeIdsParam, 'customer');

        return res.status(200).json({
            success: true,
            message: 'Get flash sale hot deal successfully',
            flash_sale,
            products
        });
    } catch (err) {
        next(err);
    }
};

export const getFlashSaleHome = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = req.user?.role || 'customer';

        const { flash_sale, products } = await FlashSaleService.getFlashSaleHome(role);

        return res.status(200).json({
            success: true,
            message: 'Get flash sale home successfully',
            flash_sale,
            products
        });
    } catch (err) {
        next(err);
    }
};

export const getFlashSaleHomePublic = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { flash_sale, products } = await FlashSaleService.getFlashSaleHome('customer');
        return res.status(200).json({
            success: true,
            message: 'Get flash sale home successfully',
            flash_sale,
            products
        });
    } catch (err) {
        next(err);
    }
};

const productHasPrice = (product: any): boolean => {
    return product.colors?.some((color: any) =>
        color.sizes?.some((size: any) =>
            typeof size.price === 'number'
        )
    );
};

export const getProductActiveByFlashSaleId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.flash_id);
        const role = req.user?.role || 'customer';

        let products = await FlashSaleService.getProductsActive(id, role);
        // console.log("products", products);
        // products = products.filter(productHasPrice);

        return res.status(200).json({
            success: true,
            message: 'Get product sale by id successfully',
            data: products
        });
    } catch (err) {
        next(err);
    }
};

export const getProductActiveByFlashSaleIdBranch = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.flash_id);
        const role = req.user?.role || 'customer';

        let products = await FlashSaleService.getProductsActive(id, role);
        // products = products.filter(productHasPrice);

        return res.status(200).json({
            success: true,
            message: 'Get product sale by id successfully',
            data: products
        });
    } catch (err) {
        next(err);
    }
};

export const getProductNotInFlashSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let products = await FlashSaleService.getProductsNotSale();
        // console.log("products not sale", products);
        // products = products.filter(productHasPrice);

        return res.status(200).json({
            success: true,
            message: 'Get product not in sale successfully',
            products
        });
    } catch (err) {
        next(err);
    }
};