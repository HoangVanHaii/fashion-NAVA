import { Request, Response, NextFunction } from "express";
import * as brandService from "../services/brand";
import { AppError } from "../utils/appError";

export const getAllBrands = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const brands = await brandService.getAllBrands(req.user?.role || 'customer');
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
        const brandId = req.params.id;
        const brand = await brandService.getBrandById(brandId, req.user?.role || 'customer');

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
        const brands = await brandService.getAllBrands("customer");
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
        const brandId = req.params.id;
        const brand = await brandService.getBrandById(brandId, "customer");

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

export const getBrandRating = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const brandId = req.params.id;

        const ratingData = await brandService.getBrandAverageRating(brandId);

        return res.status(200).json({
            success: true,
            data: ratingData,
            message: `Brand rating for ID ${brandId} retrieved successfully`
        });
    } catch (err) {
        next(err);
    }
};

export const getBrandRatingForGuest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const brandId = req.params.id;

        const ratingData = await brandService.getBrandAverageRating(brandId);

        return res.status(200).json({
            success: true,
            data: ratingData,
            message: `Brand rating for ID ${brandId} retrieved successfully`
        });
    } catch (err) {
        next(err);
    }
};