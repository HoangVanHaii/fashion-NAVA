import { Request, Response, NextFunction } from "express";
import * as categoryService from "../services/category";
import { AppError } from "../utils/appError";
import { getBranchPool } from "../config/database";

export const getAllActiveCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch || !req.dbBranch.connected) {
            throw new AppError(`${ req.user?.branch_code } is not connected`, 503);
        }
        const categories = await categoryService.getAllActiveCategories(req.dbBranch);
        res.json({
            success: true,
            message: "Get active categories successfully",
            categories
        });
    } catch (error) {
        next(error);
    }
};

export const getCategoryNameByGender = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch || !req.dbBranch.connected) {
            throw new AppError(`${ req.user?.branch_code } is not connected`, 503);
        }
        const gender = req.query.gender as string;
        if (!gender) {
            return res.status(400).json({
                success: false,
                message: "Missing gender parameter",
            });
        }
        const categoryNames = await categoryService.getCategoryNamByGender(req.dbBranch, gender);
        res.json({
            success: true,
            message: "Get category names successfully",
            categoryNames,
        });

    } catch (error) {
        next(error);
    }
};

export const getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch || !req.dbBranch.connected) {
            throw new AppError(`${ req.user?.branch_code } is not connected`, 503);
        }
        
        const categoryId = req.params.id;
        const category = await categoryService.getCategoryById(req.dbBranch, categoryId);

        if (!category) {
            throw new AppError("Category not found", 404);
        }

        res.json({
            success: true,
            message: "Get category successfully",
            category
        });
    } catch (error) {
        next(error);
    }
};

///



export const getAllActiveCategoriesForGuest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pool = getBranchPool("DN");
        if (!pool) {
            throw new AppError("DaNang DB is not connected", 503);
        }
        const categories = await categoryService.getAllActiveCategories(pool);
        res.json({
            success: true,
            message: "Get active categories successfully",
            categories
        });
    } catch (error) {
        next(error);
    }
};

export const getCategoryNameByGenderForGuest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pool = getBranchPool("DN");
        if (!pool) {
            throw new AppError("DaNang DB is not connected", 503);
        }
        const gender = req.query.gender as string;
        if (!gender) {
            return res.status(400).json({
                success: false,
                message: "Missing gender parameter",
            });
        }
        const categoryNames = await categoryService.getCategoryNamByGender(pool, gender);
        res.json({
            success: true,
            message: "Get category names successfully",
            categoryNames,
        });

    } catch (error) {
        next(error);
    }
};

export const getCategoryByIdForGuest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pool = getBranchPool("DN");
        if (!pool) {
            throw new AppError("DaNang DB is not connected", 503);
        }
        
        const categoryId = req.params.id;
        console.log(req.params);
        const category = await categoryService.getCategoryById(pool, categoryId);

        if (!category) {
            throw new AppError("Category not found", 404);
        }

        res.json({
            success: true,
            message: "Get category successfully",
            category
        });
    } catch (error) {
        next(error);
    }
};