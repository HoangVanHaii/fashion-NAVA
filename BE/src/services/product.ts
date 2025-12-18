import { IResult, ConnectionPool, Transaction , Request, pool} from "mssql";
import * as IProduct from "../interfaces/product";
import { AppError } from "../utils/appError";
import { ProductDetailModel } from "../models/product";
import cloudinary from "../config/cloudinary";
import mongoose, { Types } from 'mongoose'; // Cần import để tạo ID cho size mới
import { Db } from "mongodb";
import sql from 'mssql'
import { getBranchPool } from "../config/database";


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

export const AddColorProduct = async (pool: ConnectionPool, branch_id: string, product_id_sql: string, color: IProduct.IProductColorPayload): Promise<void> => {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    let newColor: IProduct.IProductColorPayload | undefined;
    try {
        color._id = new mongoose.Types.ObjectId()
        let inventory: IProduct.IBranchInventorySQL[] = [];
        color.sizes.forEach(item => {
            item._id = new mongoose.Types.ObjectId();
            const inventoryItem: IProduct.IBranchInventorySQL = {
                branch_id: branch_id,
                product_id: product_id_sql,
                color_id_mongo: color._id!.toString(),
                size_id_mongo: item._id.toString(),
                price: item.price,
                stock: item.stock
            }
            inventory.push(inventoryItem);
        })
        await insertBranchInventory(transaction, inventory);
        
        const product = await ProductDetailModel.findOne({ product_id_sql: product_id_sql.toLocaleLowerCase() });
        if (!product) {
            throw new AppError("Product not found", 404);
        }
        newColor = await uploadImageSingleColor(color);
        product.colors.push(newColor);
        await product.save();

        await transaction.commit();
    } catch (err) {
        console.error("Failed to Add product color", err);
        await transaction.rollback();
        if (newColor) {
            await deleteImageFromSingleColor(newColor);
        }
        throw new AppError("Failed to Add product color", 500, false)
    }
}

export const insertBranchInventory = async (transaction: Transaction, branchInventorySqls: IProduct.IBranchInventorySQL[]): Promise<void> => {
    try {
        const request = new Request(transaction);
        const values: String[] = [];
        branchInventorySqls.forEach((element, index) => {
            const branchParam = `branch${index}`;
            const productParam = `product${index}`;
            const colorParam = `color${index}`;
            const sizeParam = `size${index}`;
            const priceParam = `price${index}`;
            const stockParam = `stock${index}`;
            
            values.push(`(@${branchParam}, @${productParam}, @${colorParam}, @${sizeParam}, @${priceParam}, @${stockParam})`);
            request
                .input(branchParam, element.branch_id)
                .input(productParam, element.product_id!)
                .input(colorParam, element.color_id_mongo)
                .input(sizeParam, element.size_id_mongo)
                .input(priceParam, element.price)
                .input(stockParam, element.stock)
        })
        const query = `INSERT INTO branch_inventories (branch_id, product_id, color_id_mongo, size_id_mongo, price, stock)
                        VALUES ${values.join(", ")}`;
        await request.query(query);

    } catch (err) {
        console.error(err);
        throw new AppError("Failed to insertBranchInventory", 500, false)
    }
}

export const uploadImageSingleColor = async (color: IProduct.IProductColorPayload) => {
    try {
        if (color.image_main && typeof color.image_main !== "string") {
            const mainUpload = await uploadToCloudinary(color.image_main);
            color.image_main = mainUpload.secure_url;
        }
        if (color.color_images && color.color_images.length > 0) {
            const promises: Promise<string>[] = [];
            
            for (const img of color.color_images) {
                if (typeof img !== "string") {
                    promises.push(uploadToCloudinary(img).then(res => res.secure_url));
                } else {
                    promises.push(Promise.resolve(img));
                }
            }
            color.color_images = await Promise.all(promises);
        }

        return color;
    } catch (err) {
        throw new AppError("Failed to upload image for single color", 500, false);
    }
}


export const uploadSingleVideo = async (file: Express.Multer.File): Promise<string> => {
    try {
        if (!file) return "";

        // Convert buffer sang base64
        const b64 = Buffer.from(file.buffer).toString("base64");
        const dataURI = "data:" + file.mimetype + ";base64," + b64;

        const result = await cloudinary.uploader.upload(dataURI, {
            folder: "Products/Videos", // Gom video vào folder riêng cho gọn
            resource_type: "video",     // <--- BẮT BUỘC
            timeout: 60000              // Tăng timeout vì video nặng hơn ảnh
        });

        return result.secure_url;
    } catch (err) {
        console.error("Cloudinary Upload Video Error:", err);
        throw new AppError("Failed to upload video", 500, false);
    }
}

// 2. Hàm Xóa Video (Dùng để Rollback khi lỗi)
export const deleteVideo = async (videoUrl: string) => {
    try {
        if (!videoUrl) return;

        // Lấy public_id từ URL. Ví dụ: .../Products/Videos/video123.mp4
        // Regex này lấy phần sau version (v123..) đến trước dấu chấm đuôi file
        const publicIdMatch = videoUrl.match(/\/v\d+\/(.+)\.[a-z]+$/);
        const publicId = publicIdMatch ? publicIdMatch[1] : null;

        if (publicId) {
            await cloudinary.uploader.destroy(publicId, {
                resource_type: 'video' // <--- BẮT BUỘC KHI XÓA
            });
        }
    } catch (err) {
        console.error(`Failed to rollback video: ${videoUrl}`, err);
        // Không throw error ở đây để tránh crash luồng rollback chính
    }
}


export const uploadImageProducts = async (colors: IProduct.IProductColorPayload[]) => {
    try {
        const result = await Promise.all(colors.map(color => uploadImageSingleColor(color)));
        return result;
    } catch (err) {
        throw new AppError("Failed to UploadImageProducts", 500, false);
    }
}

const uploadToCloudinary = (file: any) => {
    return cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        {folder: "Products"}
    )
}

export const insertProductMongo = async (productMongo: IProduct.IProductMongo) => {
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
export const deleteImagesFromColors = async (colors: IProduct.IProductColorPayload[]) => {
    try {
        const deletePromises = colors.map(color => deleteImageFromSingleColor(color));
        await Promise.all(deletePromises);

    } catch (err) {
        throw err;
    }
};
export const deleteImageFromSingleColor = async (color: IProduct.IProductColorPayload) => {
    try {
        const publicIds: string[] = [];
        if (color.image_main && typeof color.image_main === "string") {
            const publicId = extractPublicId(color.image_main);
            if (publicId) publicIds.push(publicId);
        }
        if (Array.isArray(color.color_images)) {
            color.color_images.forEach((img) => {
                if (typeof img === "string") {
                    const publicId = extractPublicId(img);
                    if (publicId) publicIds.push(publicId);
                }
            });
        }
        if (publicIds.length === 0) return;
        await cloudinary.api.delete_resources(publicIds);

    } catch (err) {
        throw err;
    }
};

const extractPublicId = (url: string): string | null => {
    try {
        const part = 'Products' + url.split("Products")[1];
        const noExt = part.substring(0, part.lastIndexOf(".")); 
        return noExt;
    } catch {
        return null;
    }
};


export const deleteColor = async (pool: ConnectionPool, branch_id: string, product_id_sql: string, color_id_mongo: string): Promise<void> => {
    try {
        const request = pool.request();
        console.log(product_id_sql, color_id_mongo);
        const existing = await request
        .input("branch_id", branch_id)
        .input("product_id", product_id_sql)
        .input("color_id_mongo", color_id_mongo)
        .query(`
            SELECT 1 
            FROM branch_inventories 
            WHERE branch_id = @branch_id
                AND product_id = @product_id
                AND color_id_mongo = @color_id_mongo
        `);

        if (existing.recordset.length === 0) {
            throw new AppError(`color_id: ${color_id_mongo} not found`, 404);
        }
        await request
            .query(`
                DELETE FROM branch_inventories 
                WHERE branch_id = @branch_id
                    AND product_id = @product_id
                    AND color_id_mongo = @color_id_mongo
            `);

    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Failed to Delete Color", err);
        throw new AppError("Failed to Delete Color", 500, false)
    }
}


export const deleteBranchInnventory = async (pool: ConnectionPool, branch_id: string, branchInventory: IProduct.deleteInventory): Promise<void> => {
    try {
        const request = pool.request();

        const item = branchInventory;
        const existing = await request
        .input("branch_id", branch_id)
        .input("product_id", item.product_id)
        .input("size_id_mongo", item.size_id_mongo)
        .input("color_id_mongo", item.color_id_mongo)
        .query(`
            SELECT 1 
            FROM branch_inventories 
            WHERE branch_id = @branch_id
                AND product_id = @product_id
                AND size_id_mongo = @size_id_mongo 
                AND color_id_mongo = @color_id_mongo
        `);

        if (existing.recordset.length === 0) {
            throw new AppError(`Item size_id: ${item.size_id_mongo}, color_id: ${item.color_id_mongo} not found`, 404);
        }
        await request
            .query(`
                DELETE FROM branch_inventories 
                WHERE branch_id = @branch_id
                    AND product_id = @product_id
                    AND size_id_mongo = @size_id_mongo
                    AND color_id_mongo = @color_id_mongo
            `);

    } catch (err) {
        console.log(err);
        if (err instanceof AppError) throw err;
        console.error("Failed to deleteInventory", err);
        throw new AppError("Failed to deleteInventory", 500, false)
    }
}




export const updateProductInfo = async (pool: ConnectionPool, product: IProduct.UpdateProductInfo) => {
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const checkSql = await checkProduct(pool, product.product_id_sql);
        if (!checkSql) {
            throw new AppError("Product not found", 404);
        }

        await updateProductInfoSql(transaction, product);
        await updateProductInfoMongo(product.product_id_sql, product.description || "", product.attributes);
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        if (err instanceof AppError) throw err;
        console.error("Failed update product", err);
        throw new AppError("Failed update product", 500, false);
    }
}

export const updateProductInfoSql = async (transaction: Transaction, product: IProduct.UpdateProductInfo) => {
    try {
        let setFields: string[] = [];
        const req = transaction.request()
            .input("product_id", product.product_id_sql);
        
        for (const [key, value] of Object.entries(product)) {
            if (key === "product_id_sql" || key === "attributes" || key === 'description') continue;
            if (value === undefined || value === null || value === "") continue;
            setFields.push(`${key} = @${key}`);
            req.input(key, value);
        }
        const query = `
                    UPDATE products
                    SET ${setFields.join(', ')}
                    WHERE id = @product_id`
        await req.query(query);

    } catch (err) {
        throw new AppError("Failed update product", 500, false);
    }
}

export const updateProductInfoMongo = async (product_id_sql: string, description: string, attributes?: { [key: string]: string | number | boolean }) => {
    try {
        const setFields: any = {};

        if (description !== undefined && description !== null && description !== "") {
            setFields.description = description;
        }
        if (attributes && typeof attributes === "object") {
            setFields.attributes = attributes;
        }
        if (Object.keys(setFields).length === 0) return;

        const result = await ProductDetailModel.updateOne(
            { product_id_sql: product_id_sql.toLocaleLowerCase() },
            { $set: setFields }
        );

        if (result.matchedCount === 0) {
            throw new AppError("Product not found in MongoDB", 404);
        }
        
    } catch (err) {
        throw err;
    }
}

export const updateProductColorSize = async (pool: ConnectionPool, branch_id: string, color: IProduct.IUpdateProductColor) => {
    try {
        let inventorySql: IProduct.updateInventory[] = [];
        color.sizes?.forEach(size => {
            if (size.size_id_mongo && size.size_id_mongo !== "") {
                inventorySql.push({
                    product_id: color.product_id_sql.toString(),
                    color_id_mongo: color.color_id_mongo,
                    size_id_mongo: size.size_id_mongo,
                    price: size.price,
                    stock: size.stock,
                });
            }
            else {
                size.size_id_mongo = new mongoose.Types.ObjectId();
                inventorySql.push({
                    product_id: color.product_id_sql.toString(),
                    color_id_mongo: color.color_id_mongo,
                    size_id_mongo: size.size_id_mongo.toString(),
                    price: size.price,
                    stock: size.stock
                });
            }
            
        });
        
        await updateBranchInnventory(pool, branch_id, inventorySql)
        await updateColorMongo(color);
        
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Failed update product", err);
        throw new AppError("Failed update product", 500, false);
    }
}

export const updateProductVideo = async (product_id_sql: string, video: Express.Multer.File | string) => {
    try {
        const ProductDoc = await ProductDetailModel.findOne({
            product_id_sql: product_id_sql.toLowerCase(),
        });
        
        if (!ProductDoc) {
            throw new AppError("Product not found", 404, false);
        }
        if (ProductDoc.video) {
            const publicId = ProductDoc.video
                .split("/")
                .slice(-2)
                .join("/")
                .replace(".mp4", "");
      
            await cloudinary.uploader.destroy(publicId, {
                resource_type: "video",
            })
        }
        if (typeof video === "string") {
            await ProductDetailModel.updateOne(
                { product_id_sql: product_id_sql.toLowerCase() },
                { $unset: { video: "" } }
              );
              
        }
        else {
            const url = await uploadSingleVideo(video);
            ProductDoc.video = url;
            await ProductDoc.save();
        }
        return ProductDoc;
        
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Failed update product video", err);
        throw new AppError("Failed update product video", 500, false);
    }
}

export const updateBranchInnventory = async (pool: ConnectionPool, branch_id: string, branchInventory: IProduct.updateInventory[]): Promise<void> => {
    const transaction = pool.transaction();
    try {
        await transaction.begin();

        for (const item of branchInventory) {
            let setFields: string[] = [];
            const req = transaction.request();

            const checkReq = transaction.request();
            checkReq.input("branch_id", branch_id);
            checkReq.input("product_id", item.product_id);
            checkReq.input("color_id_mongo", item.color_id_mongo);
            checkReq.input("size_id_mongo", item.size_id_mongo);

            const check = await checkReq.query(`
                SELECT 1 FROM branch_inventories
                WHERE branch_id = @branch_id
                  AND product_id = @product_id
                  AND color_id_mongo = @color_id_mongo
                  AND size_id_mongo = @size_id_mongo
            `);

            if (check.recordset.length === 0) {
                const insertReq = transaction.request();
                insertReq.input("branch_id", branch_id);
                insertReq.input("product_id", item.product_id);
                insertReq.input("size_id_mongo", item.size_id_mongo);
                insertReq.input("color_id_mongo", item.color_id_mongo);
                insertReq.input("price", item.price ?? 0);
                insertReq.input("stock", item.stock ?? 0);

                await insertReq.query(`
                    INSERT INTO branch_inventories (
                        branch_id, product_id, color_id_mongo, size_id_mongo, price, stock
                    ) VALUES (
                        @branch_id, @product_id, @color_id_mongo, @size_id_mongo, @price, @stock
                    );
                `);
            }
            else {
                if (item.price !== undefined && item.price !== null) {
                    setFields.push("price = @price");
                    req.input("price", item.price)
                }
                if (item.stock !== undefined && item.stock !== null) {
                    setFields.push("stock = @stock");
                    req.input("stock", item.stock)
                }
                if (setFields.length === 0) continue;
    
                const query = `
                        UPDATE branch_inventories
                        SET ${setFields.join(', ')}
                        WHERE branch_id = @branch_id
                            AND product_id = @product_id
                            AND size_id_mongo = @size_id_mongo
                            AND color_id_mongo = @color_id_mongo`;
                
                req.input("branch_id", branch_id);
                req.input("product_id", item.product_id);
                req.input("size_id_mongo", item.size_id_mongo);
                req.input("color_id_mongo", item.color_id_mongo);
                
                const result = await req.query(query);
            }
        }

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}


export const updateStockAll = async (pool: ConnectionPool, branch_id: string, stock: number): Promise<void> => {
    const transaction = pool.transaction();
    try {
        await transaction.begin();
        const req = transaction.request();    
        const query = `
                UPDATE branch_inventories
                SET stock=@stock
                WHERE branch_id = @branch_id`;
            
        req.input("branch_id", branch_id);   
        req.input("stock", stock);
        await req.query(query);
        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        console.error("Failed to update all stock product");
        throw new AppError("Failed to update all stock product", 500, false)
    }
}
export const updateProductStatusALL = async (pool: ConnectionPool, status: string): Promise<void> => {
    const transaction = pool.transaction();
    try {
        await transaction.begin();
        const req = transaction.request();    
        const query = `
                UPDATE products
                SET status = @status`;
        
        req.input("status", status)
        await req.query(query);
        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        console.error("Failed to update all status product");
        throw new AppError("Failed to update all status product", 500, false)
    }
}
export const updateColorMongo = async (color: IProduct.IUpdateProductColor) => {
    try {
        const setFields: any = {};

        // 1. Các trường cơ bản
        if (color.color !== undefined) setFields["colors.$[c].color"] = color.color;
        if (color.is_main !== undefined) setFields["colors.$[c].is_main"] = color.is_main;

        // 2. Xử lý Ảnh Chính
        if (color.image_main !== undefined) {
            if (typeof color.image_main !== "string") {
                const img = await uploadToCloudinary(color.image_main);
                setFields["colors.$[c].image_main"] = img.secure_url;
            } else {
                setFields["colors.$[c].image_main"] = color.image_main;
            }
        }

        // 3. Xử lý Ảnh Phụ (Ghi đè mảng ảnh)
        if (color.color_images !== undefined) {
            const urls = await Promise.all(
                color.color_images.map(async (img) => {
                    if (typeof img !== "string") {
                        const uploaded = await uploadToCloudinary(img);
                        return uploaded.secure_url;
                    }
                    return img;
                })
            );
            setFields["colors.$[c].color_images"] = urls;
        }

        // 4. Xử lý Size (GHI ĐÈ MẢNG SIZE) - SỬA LẠI Ở ĐÂY
        if (color.sizes && Array.isArray(color.sizes)) {
            // Map lại để đảm bảo cấu trúc dữ liệu và tạo ID nếu là size mới
            const processedSizes = color.sizes.map(s => ({
                _id: (s.size_id_mongo && s.size_id_mongo !== '') 
                     ? new Types.ObjectId(s.size_id_mongo) // Giữ ID cũ
                     : new Types.ObjectId(),               // Tạo ID mới nếu chưa có
                size: s.size,
            }));
            
            // Gán nguyên mảng mới vào DB -> Size nào không có trong mảng này sẽ tự mất
            setFields["colors.$[c].sizes"] = processedSizes;
        }

        // 5. Thực thi Update (Chỉ gọi DB 1 lần duy nhất)
        if (Object.keys(setFields).length > 0) {
            const resultColor = await ProductDetailModel.updateOne(
                { product_id_sql: color.product_id_sql.toString().toLocaleLowerCase() }, // Tìm sản phẩm
                { $set: setFields },
                { arrayFilters: [{ "c._id": color.color_id_mongo }] } // Tìm đúng màu để sửa
            );

            if (resultColor.matchedCount === 0) {
                throw new AppError("Product or Color not found", 404);
            }
        }

    } catch (err) {
        console.error("Failed update color in MongoDB:", err);
        throw err;
    }
};

const queryGlobal = `
                SELECT 
                    p.id,
                    p.mongodb_id,
                    p.name,
                    p.category_id,
                    p.brand_id,
                    p.status,
                    p.created_at,
                    bi.color_id_mongo,
                    bi.size_id_mongo,
                    bi.price,
                    bi.stock,
                    fsi.flash_sale_price AS sale_price,
                    fsi.stock AS sale_stock,
                    fsi.sold AS sale_sold
                FROM products p
                LEFT JOIN branch_inventories bi 
                    ON p.id = bi.product_id AND bi.branch_id = @branch_id
                LEFT JOIN flash_sale_items fsi
                    ON fsi.branch_id = @branch_id
                    AND fsi.product_id = p.id
                    AND fsi.color_id_mongo = bi.color_id_mongo
                    AND fsi.size_id_mongo = bi.size_id_mongo
                    AND fsi.status = 'active'
                LEFT JOIN flash_sales fs
                    ON fs.id = fsi.flash_sale_id
                    AND fs.status = 'active'
                    AND fs.start_date <= GETDATE()
                    AND fs.end_date >= GETDATE()
        `;

export const changeStatusProduct = async (pool: ConnectionPool, product_id_sql: string, status: string) => {
    try {
        const check = await checkProduct(pool, product_id_sql);
        if (!check) {
            throw new AppError("Product not found", 404);
        }
        const query = `UPDATE products 
            SET status = @status
            WHERE id = @product_id_sql `;
        await pool.request()
            .input("product_id_sql", product_id_sql)
            .input("status", status || "active")
            .query(query);
        
    } catch (err) {
        if (err instanceof AppError) throw err;
        const message = "Failed to change status product";
        console.error(message, err);
        throw new AppError(message, 500, false);
    }
}
export const checkProduct = async (pool: ConnectionPool, product_id_sql: string) => {
    try {
        const checkProduct = await pool.request()
            .input("product_id_sql", product_id_sql)
            .query(`SELECT id FROM products WHERE id = @product_id_sql`);
        
        return true ? checkProduct.recordset.length > 0 : false;
    } catch (err) {
        throw err;
    }
}


export const getTopProductsNews = async (pool: ConnectionPool, branch_id: string, top: number): Promise<IProduct.IProductMongoDetail[]> => {
    try {
        
        const query = `
                       WITH TopProducts AS (
                            SELECT TOP ${top}
                                *
                            FROM products
                            WHERE status = 'active'
                            ORDER BY created_at DESC
                        )
                        SELECT
                            p.id,
                            p.mongodb_id,
                            p.name,
                            p.category_id,
                            p.brand_id,
                            p.status AS product_status,
                            p.created_at AS product_created_at,
                            bi.color_id_mongo,
                            bi.size_id_mongo,
                            bi.price,
                            bi.stock,
                            fsi.flash_sale_price AS sale_price,
                            fsi.stock AS sale_stock,
                            fsi.sold AS sale_sold
                        FROM 
                            TopProducts p
                        LEFT JOIN 
                            branch_inventories bi 
                            ON p.id = bi.product_id AND bi.branch_id = @branch_id
                        LEFT JOIN 
                            flash_sale_items fsi
                            ON fsi.branch_id = @branch_id
                            AND fsi.product_id = p.id
                            AND fsi.color_id_mongo = bi.color_id_mongo
                            AND fsi.size_id_mongo = bi.size_id_mongo
                            AND fsi.status = 'active'
                        LEFT JOIN 
                            flash_sales fs
                            ON fs.id = fsi.flash_sale_id
                            AND fs.status = 'active'
                            AND fs.start_date <= GETDATE()
                            AND fs.end_date >= GETDATE()
                        ORDER BY
                            p.created_at DESC;

                            `
        
        const req = pool.request()
            .input("branch_id", branch_id)
            
        const sqlResult = await req.query(query)
        
        const productSql = sqlResult.recordset;

        const mongoIds = productSql
            .map(p => p.mongodb_id)
            .filter(Boolean);
        
        const mongoProducts = await getMongoProductsByIds(mongoIds);
        const inventoryMap = buildInventoryMap(productSql);

        const productResult = mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
        
        return productResult;

    } catch (err) {
        console.error("Failed to fetch top new products", err);
        throw new AppError("Failed to fetch top new products", 500, false);    }
};

export const getTopProductsBestseller = async (pool: ConnectionPool, branch_id: string, top: number): Promise<IProduct.IProductMongoDetail[]> => {
    try {
        
        const query = `WITH TopSoldProducts AS (
                            SELECT TOP ${top}
                                oi.product_id,
                                SUM(oi.quantity) AS total_quantity_sold
                            FROM order_items oi 
                            JOIN orders o ON oi.order_id = o.ID
                            WHERE o.status != 'cancelled' 
                            GROUP BY oi.product_id
                            ORDER BY total_quantity_sold DESC
                        )
                        SELECT 
                            p.id,
                            p.mongodb_id,
                            p.name,
                            p.category_id,
                            p.brand_id,
                            p.status AS product_status,
                            p.created_at AS product_created_at,
                            bi.color_id_mongo,
                            bi.size_id_mongo,
                            bi.price ,
                            bi.stock ,
                            fsi.flash_sale_price AS sale_price,
                            fsi.stock AS sale_stock,
                            fsi.sold AS sale_sold,
                            tsp.total_quantity_sold
                        FROM 
                            products p
                        JOIN 
                            TopSoldProducts tsp ON p.id = tsp.product_id
                        LEFT JOIN 
                            branch_inventories bi 
                            ON p.id = bi.product_id AND bi.branch_id = @branch_id
                        LEFT JOIN 
                            flash_sale_items fsi
                            ON fsi.branch_id = @branch_id
                            AND fsi.product_id = p.id
                            AND fsi.color_id_mongo = bi.color_id_mongo
                            AND fsi.size_id_mongo = bi.size_id_mongo
                            AND fsi.status = 'active'
                        LEFT JOIN 
                            flash_sales fs
                            ON fs.id = fsi.flash_sale_id
                            AND fs.status = 'active'
                            AND fs.start_date <= GETDATE()
                            AND fs.end_date >= GETDATE()
                        WHERE p.status = 'active'
                        ORDER BY
                            tsp.total_quantity_sold DESC;`
        
        const req = pool.request()
            .input("branch_id", branch_id)
            
        const sqlResult = await req.query(query)
        
        
        const productSql = sqlResult.recordset;
        const mongoIds = productSql
            .map(p => p.mongodb_id)
            .filter(Boolean);
        const mongoProducts = await getMongoProductsByIds(mongoIds);

        const inventoryMap = buildInventoryMap(productSql);

        const productResult = mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
        return productResult;

    } catch (err) {
        console.error("Failed to fetch all products", err);
        throw new AppError("Failed to fetch all products", 500, false);
    }
};


export const getAllProductsByGender = async (pool: ConnectionPool, branch_id: string, gender: string): Promise<IProduct.IProductMongoDetail[]> => {
    try {
        let query = `
                SELECT 
                    p.id,
                    p.mongodb_id,
                    p.name,
                    p.category_id,
                    p.brand_id,
                    p.status,
                    p.created_at,
                    bi.color_id_mongo,
                    bi.size_id_mongo,
                    bi.price,
                    bi.stock,
                    fsi.flash_sale_price AS sale_price,
                    fsi.stock AS sale_stock,
                    fsi.sold AS sale_sold
                FROM products p
                LEFT JOIN branch_inventories bi 
                    ON p.id = bi.product_id 
                    AND bi.branch_id = @branch_id
                LEFT JOIN flash_sale_items fsi
                    ON fsi.branch_id = @branch_id
                    AND fsi.product_id = p.id
                    AND fsi.color_id_mongo = bi.color_id_mongo
                    AND fsi.size_id_mongo = bi.size_id_mongo
                    AND fsi.status = 'active'
                LEFT JOIN flash_sales fs
                    ON fs.id = fsi.flash_sale_id
                    AND fs.status = 'active'
                    AND fs.start_date <= GETDATE()
                    AND fs.end_date >= GETDATE()
                LEFT JOIN categories c
                    ON p.category_id = c.category_id 
                WHERE c.gender = @gender;
                `
        const req = pool.request()
            .input("branch_id", branch_id)
            .input("gender", gender)
            
        const sqlResult = await req.query(query)
        
        const productSql = sqlResult.recordset;

        const mongoIds = productSql
            .map(p => p.mongodb_id)
            .filter(Boolean);
        
        const mongoProducts = await getMongoProductsByIds(mongoIds);

        const inventoryMap = buildInventoryMap(productSql);

        const productResult = mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
        
        return productResult;

    } catch (err) {
        console.error("Failed to fetch all products by categoryId", err);
        throw new AppError("Failed to fetch all products by categoryId", 500, false);
    }
};


export const getAllProductsByCategory = async (pool: ConnectionPool, branch_id: string, role: string, category_id: string): Promise<IProduct.IProductMongoDetail[]> => {
    try {
        let query = queryGlobal + ' WHERE p.category_id = @category_id';
        const req = pool.request()
            .input("branch_id", branch_id)
            .input("category_id", category_id)
            
        if (role === "customer") {
            query += ' AND p.status = @status ';
            req.input("status", "active")
        }
        const sqlResult = await req.query(query)
        
        const productSql = sqlResult.recordset;

        const mongoIds = productSql
            .map(p => p.mongodb_id)
            .filter(Boolean);
        
        const mongoProducts = await getMongoProductsByIds(mongoIds);

        const inventoryMap = buildInventoryMap(productSql);

        const productResult = mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
        
        return productResult;

    } catch (err) {
        console.error("Failed to fetch all products by categoryId", err);
        throw new AppError("Failed to fetch all products by categoryId", 500, false);
    }
};


export const getAllProductsByBrand = async (pool: ConnectionPool, branch_id: string, role: string, brand_id: string): Promise<IProduct.IProductMongoDetail[]> => {
    try {
        let query = queryGlobal + 'WHERE p.brand_id = @brand_id';
        
        const req = pool.request()
            .input("branch_id", branch_id)
            .input("brand_id", brand_id)
           
        if (role === "customer") {
            req.input("status", "active")
            query += ' AND p.status = @status';
        }
        const sqlResult = await req.query(query)
        
        const productSql = sqlResult.recordset;

        const mongoIds = productSql
            .map(p => p.mongodb_id)
            .filter(Boolean);
        
        const mongoProducts = await getMongoProductsByIds(mongoIds);

        const inventoryMap = buildInventoryMap(productSql);

        const productResult = mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
        
        return productResult;

    } catch (err) {
        console.error("Failed to fetch all products by brandId", err);
        throw new AppError("Failed to fetch all products by brandId", 500, false);
    }
};

export const getAllProducts = async (pool: ConnectionPool, branch_id: string, role: string): Promise<IProduct.IProductMongoDetail[]> => {
    try {
        let query = queryGlobal;
        const req = pool.request()
            .input("branch_id", branch_id)
            
        if (role === "customer") {
            query += ' WHERE p.status = @status';
            req.input("status", "active")
        }
        const sqlResult = await req.query(query)
        
        const productSql = sqlResult.recordset;

        const mongoIds = productSql
            .map(p => p.mongodb_id)
            .filter(Boolean);
        
        const mongoProducts = await getMongoProductsByIds(mongoIds);

        const inventoryMap = buildInventoryMap(productSql);

        const productResult = mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
        
        return productResult;

    } catch (err) {
        console.error("Failed to fetch all products", err);
        throw new AppError("Failed to fetch all products", 500, false);
    }
};

export const getProductBySize = async (pool: ConnectionPool, branch_id: string, role: string, size_id: string): Promise<IProduct.IProductMongoDetail> => {
    try {
        let query = queryGlobal;
        query += ' WHERE p.status = @status AND bi.size_id_mongo = @size_id';
        const req = pool.request()
            .input("branch_id", branch_id)
            .input("status", "active")
            .input('size_id', size_id)

        const sqlResult = await req.query(query)

        const productSql = sqlResult.recordset;

        const mongoIds = productSql
            .map(p => p.mongodb_id)
            .filter(Boolean);

        const mongoProducts = await getMongoProductsByIds(mongoIds);

        const inventoryMap = buildInventoryMap(productSql);

        const productResult = mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
        return productResult[0];

    } catch (err) {
        console.error("Failed to fetch all products", err);
        throw new AppError("Failed to fetch all products", 500, false);
    }
};
export const getProductDetail = async (pool: ConnectionPool, product_id_sql: string, branch_id: string, role: string):Promise<IProduct.IProductMongoDetail> => {
    try {
        let query = queryGlobal + ' WHERE p.id = @product_id_sql'

        const req = pool.request()
            .input("product_id_sql", product_id_sql)
            .input("branch_id", branch_id)

        if (role === "customer") {
            query += ' AND p.status = @status';
            req.input("status", "active")
        }
        const sqlResult = await req.query(query);
        
        if (sqlResult.recordset.length === 0) {
            throw new AppError("Product not found", 404);
        }

        const inventoryMap = buildInventoryMap(sqlResult.recordset);
    
        const mongoId = sqlResult.recordset[0].mongodb_id;
        const productMongoMap = new Map<string, IProduct.IProductMongoDetail>();
        const productMongoDoc = await ProductDetailModel.findById(mongoId);

        if (productMongoDoc) {
            productMongoMap.set(mongoId, productMongoDoc.toObject() as IProduct.IProductMongoDetail);
        }

        const productResult = mergeSqlMongoProducts(sqlResult.recordset, productMongoMap, inventoryMap);

        return productResult[0];

    } catch (err) {
        if (err instanceof AppError) throw err;
        const message = 'Failed to fetch product detail';
        console.error(message, err);
        throw new AppError(message, 500, false);
    }
}


export const getMongoProductsByIds = async (mongoIds: string[]) => {
    try {
        const mongoProducts = await ProductDetailModel.find({ _id: { $in: mongoIds } }).lean();

        const mongoMap = new Map<string, IProduct.IProductMongoDetail>();
        mongoProducts.forEach(p => mongoMap.set(p._id.toString(), p as IProduct.IProductMongoDetail));

        return mongoMap;
    } catch (err) {
        throw err;
    }
}
export const buildInventoryMap = (rows: any[]) => {
    try {
        const inventoryMap = new Map<string, IProduct.IInventoryItem>();

        rows.forEach(row => {
            if (row.color_id_mongo && row.size_id_mongo) {
                const key = `${row.color_id_mongo}_${row.size_id_mongo}`;
                inventoryMap.set(key, {
                    price: row.price ?? null,
                    stock: row.stock ?? 0,
                    sale_price: row.sale_price ?? null,
                    sale_stock: row.sale_stock ?? 0,
                    sale_sold: row.sale_sold ?? 0
                });
            } else {
                const key = `product_${row.product_id}`;
                inventoryMap.set(key, {
                    price: null,
                    stock: 0,
                    sale_price: null,
                    sale_stock: 0,
                    sale_sold: 0
                });
            }
        });
        return inventoryMap;
        
    } catch (err) {
        throw err;
    }
}
export const mergeSqlMongoProducts = (sqlRows: any[], mongoMap: Map<string,
    IProduct.IProductMongoDetail>,
    inventoryMap: Map<string, IProduct.IInventoryItem>) =>{
    try {
        
        const productMap = new Map<string, IProduct.IProductMongoDetail>();
        sqlRows.forEach(row => {
            let product = productMap.get(row.mongodb_id);
            if (!product) {
                const mongoDoc = mongoMap.get(row.mongodb_id);
                product = {
                    _id: row.mongodb_id,
                    product_id_sql: row.id,
                    name: row.name,
                    description: mongoDoc?.description ?? '',
                    brand_id: row.brand_id,
                    category_id: row.category_id,
                    status: row.status,
                    attributes: mongoDoc?.attributes ?? {},
                    video: mongoDoc?.video,
                    colors: mongoDoc?.colors ?? [],
                };
                productMap.set(row.mongodb_id, product);
            }
            product.created_at = row.created_at;

            product.colors.forEach(color => {
                color.sizes?.forEach(size => {
                    let key = `${color._id.toString()}_${size._id.toString()}`;
                    let inv = inventoryMap.get(key);
                    if (!inv) {
                        key = `product_${product.product_id_sql}`;
                    }
                    inv = inventoryMap.get(key);
                    Object.assign(size, {
                        price: inv?.price ?? null,
                        stock: inv?.stock ?? 0,
                        sale_price: inv?.sale_price ?? null,
                        sale_stock: inv?.sale_stock ?? 0,
                        sale_sold: inv?.sale_sold ?? 0
                    });
                        
                    
                });
            });            
        });
        
        let products = Array.from(productMap.values());
        return products;
    } catch (err) {
        throw err;
    }
}

const getTopProductsBestsellerFromPoolForAdmin = async (pool: ConnectionPool, branch_code: string, top: number) => {
    try {
        // Lấy branch_id từ SQL để query bảng branch_inventories
        const branchRes = await pool.request().query(`SELECT id FROM branches WHERE branch_code = '${branch_code}'`);
        const branch_id = branchRes.recordset[0]?.id;

        if (!branch_id) return [];

        const query = `
            WITH TopSoldProducts AS (
                SELECT TOP ${top}
                    oi.product_id,
                    SUM(oi.quantity) AS total_quantity_sold
                FROM order_items oi 
                JOIN orders o ON oi.order_id = o.ID
                WHERE o.status = 'completed' 
                GROUP BY oi.product_id
                ORDER BY total_quantity_sold DESC
            )
            SELECT 
                p.id, p.mongodb_id, p.name, p.category_id, p.brand_id, 
                p.status AS product_status, p.created_at AS product_created_at,
                bi.color_id_mongo, bi.size_id_mongo, bi.price, bi.stock,
                fsi.flash_sale_price AS sale_price, fsi.stock AS sale_stock, fsi.sold AS sale_sold,
                tsp.total_quantity_sold
            FROM products p
            JOIN TopSoldProducts tsp ON p.id = tsp.product_id
            LEFT JOIN branch_inventories bi 
                ON p.id = bi.product_id AND bi.branch_id = @branch_id
            LEFT JOIN flash_sale_items fsi
                ON fsi.branch_id = @branch_id
                AND fsi.product_id = p.id
                AND fsi.color_id_mongo = bi.color_id_mongo
                AND fsi.size_id_mongo = bi.size_id_mongo
                AND fsi.status = 'active'
            LEFT JOIN flash_sales fs
                ON fs.id = fsi.flash_sale_id
                AND fs.status = 'active'
                AND fs.start_date <= GETDATE()
                AND fs.end_date >= GETDATE()
            WHERE p.status = 'active'
            ORDER BY tsp.total_quantity_sold DESC;
        `;

        const req = pool.request().input("branch_id", branch_id);
        const sqlResult = await req.query(query);
        const productSql = sqlResult.recordset;

        // Merge với MongoDB
        const mongoIds = productSql.map(p => p.mongodb_id).filter(Boolean);
        const mongoProducts = await getMongoProductsByIds(mongoIds);
        const inventoryMap = buildInventoryMap(productSql);

        // Kết quả trả về là danh sách sản phẩm đã merge, có trường `total_quantity_sold` trong thuộc tính gốc (SQL)
        // Lưu ý: Hàm mergeSqlMongoProducts của bạn cần đảm bảo gán `total_quantity_sold` vào object kết quả
        // Nếu hàm merge của bạn trả về object IProductMongoDetail chuẩn, ta cần gán thủ công thêm field này để dùng cho việc sort bên dưới.
        const productResult = mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);

        // Map thêm total_quantity_sold vào kết quả cuối cùng để tiện xử lý gộp
        return productResult.map((p, index) => ({
            ...p,
            total_quantity_sold: productSql[index]?.total_quantity_sold || 0
        }));

    } catch (err) {
        console.error(`Failed to fetch best seller for admin from ${branch_code}`, err);
        return []; // Trả về rỗng để không crash flow CT
    }
};

// ---------------------------------------------------------
// 2. MAIN SERVICE: Xử lý logic Branch / CT
// ---------------------------------------------------------
export const getTopProductsBestsellerForAdminService = async (branch_code: string, top: number) => {
    try {
        // CASE 1: Toàn Hệ Thống (CT) -> Cần gộp số lượng bán
        if (branch_code === 'CT') {
            const branches = ['HN', 'DN', 'HCM'];

            const promises = branches.map(async (code) => {
                const pool = getBranchPool(code);
                if (!pool || !pool.connected) return [];
                return await getTopProductsBestsellerFromPoolForAdmin(pool, code, top);
            });

            const results = await Promise.all(promises);
            const allProducts = results.flat();

            // LOGIC GỘP DỮ LIỆU (Merge duplicates)
            // Vì cùng 1 sản phẩm có thể bán chạy ở cả HN và HCM -> Cần cộng dồn số lượng
            const mergedMap = new Map<string, any>();

            allProducts.forEach(p => {
                if (mergedMap.has(p._id.toString())) {
                    const existing = mergedMap.get(p._id.toString());
                    // Cộng dồn số lượng bán
                    existing.total_quantity_sold = (existing.total_quantity_sold || 0) + (p.total_quantity_sold || 0);

                    // Có thể cộng dồn tồn kho hiển thị (nếu cần)
                    // existing.stock += p.stock; 
                } else {
                    mergedMap.set(p._id.toString(), { ...p });
                }
            });

            // Chuyển về mảng, sort lại theo tổng số lượng bán giảm dần, lấy top N
            const finalProducts = Array.from(mergedMap.values())
                .sort((a, b) => b.total_quantity_sold - a.total_quantity_sold)
                .slice(0, top);
            return finalProducts;
        }

        // CASE 2: Chi nhánh lẻ (HN, DN, HCM)
        else {
            const pool = getBranchPool(branch_code);
            if (!pool || !pool.connected) {
                throw new AppError(`Branch ${branch_code} disconnected`, 503);
            }
            return await getTopProductsBestsellerFromPoolForAdmin(pool, branch_code, top);
        }

    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("getTopProductsBestsellerForAdminService Error:", err);
        throw new AppError("Failed to fetch best seller products for admin", 500);
    }
};