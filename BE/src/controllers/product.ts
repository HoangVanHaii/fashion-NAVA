import { Response, Request, NextFunction } from "express";
import * as productService from '../services/product';
import { AppError } from "../utils/appError";

const DEFAULT_PRICE = 100000;

const productHasPrice = (product: any): number => {
    for (const color of product.colors || []) {
        for (const size of color.sizes || []) {
            if (typeof size.price === 'number') {
                return size.price;
            }
        }
    }

    return DEFAULT_PRICE;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = req.user?.role || "customer";
        let products = await productService.getAllProducts(role);
        console.log("Products fetched for role", role, ":", products);
        // if (role === 'customer') products = products.filter(productHasPrice);

        return res.status(200).json({
            success: true,
            message: "Get all products successfully",
            products
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY GENDER
// ─────────────────────────────────────────────────────────────────────────────

export const getAllProductsByGender = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const gender = req.query.gender as string;
        if (!gender) throw new AppError("gender query param is required", 400);

        let products = await productService.getAllProductsByGender(gender);
        products = products.filter(productHasPrice);

        return res.status(200).json({
            success: true,
            message: "Get all products by gender successfully",
            products
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY CATEGORY
// ─────────────────────────────────────────────────────────────────────────────

export const getAllProductsByCategoryId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const category_id = parseInt(req.params.category_id);
        if (!category_id) throw new AppError("category_id is required", 400);

        const role = req.user?.role || "customer";
        let products = await productService.getAllProductsByCategory(role, category_id);

        if (role === 'customer') products = products.filter(productHasPrice);

        return res.status(200).json({
            success: true,
            message: "Get all products by category_id successfully",
            products
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY BRAND
// ─────────────────────────────────────────────────────────────────────────────

export const getAllProductsByBrandId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const brand_id = parseInt(req.params.brand_id);
        if (!brand_id) throw new AppError("brand_id is required", 400);

        const role = req.user?.role || "customer";
        let products = await productService.getAllProductsByBrand(role, brand_id);

        if (role === 'customer') products = products.filter(productHasPrice);

        return res.status(200).json({
            success: true,
            message: "Get all products by brand_id successfully",
            data: products
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PRODUCT DETAIL
// ─────────────────────────────────────────────────────────────────────────────

export const getProductDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const product_id_sql = parseInt(req.params.id);
        if (!product_id_sql) throw new AppError("product id is required", 400);

        const role = req.user?.role || "customer";
        const product = await productService.getProductDetail(product_id_sql, role);

        return res.status(200).json({
            success: true,
            message: "Get product detail successfully",
            data: product
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET BY SIZE
// ─────────────────────────────────────────────────────────────────────────────

export const getProductBySize = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const size_id = req.params.size_id;
        if (!size_id) throw new AppError("size_id is required", 400);

        const role = req.user?.role || "customer";
        const product = await productService.getProductBySize(role, size_id);

        return res.status(200).json({
            success: true,
            message: "Get product by size successfully",
            product
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// TOP NEW
// ─────────────────────────────────────────────────────────────────────────────

export const getTopProductsNew = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const topCount = parseInt(req.query.top as string) || 20;
        let products = await productService.getTopProductsNews(topCount);
        products = products.filter(productHasPrice);

        return res.status(200).json({
            success: true,
            message: "Get top new products successfully",
            products
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// TOP BESTSELLER
// ─────────────────────────────────────────────────────────────────────────────

export const getTopProductsBestSeller = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const topCount = parseInt(req.query.top as string) || 20;
        let products = await productService.getTopProductsBestseller(topCount);
        products = products.filter(productHasPrice);

        return res.status(200).json({
            success: true,
            message: "Get top best seller products successfully",
            products
        });
    } catch (err) {
        next(err);
    }
};