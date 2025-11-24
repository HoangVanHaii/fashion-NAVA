import { IResult, ConnectionPool, Transaction , Request} from "mssql";
import * as IProduct from "../interfaces/product";
import { AppError } from "../utils/appError";
import { ProductDetailModel } from "../models/product";
import cloudinary from "../config/cloudinary";
import { dbPools, getBranchPool } from "../config/database";

export const getProductSizesBySizeId = async (sizeId: string, dbBranch: ConnectionPool, branch_id: string): Promise<any | null> => {
    try {   
        const query = `SELECT bi.product_id, bi.stock, bi.price, fsi.stock as stock_fsi, fsi.flash_sale_price
        FROM branch_inventories bi
        LEFT JOIN flash_sale_items fsi ON fsi.branch_id = bi.branch_id 
                                    and fsi.product_id = bi.product_id
                                    and fsi.color_id_mongo = bi.color_id_mongo
                                    and fsi.size_id_mongo = bi.size_id_mongo
                                    and fsi.status = 'active'
        LEFT JOIN flash_sales fs On fs.ID = fsi.flash_sale_id and fs.Status = 'active'
        WHERE bi.size_id_mongo = @sizeId
            and bi.branch_id = @branchId`;

        const pool = dbBranch
        const result: IResult<any> = await pool.request()
            .input("sizeId", sizeId)
            .input("branchId", branch_id)
            .query(query);
        
        if (result.recordset.length === 0) {
            return null;
        }
        return result.recordset[0];
    } catch (err) {
        console.log(err);
        throw new AppError("Failed to getProductSizesBySizeId", 500, false)
    }
}
export const getProductByStatus = async (dbBranch: ConnectionPool, status: string): Promise<number> => {
    try {
        const query = `SELECT id from products WHERE status = @status`;
        const result = await dbBranch.request().input('status', status).query(query);

        return result.recordset.length;
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.log(error);
        throw new AppError('Failed to fetch number of product', 500, false);
    }
}
export const getProductName = async (productId: string, dbBranch: ConnectionPool): Promise<string | null> => {
    try {
        const query = `SELECT name FROM products WHERE id = @productId`;
        const pool = dbBranch;
        const result: IResult<any> = await pool.request()
            .input("productId", productId)
            .query(query);
        
        if (result.recordset.length === 0) {
            return null;
        }
        return result.recordset[0].name;
    } catch (err) {
        console.log(err);
        throw new AppError("Failed to getProductName", 500, false)
    }   
}
export const insertProductSql = async (transaction: Transaction, productSql: IProduct.IProductSQL): Promise<string> => {
    try {
        const request = new Request(transaction);
        const query = `INSERT INTO products (id, brand_id, category_id, name, status, mongodb_id)
            values(@id, @brand_id, @category_id, @name, @status, @mongodb_id)
        `
        await request
            .input("id", productSql.id)
            .input("brand_id", productSql.brand_id)
            .input("category_id", productSql.category_id)
            .input("name", productSql.name)
            .input("status", productSql.status || "active")
            .input("mongodb_id", productSql.mongodb_id || null)
            .query(query);
        return productSql.id || "";
    } catch (err) {
        throw new AppError("Failed to insertProductSql", 500, false)
    }
}

export const insertBranchInventory = async (transaction: Transaction, branchInventorySqls: IProduct.IBranchInventorySQL[]): Promise<void> => {
    try {
        const request = new Request(transaction);
        const values: String[] = [];
        branchInventorySqls.forEach((element, index) => {
            const idParam = `id${index}`;
            const branchParam = `branch${index}`;
            const productParam = `product${index}`;
            const colorParam = `color${index}`;
            const sizeParam = `size${index}`;
            const priceParam = `price${index}`;
            const stockParam = `stock${index}`;
            
            values.push(`(@${idParam}, @${branchParam}, @${productParam}, @${colorParam}, @${sizeParam}, @${priceParam}, @${stockParam})`);
            request
                .input(idParam, element.id)
                .input(branchParam, element.branch_id)
                .input(productParam, element.product_id!)
                .input(colorParam, element.color_id_mongo)
                .input(sizeParam, element.size_id_mongo)
                .input(priceParam, element.price)
                .input(stockParam, element.stock)
        })
        const query = `INSERT INTO branch_inventories (id, branch_id, product_id, color_id_mongo, size_id_mongo, price, stock)
                        VALUES ${values.join(", ")}`;
        await request.query(query);

    } catch (err) {
        console.log(err);
        throw new AppError("Failed to insertBranchInventory", 500, false)
    }
}

export const uploadImageProducts = async (colors: IProduct.IProductColorMongo[]) => {
    try {
        for (const color of colors) {
            if (color.image_main && typeof color.image_main !== "string") {
                const mainUpload = await uploadToCloudinary(color.image_main)
                color.image_main = mainUpload.secure_url;
            }
            if (color.color_images && color.color_images.length > 0) {
                const promises: Promise<string>[] = [];
                for (const img of color.color_images) {
                    if (typeof img !== "string") {
                        promises.push(uploadToCloudinary(img).then(res => res.secure_url));
                    }
                    else {
                        promises.push(Promise.resolve(img));
                    }
                }
                color.color_images = await Promise.all(promises);
            }
        }
        return colors;
    } catch (err) {
        throw new AppError("Failed to UploadImageProducts", 500, false)
    }
}

const uploadToCloudinary = (file: any) => {
    return cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        {folder: "Products"}
    )
}

export const insertProductMongo = async (productMongo: IProduct.IProductDetailMongo) => {
    try {
        const createDoc = await ProductDetailModel.create(productMongo);
        return createDoc.toObject();
    } catch (err) {
        throw new AppError("Failed to insertProductSql", 500, false)
    }
}

export const deleteProductMongo = async (id: string):Promise<void> => {
    await ProductDetailModel.findByIdAndDelete(id);
}

export const getBranchIdByCode = async (pool: ConnectionPool, branchCode: string) => {
    try {
        const query = `SELECT id FROM branches WHERE branch_code = @branchCode`
        const result = await pool.request()
            .input('branchCode', branchCode)
            .query(query);
        return result.recordset[0].id
        
    } catch (err) {
        throw new AppError("Failed to get BranchIdByCode", 500, false)

    }
}














 /*
// 1. Định nghĩa Schema
const ProductSchema = new mongoose.Schema({
    // description: { type: String, default: '' },
    // images: { type: [String], default: [] },
    // specifications: { type: Object, default: {} },
    // reviews: { type: Array, default: [] }
}, { 
    timestamps: true, 
    collection: 'user_profile' // Tên collection trong MongoDB
});

// 2. Tạo Model (Có kiểm tra để tránh lỗi "OverwriteModelError" khi chạy lại server)
const ProductModel = mongoose.models.Product || mongoose.model('Product', ProductSchema);

export const getAllProducts = async (pool: ConnectionPool) => {
    try {
        if (!pool || !pool.connected) {
            throw new AppError("Central DB is not connected", 503);
        }
        
        const query = `SELECT * FROM users`;
        const [sqlResult, mongoProducts] = await Promise.all([
            pool.request().query(query), // Query SQL
            ProductModel.find({}) // Query Mongo (Lấy tất cả)
        ]);
        console.log(mongoProducts);
        return sqlResult.recordset;

    } catch (err) {
        if (err instanceof (AppError)) throw err;
        console.error("Failed to fetch All products", err);
        throw new AppError("Failed to fetch All products", 500, false);
    }
    
}


*/
