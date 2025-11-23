import { Response, Request, NextFunction } from "express";
import * as productService from '../services/product';
import * as IProducts from '../interfaces/product';
import {v4 as UUID} from 'uuid'
import sql from 'mssql'
import mongoose from "mongoose";

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = new sql.Transaction(req.dbBranch!);
    await transaction.begin();
    const idProductMongo = new mongoose.Types.ObjectId().toString();

    try {
        const { category_id, brand_id, name, description, colors, attributes } = req.body;
        const productSql: IProducts.IProductSQL = {
            id: UUID(),
            category_id: "5C621CF4-E585-4453-8EA6-33307B43B9A2", // category_id,
            brand_id: "C65AF34A-9EFD-4209-96DF-684924D77FF4",  // brand_id,
            name: name,
            mongodb_id: idProductMongo,
            status: 'active'
        }
        const productId = await productService.insertProductSql(transaction, productSql);
        const branchId = await productService.getBranchIdByCode(req.dbBranch!, req.user?.branch_code || "DN");
        
        //A1F814C5-10B0-4797-B1AD-51D2DC9A7BEA
        //brands
        //6B93C4C8-9328-414E-A2C0-80B4BE62FEA3
        const listBranchInventory: IProducts.IBranchInventorySQL[] = []
        for (const element of colors) {
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
        await productService.insertBranchInventory(transaction, listBranchInventory);
        const newColors = await productService.uploadImageProducts(colors);
        const productDetailMongo: IProducts.IProductDetailMongo = {
            _id: idProductMongo,
            name: name,
            description: description,
            colors: newColors,
            attributes: JSON.parse(attributes)
        }
        await productService.insertProductMongo(productDetailMongo);
        transaction.commit();
        return res.status(200).json({
            success: true,
            message: "Product created successfully"
        })
    } catch (err) {
        await productService.deleteProductMongo(idProductMongo);
        transaction.rollback();
        next(err);
    }

}


// export const



export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {      
        // const result = await productService.getAllProducts(req.dbBranch!)
        // return res.status(200).json({
        //     success: true,
        //     message: `Successfully fetched products for branch: ${req.user?.branch_code}`,
        //     result
        // })
        
    } catch (err) {
        next(err);
    }
}