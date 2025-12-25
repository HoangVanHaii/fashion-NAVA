import { Response, Request, NextFunction } from "express";
import * as productService from '../../services/product';
import * as IProducts from '../../interfaces/product';
import {v4 as UUID} from 'uuid'
import sql from 'mssql'
import mongoose from "mongoose";
import { AppError } from "../../utils/appError";

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = new sql.Transaction(req.dbBranch!);
    await transaction.begin();
    const idProductMongo = new mongoose.Types.ObjectId();
    const idProductSql = UUID();
    let uploadProducts: IProducts.IProductColorPayload[] = [];
    let uploadedVideoUrl: string = "";
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const { category_id, brand_id, name, description, colors, attributes, video } = req.body;
        const videoFile = video as Express.Multer.File | undefined;
        const productSql: IProducts.IProductSQL = {
            id: idProductSql,
            category_id: category_id,
            brand_id: brand_id,
            name: name,
            mongodb_id: idProductMongo,
            status: 'active'
        }
        await productService.insertProductSql(transaction, productSql);

        const branchId = await productService.getBranchIdByCode(req.dbBranch!, req.user?.branch_code || "");
        if (!branchId) {
            throw new AppError("branch_id not found", 404);
        }
        const listBranchInventory: IProducts.IBranchInventorySQL[] = buildListInventory(idProductSql, colors, branchId);
        await productService.insertBranchInventory(transaction, listBranchInventory);
        uploadProducts = await productService.uploadImageProducts(colors, idProductSql);
        if (typeof videoFile !== 'undefined') {
            uploadedVideoUrl = await productService.uploadSingleVideo(videoFile);
        }
        const productMongo: IProducts.IProductMongo = buildProductMongo(idProductMongo, idProductSql, description, attributes, uploadProducts, uploadedVideoUrl);
        await productService.insertProductMongo(productMongo);

        await transaction.commit();
        return res.status(201).json({
            success: true,
            message: "Product created successfully"
        })
    } catch (err) {
        await productService.deleteProductMongo(idProductMongo.toString());
        await productService.deleteImagesFromColors(uploadProducts);
        if (uploadedVideoUrl) {
            await productService.deleteVideo(uploadedVideoUrl);
        }
        await transaction.rollback();
        next(err);
    }
}
export const getTopProductsBestSellerForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const topCount = parseInt(req.query.top as string) || 20;

        const target_branch_code = (req.query.branch as string) || req.user?.branch_code;

        if (!target_branch_code) {
            throw new AppError("Branch code is required", 400);
        }
        let products;
        if (req.user?.branch_code !== "CT") {
            products = await productService.getTopProductsBestsellerForAdminService(req.user?.branch_code ||'DN', topCount);
        }
        else {
            products = await productService.getTopProductsBestsellerForAdminService(target_branch_code, topCount);
        }
        return res.status(200).json({
            success: true,
            message: `Get best seller products for admin (${target_branch_code}) successfully`,
            data: products
        });

    } catch (err) {
        next(err);
    }
}

export const AddProductColor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const product_id_sql = req.params.id;
        const branchId = await productService.getBranchIdByCode(req.dbBranch!, req.user?.branch_code || "");
        if (!branchId) {
            throw new AppError("branch_id not found", 404);
        }
        await productService.AddColorProduct(req.dbBranch!, branchId, product_id_sql, req.body);

        return res.status(201).json({
            success: true,
            message: "Product Color successfully"
        })
        
    } catch (err) {
        next(err);
    }
}

export const changeStatusProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const product_id_sql = req.params.id;
        const { status } = req.body;
        await productService.changeStatusProduct(req.dbBranch!, product_id_sql, status);

        return res.status(201).json({
            success: true,
            message: "Product updated successfully"
        })
        
    } catch (err) {
        next(err);
    }
}

export const updateProductInfo = async (req: Request, res: Response, next: NextFunction) => {

    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        
        const product_id_sql = req.params.id;    
        const product: IProducts.UpdateProductInfo = {
            product_id_sql,
            name: req.body.name,
            description: req.body.description,
            brand_id: req.body.brand_id,
            category_id: req.body.category_id,
            attributes: req.body.attributes,
        };      

        const updatedProduct = await productService.updateProductInfo(req.dbBranch, product);

        res.status(200).json({
            success: true,
            message: "Updated productInfo successfully",
            updatedProduct
        });
  
    } catch (err) {
        console.log(err);
        next(err);
    }
};

export const updateProductColor = async (req: Request, res: Response, next: NextFunction) => {

    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const branchId = await productService.getBranchIdByCode(req.dbBranch!, req.user?.branch_code || "");
        if (!branchId) {
            throw new AppError("branch_id not found", 404);
        }
        
        const updatedProduct = await productService.updateProductColorSize(req.dbBranch, branchId, req.body);

        res.status(200).json({
            success: true,
            message: "Updated product Color Size successfully",
            data: updatedProduct
        });
  
    } catch (err) {
        next(err);
    }
};

export const updateProductVideo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const productId = req.body.product_id_sql;
        const files = req.files as Express.Multer.File[];
        const videoFile = files.find(f => f.fieldname === 'video');
        if (!productId) {
            throw new AppError("productId is required", 400);
        }
        // if (!videoFile) {
        //     throw new AppError("video is required", 400);
        // }
        const updatedProduct = await productService.updateProductVideo(productId, videoFile || "")
        res.status(200).json({
            success: true,
            message: "Updated product video successfully",
            data: updatedProduct
        });
  
    } catch (err) {
        next(err);
    }
};


export const deleteProductColor = async (req: Request, res: Response, next: NextFunction) => {

    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        
        const branchId = await productService.getBranchIdByCode(req.dbBranch!, req.user?.branch_code || "");
        if (!branchId) {
            throw new AppError("branch_id not found", 404);
        }
        await productService.deleteColor(req.dbBranch, branchId, req.body.product_id_sql, req.body.color_id_mongo);
        res.status(200).json({
            success: true,
            message: "Delete product color successfully",
        });
  
    } catch (err) {
        next(err);
    }
};

export const deleteBranchInnventory = async (req: Request, res: Response, next: NextFunction) => {

    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        
        const branchId = await productService.getBranchIdByCode(req.dbBranch!, req.user?.branch_code || "");
        if (!branchId) {
            throw new AppError("branch_id not found", 404);
        }
        await productService.deleteBranchInnventory(req.dbBranch, branchId, req.body.branch_inventory);
        console.log(1);
        res.status(200).json({
            success: true,
            message: "Delete product Inventory successfully",
        });
  
    } catch (err) {
        next(err);
    }
};

export const updateProductStatusALL = async (req: Request, res: Response, next: NextFunction) => {

    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        if (req.user?.branch_code !== 'CT' && req.user?.role !== 'admin') {
            throw new AppError("You do not have permission to perform this action", 403);  
        }
        await productService.updateProductStatusALL(req.dbBranch, req.body.status);
        res.status(200).json({
            success: true,
            message: "Update product status successfully",
        });
  
    } catch (err) {
        next(err);
    }
};
export const updateProductStockALL = async (req: Request, res: Response, next: NextFunction) => {

    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const branchId = await productService.getBranchIdByCode(req.dbBranch!, req.user?.branch_code || "");
        if (!branchId) {
            throw new AppError("branch_id not found", 404);
        }
        await productService.updateStockAll(req.dbBranch, branchId, req.body.stock);
        res.status(200).json({
            success: true,
            message: "Update product stock successfully",
        });
  
    } catch (err) {
        next(err);
    }
};


const buildListInventory = (productId: string, colors: IProducts.IProductColorPayload[], branchId: string) => {
    const listBranchInventory: IProducts.IBranchInventorySQL[] = []
    for (const element of colors) {
        element._id = new mongoose.Types.ObjectId().toString();
        for (const item of element.sizes) {
            item._id = new mongoose.Types.ObjectId().toString();
            const branchInventory: IProducts.IBranchInventorySQL = {
                branch_id: branchId,
                product_id: productId,
                color_id_mongo: element._id,
                size_id_mongo: item._id,
                price: item.price,
                stock: item.stock
            };
            listBranchInventory.push(branchInventory);
        }
    }
    return listBranchInventory;    
}

const buildProductMongo = (idProductMongo: mongoose.Types.ObjectId, idProductSql: string, description: string,
    attributes: any, uploadProducts: IProducts.IProductColorPayload[], videoUrl: string): IProducts.IProductMongo => {
    try {
        let productMongo: IProducts.IProductMongo = {
            _id: idProductMongo,
            product_id_sql: idProductSql,
            description: description,
            colors: uploadProducts,
            // video: videoUrl
        }        
        if (videoUrl.length > 7) {
            productMongo.video = videoUrl;
        }
        if (attributes) {
            try {
                if (attributes && Object.keys(attributes).length > 0) {
                    productMongo.attributes = JSON.parse(attributes);
                }
            } catch (err) {
            }
        }
        return productMongo;
    } catch (err) {
        console.log(err);
        throw (err);
    }
    
}
