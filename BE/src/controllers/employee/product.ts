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
    const idProductMongo = new mongoose.Types.ObjectId().toString();
    const idProductSql = UUID();
    let uploadProducts: IProducts.IProductColorPayload[] = [];

    try {
        if (!req.dbBranch! || !req.dbBranch!.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        const { category_id, brand_id, name, description, colors, attributes } = req.body;
        const productSql: IProducts.IProductSQL = {
            id: idProductSql,
            category_id: "DD033F36-18DA-4937-9CF0-2CF9AC3381FC", // category_id,
            brand_id: "3704D1D6-0EA3-495F-AF06-082F115B89AD",  // brand_id,
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
        uploadProducts = await productService.uploadImageProducts(colors);

        const productMongo: IProducts.IProductMongo = buildProductMongo(idProductMongo, idProductSql, description, attributes, uploadProducts);
        await productService.insertProductMongo(productMongo);

        await transaction.commit();
        return res.status(201).json({
            success: true,
            message: "Product created successfully"
        })
    } catch (err) {
        await productService.deleteProductMongo(idProductMongo);
        await productService.deleteImagesFromColors(uploadProducts);
        await transaction.rollback();
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
        console.log(err);
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
                id: UUID(),
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

const buildProductMongo = (idProductMongo: string, idProductSql: string, description: string,
    attributes: any, uploadProducts: IProducts.IProductColorPayload[]): IProducts.IProductMongo => {
    try {
        const productMongo: IProducts.IProductMongo = {
            _id: idProductMongo,
            product_id_sql: idProductSql,
            description: description,
            colors: uploadProducts,
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
