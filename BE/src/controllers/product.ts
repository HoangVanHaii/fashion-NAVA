import { Response, Request, NextFunction } from "express";
import * as productService from '../services/product';
import { AppError } from "../utils/appError";
import { getBranchPool } from "../config/database";
const productHasPrice = (product: any): boolean => {

    return product.colors?.some((color: any) =>
        color.sizes?.some((size: any) =>
            typeof size.price === 'number'
        )
    );
};

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const branch_id = await productService.getBranchIdByCode(req.dbBranch!, req.user?.branch_code || 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        let products = await productService.getAllProducts(req.dbBranch!, branch_id, req.user?.role || "customer");
        if (req.user?.role !== 'admin' ) {
            products = products.filter(productHasPrice);
        }
        return res.status(200).json({
            success: true,
            message: "Get all products successfully",
            products
        });
        
    } catch (err) {
        next(err);
    }
}

export const getAllProductsByGender = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const gender = req.query.gender as string;
        const branch_id = await productService.getBranchIdByCode(req.dbBranch!, req.user?.branch_code || 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        const products = await productService.getAllProductsByGender(req.dbBranch!, branch_id, gender);
        return res.status(200).json({
            success: true,
            message: "Get all products By gender successfully",
            products
        });
        
    } catch (err) {
        next(err);
    }
}
export const getAllProductsByCategoryId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const category_id = req.params.category_id;
        const branch_id = await productService.getBranchIdByCode(req.dbBranch!, req.user?.branch_code || 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        const products = await productService.getAllProductsByCategory(req.dbBranch!, branch_id, req.user?.role || "customer", category_id);
        return res.status(200).json({
            success: true,
            message: "Get all products By category_id successfully",
            products
        });
        
    } catch (err) {
        next(err);
    }
}

export const getAllProductsByBrandId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const brand_id = req.params.brand_id;
        const branch_id = await productService.getBranchIdByCode(req.dbBranch!, req.user?.branch_code || 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        const products = await productService.getAllProductsByBrand(req.dbBranch!, branch_id, req.user?.role || "customer", brand_id);
        return res.status(200).json({
            success: true,
            message: "Get all products By brand_id successfully",
            products
        });
        
    } catch (err) {
        next(err);
    }
}

export const getProductDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {      
        const product_id_sql = req.params.id;
        const branch_id = await productService.getBranchIdByCode(req.dbBranch!, req.user?.branch_code || 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        const product = await productService.getProductDetail(req.dbBranch!, product_id_sql, branch_id, req.user?.role || "customedr")
        
        return res.status(200).json({
            success: true,
            message: `Get product detail successfully`,
            product
        })
        
    } catch (err) {
        next(err);
    }
}

export const getTopProductsNew = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const topCount = parseInt(req.query.top as string) || 20;

        const branch_id = await productService.getBranchIdByCode(req.dbBranch!, 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        let products = await productService.getTopProductsNews(req.dbBranch, branch_id, topCount);
        if (req.user?.role === 'admin' ) {
            products = products.filter(productHasPrice);
        }
        return res.status(200).json({
            success: true,
            message: "Get all products New for guest successfully",
            products
        });
        
    } catch (err) {
        next(err);
    }
}
export const getTopProductsBestSeller = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const topCount = parseInt(req.query.top as string) || 20;
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const branch_id = await productService.getBranchIdByCode(req.dbBranch, 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        let products = await productService.getTopProductsBestseller(req.dbBranch, branch_id, topCount);
        if (req.user?.role === 'admin' ) {
            products = products.filter(productHasPrice);
        }
        
        return res.status(200).json({
            success: true,
            message: "Get all products best seller for guest successfully",
            products
        });
        
    } catch (err) {
        next(err);
    }
}




///////////////////////////////

export const getAllProductsByGenderForGuest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pool = getBranchPool("DN");
        if (!pool) {
            throw new AppError("DaNang DB is not connected", 503);
        }
        const gender = req.query.gender as string;
        const branch_id = await productService.getBranchIdByCode(pool, req.user?.branch_code || 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        const products = await productService.getAllProductsByGender(pool, branch_id, gender);
        return res.status(200).json({
            success: true,
            message: "Get all products By gender successfully",
            products
        });
        
    } catch (err) {
        next(err);
    }
}

export const getAllProductsByCategoryIdForGuests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pool = getBranchPool("DN");
        if (!pool) {
            throw new AppError("DaNang DB is not connected", 503);
        }
        const branch_id = await productService.getBranchIdByCode(pool, 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        const category_id = req.params.category_id;
        const products = await productService.getAllProductsByCategory(pool, branch_id, "customer", category_id);
        return res.status(200).json({
            success: true,
            message: "Get all products by categoryId successfully For Guests ",
            products
        });
        
    } catch (err) {
        next(err);
    }
}

export const getAllProductsByBrandIdForGuests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pool = getBranchPool("DN");
        if (!pool) {
            throw new AppError("DaNang DB is not connected", 503);
        }
        const branch_id = await productService.getBranchIdByCode(pool, 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        const brand_id = req.params.brand_id;
        const products = await productService.getAllProductsByBrand(pool, branch_id, "customer", brand_id);
        return res.status(200).json({
            success: true,
            message: "Get all products by brandId successfully For Guests ",
            products
        });
        
    } catch (err) {
        next(err);
    }
}


export const getAllProductsForGuests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pool = getBranchPool("DN");
        if (!pool) {
            throw new AppError("DaNang DB is not connected", 503);
        }
        const branch_id = await productService.getBranchIdByCode(pool, 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        const products = await productService.getAllProducts(pool, branch_id, "customer");
        return res.status(200).json({
            success: true,
            message: "Get all products for guest successfully",
            products
        });
        
    } catch (err) {
        next(err);
    }
}

export const getTopProductsNewForGuests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const topCount = parseInt(req.query.top as string) || 20;
        const pool = getBranchPool("DN");
        if (!pool) {
            throw new AppError("DaNang DB is not connected", 503);
        }
        const branch_id = await productService.getBranchIdByCode(pool, 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        const products = await productService.getTopProductsNews(pool, branch_id, topCount);
        return res.status(200).json({
            success: true,
            message: "Get all products New for guest successfully",
            products
        });
        
    } catch (err) {
        next(err);
    }
}
export const getTopProductsBestSellerForGuests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const topCount = parseInt(req.query.top as string) || 20;
        const pool = getBranchPool("DN");
        if (!pool) {
            throw new AppError("DaNang DB is not connected", 503);
        }
        const branch_id = await productService.getBranchIdByCode(pool, 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        const products = await productService.getTopProductsBestseller(pool, branch_id, topCount);
        return res.status(200).json({
            success: true,
            message: "Get all products best seller for guest successfully",
            products
        });
        
    } catch (err) {
        next(err);
    }
}

export const getProductDetailForGuests = async (req: Request, res: Response, next: NextFunction) => {
    try {      
        const pool = getBranchPool("DN");
        if (!pool) {
            throw new AppError("Central DB is not connected", 503);
        }
        const branch_id = await productService.getBranchIdByCode(pool, 'DN');
        if (!branch_id) {
            throw new AppError("branch_id not found", 404);
        }
        const product_id_sql = req.params.id;
        const product = await productService.getProductDetail(pool, product_id_sql, branch_id, "customer")
        
        return res.status(200).json({
            success: true,
            message: `Get product detail for guest successfully`,
            product
        })
        
    } catch (err) {
        next(err);
    }
}

