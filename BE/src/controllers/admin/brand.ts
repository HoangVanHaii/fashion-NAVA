import { Request, Response, NextFunction } from "express";
import * as brandService from "../../services/brand";
import { AppError } from "../../utils/appError";


export const createBrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const { name, description } = req.body;
        if (!req.file) {
            throw new AppError("Logo is required", 400);
        }
        const logo = req.file;
        const brand = await brandService.addBrand(req.dbBranch, {name, description, logo});
        res.status(201).json({
            success: true,
            message: "Brand created successfully",
            brand
        });
    } catch (error) {
        next(error);
    }
};


export const updateBrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const brandData = { brand_id: req.params.id, ...req.body };
        await brandService.updateBrand(req.dbBranch, brandData);

        res.json({
            success: true,
            message: "Brand updated successfully"
        });
    } catch (error) {
        next(error);
    }
};


export const changeLogoBrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        if (!req.file) {
            throw new AppError("Logo is required", 400);
        }
        const brand_id = req.params.id;
        const logo = req.file;
        const logoUrl = await brandService.changeLogo(req.dbBranch, brand_id, logo);
        res.json({
            success: true,
            message: "Brand updated successfully",
            logoUrl
        });
    } catch (error) {
        next(error);
    }
};


export const deleteBrand = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const brandId = req.params.id;
        await brandService.deleteBrand(req.dbBranch, brandId);

        res.json({
            success: true,
            message: "Brand deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};
