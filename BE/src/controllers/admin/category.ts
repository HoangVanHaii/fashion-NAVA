import { Request, Response, NextFunction } from "express";
import * as categoryService from "../../services/category";
import { Category } from "../../interfaces/category";
import { AppError } from "../../utils/appError";

export const addCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { category_name, description, status, gender } = req.body;
        const newCategory = {
            category_name,
            description,
            status,
            gender
        } as Category;

        await categoryService.addCategory(newCategory);

        res.status(201).json({
            success: true,
            message: "Category added successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categoryId = Number(req.params.id);
        const existingCategory = await categoryService.getCategoryById(categoryId);

        if (!existingCategory) {
            throw new AppError("Category not found", 404);
        }

        const { category_name, description, status, gender } = req.body;

        const updatedCategory = {
            category_id: categoryId,
            category_name,
            description,
            status,
            gender
        } as Category;

        await categoryService.updateCategory(updatedCategory);

        res.status(200).json({
            success: true,
            message: "Category updated successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categoryId = Number(req.params.id);
        const existingCategory = await categoryService.getCategoryById(categoryId);

        if (!existingCategory) {
            throw new AppError("Category not found", 404);
        }

        await categoryService.deleteCategory(categoryId);

        res.status(200).json({
            success: true,
            message: "Category deleted (set inactive) successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const getAllInactiveCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await categoryService.getAllInactiveCategories();

        res.json({
            success: true,
            message: "Get inactive categories successfully",
            categories
        });
    } catch (error) {
        next(error);
    }
};