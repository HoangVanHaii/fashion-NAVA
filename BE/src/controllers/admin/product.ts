import { Response, Request, NextFunction } from "express";
import * as productService from '../../services/product';
import * as IProducts from '../../interfaces/product';
import mongoose from "mongoose";
import { AppError } from "../../utils/appError";
import { mysqlPool } from "../../config/database";

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await mysqlPool.getConnection();
    const idProductMongo = new mongoose.Types.ObjectId();
    let uploadProducts: IProducts.IProductColorPayload[] = [];
    let uploadedVideoUrl: string = "";

    try {
        await connection.beginTransaction();

        const { category_id, brand_id, name, description, colors, attributes, video } = req.body;
        const videoFile = video as Express.Multer.File | undefined;

        const productSql: Omit<IProducts.IProductSQL, 'id'> = {
            category_id: category_id,
            brand_id: brand_id,
            name: name,
            mongodb_id: idProductMongo.toString(),
            status: 'active'
        };

        const idProductSqlNum = await productService.insertProductSql(connection, productSql);
        const idProductSql = Number(idProductSqlNum);

        const listProductInventory: IProducts.IProductInventorySQL[] = buildListInventory(idProductSql, colors);
        await productService.insertProductInventory(connection, listProductInventory);

        uploadProducts = await productService.uploadImageProducts(colors, idProductSql);

        if (typeof videoFile !== 'undefined') {
            uploadedVideoUrl = await productService.uploadSingleVideo(videoFile);
        }

        const productMongo: IProducts.IProductMongo = buildProductMongo(idProductMongo, idProductSql, description, attributes, uploadProducts, uploadedVideoUrl);
        await productService.insertProductMongo(productMongo);

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: "Product created successfully"
        });
    } catch (err) {
        console.log(err);
        await connection.rollback();

        await productService.deleteProductMongo(idProductMongo.toString());
        if (uploadProducts.length > 0) {
            await productService.deleteImagesFromColors(uploadProducts);
        }
        if (uploadedVideoUrl) {
            await productService.deleteVideo(uploadedVideoUrl);
        }

        next(err);
    } finally {
        connection.release();
    }
};

export const getTopProductsBestSellerForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const topCount = parseInt(req.query.top as string) || 20;

        const products = await productService.getTopProductsBestsellerForAdminService(topCount);

        return res.status(200).json({
            success: true,
            message: `Get best seller products for admin successfully`,
            data: products
        });

    } catch (err) {
        next(err);
    }
};

export const AddProductColor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const product_id_sql = Number(req.params.id);

        await productService.AddColorProduct(product_id_sql, req.body);

        return res.status(201).json({
            success: true,
            message: "Add Product Color successfully"
        });

    } catch (err) {
        next(err);
    }
};

export const changeStatusProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const product_id_sql = Number(req.params.id);
        const { status } = req.body;

        await productService.changeStatusProduct(product_id_sql, status);

        return res.status(200).json({
            success: true,
            message: "Product status updated successfully"
        });

    } catch (err) {
        next(err);
    }
};

export const updateProductInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const product_id_sql = Number(req.params.id);
        const product: IProducts.UpdateProductInfo = {
            product_id_sql,
            name: req.body.name,
            description: req.body.description,
            brand_id: req.body.brand_id,
            category_id: req.body.category_id,
            attributes: req.body.attributes,
        };

        const updatedProduct = await productService.updateProductInfo(product);

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
        // Bỏ branchId
        const updatedProduct = await productService.updateProductColorSize(req.body);

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
        const productId = req.body.product_id_sql;
        const files = req.files as Express.Multer.File[];
        const videoFile = files.find(f => f.fieldname === 'video');

        if (!productId) {
            throw new AppError("productId is required", 400);
        }

        const updatedProduct = await productService.updateProductVideo(productId, videoFile || "");

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
        // Bỏ branchId
        await productService.deleteColor(req.body.product_id_sql, req.body.color_id_mongo);

        res.status(200).json({
            success: true,
            message: "Delete product color successfully",
        });

    } catch (err) {
        next(err);
    }
};

export const deleteProductInventory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Đã đổi tên hàm và xóa logic branch
        await productService.deleteProductInventory(req.body.product_inventory);

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
        if (req.user?.role !== 'admin') {
            throw new AppError("You do not have permission to perform this action", 403);
        }

        await productService.updateProductStatusALL(req.body.status);

        res.status(200).json({
            success: true,
            message: "Update all product statuses successfully",
        });

    } catch (err) {
        next(err);
    }
};

export const updateProductStockALL = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Bỏ branchId
        await productService.updateStockAll(req.body.stock);

        res.status(200).json({
            success: true,
            message: "Update all product stock successfully",
        });

    } catch (err) {
        next(err);
    }
};

// Hàm builder hỗ trợ nội bộ
const buildListInventory = (productId: number, colors: IProducts.IProductColorPayload[]) => {
    const listProductInventory: IProducts.IProductInventorySQL[] = []; // Đổi Interface
    for (const element of colors) {
        element._id = new mongoose.Types.ObjectId().toString();
        for (const item of element.sizes) {
            item._id = new mongoose.Types.ObjectId().toString();

            const productInventory: IProducts.IProductInventorySQL = {
                product_id: productId,
                color_id_mongo: element._id,
                size_id_mongo: item._id,
                price: item.price,
                stock: item.stock
            };
            listProductInventory.push(productInventory);
        }
    }
    return listProductInventory;
};

const buildProductMongo = (idProductMongo: mongoose.Types.ObjectId, idProductSql: number, description: string,
    attributes: any, uploadProducts: IProducts.IProductColorPayload[], videoUrl: string): IProducts.IProductMongo => {
    try {
        let productMongo: IProducts.IProductMongo = {
            _id: idProductMongo,
            product_id_sql: idProductSql,
            description: description,
            colors: uploadProducts,
        };

        if (videoUrl && videoUrl.length > 7) {
            productMongo.video = videoUrl;
        }

        if (attributes) {
            try {
                if (attributes && Object.keys(attributes).length > 0) {
                    productMongo.attributes = JSON.parse(attributes);
                }
            } catch (err) {
                // Bỏ qua lỗi parse JSON nếu format string ko hợp lệ
            }
        }

        return productMongo;
    } catch (err) {
        console.log(err);
        throw err;
    }
};