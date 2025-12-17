
import { Request, Response, NextFunction } from "express";
import * as brandService from "../services/brand";
import { getBranchPool } from "../config/database";
import { AppError } from "../utils/appError";

export const getAllBrands = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const brands = await brandService.getAllBrands(req.dbBranch, req.user?.role || 'customer');
        res.json({
            success: true,
            message: "Get all brands successfully",
            brands
        });
    } catch (error) {
        next(error);
    }
};

export const getBrandById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const brandId = req.params.id;
        const brand = await brandService.getBrandById(req.dbBranch, brandId, req.user?.role || 'customer');

        if (!brand) throw new AppError("Brand not found", 404);

        res.json({
            success: true,
            message: "Get brand successfully",
            data: brand
        });
    } catch (error) {
        next(error);
    }
};



export const getAllBrandsForGuest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log(1);
        const pool = getBranchPool("DN");
        if (!pool) {
            throw new AppError("DaNang DB is not connected", 503);
        }
        
        const brands = await brandService.getAllBrands(pool, "customer");
        res.json({
            success: true,
            message: "Get all brands successfully",
            brands
        });
    } catch (error) {
        next(error);
    }
};

export const getBrandByIdForGuest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pool = getBranchPool("DN");
        if (!pool) {
            throw new AppError("DaNang DB is not connected", 503);
        }
        
        const brandId = req.params.id;
        const brand = await brandService.getBrandById(pool, brandId, "customer");

        if (!brand) throw new AppError("Brand not found", 404);

        res.json({
            success: true,
            message: "Get brand successfully",
            brand
        });

    } catch (error) {
        next(error);
    }
};
export const getBrandRating = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const brandId = req.params.id;
        const code = 'DN'

        const dbBranch = getBranchPool(code);

        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`Database connection failed`, 503);
        }

        const ratingData = await brandService.getBrandAverageRating(brandId, dbBranch);

        return res.status(200).json({
            success: true,
            data: ratingData,
            message: `Brand rating for ID ${brandId} retrieved successfully`
        });
    }
    catch (err) {
        next(err);
    }
};
export const getBrandRatingForGuest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const brandId = req.params.id;
        const dbBranch = getBranchPool('DN');
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`Database connection failed`, 503);
        }

        const ratingData = await brandService.getBrandAverageRating(brandId, dbBranch);

        return res.status(200).json({
            success: true,
            data: ratingData,
            message: `Brand rating for ID ${brandId} retrieved successfully`
        });
    }
    catch (err) {
        next(err);
    }
};