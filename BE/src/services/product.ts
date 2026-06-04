import * as IProduct from "../interfaces/product";
import { AppError } from "../utils/appError";
import { ProductDetailModel } from "../models/product";
import cloudinary from "../config/cloudinary";
import mongoose, { Types } from 'mongoose';
import { mysqlPool } from "../config/database";
import { PoolConnection } from "mysql2/promise";


// ─────────────────────────────────────────────────────────────────────────────
// HELPER: run a query on the shared pool (no transaction)
// ─────────────────────────────────────────────────────────────────────────────
const query = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
    const [rows] = await mysqlPool.query(sql, params);
    return rows as T[];
};


// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export const getProductSizesBySizeId = async (sizeId: string): Promise<any | null> => {
    try {
        const sql = `
            SELECT pi.product_id, pi.stock, pi.price,
                   fsi.stock AS stock_fsi, fsi.flash_sale_price
            FROM product_inventories pi
            LEFT JOIN flash_sale_items fsi
                ON fsi.product_id = pi.product_id
                AND fsi.color_id_mongo = pi.color_id_mongo
                AND fsi.size_id_mongo = pi.size_id_mongo
                AND fsi.status = 'active'
            LEFT JOIN flash_sales fs ON fs.ID = fsi.flash_sale_id AND fs.Status = 'active'
            WHERE pi.size_id_mongo = ?`;

        const rows = await query(sql, [sizeId]);
        return rows.length === 0 ? null : rows[0];
    } catch (err) {
        console.log(err);
        throw new AppError("Failed to getProductSizesBySizeId", 500, false);
    }
};

export const getProductByStatus = async (status: string): Promise<number> => {
    try {
        const rows = await query(`SELECT id FROM products WHERE status = ?`, [status]);
        return rows.length;
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.log(error);
        throw new AppError('Failed to fetch number of product', 500, false);
    }
};

export const getProductName = async (productId: number): Promise<string | null> => {
    try {
        const rows = await query(`SELECT name FROM products WHERE id = ?`, [productId]);
        return rows.length === 0 ? null : rows[0].name;
    } catch (err) {
        console.log(err);
        throw new AppError("Failed to getProductName", 500, false);
    }
};

export const insertProductSql = async (
    conn: PoolConnection,
    productSql: IProduct.IProductSQL
): Promise<number> => {
    try {
        const [result]: any = await conn.query(
            `INSERT INTO products (brand_id, category_id, name, status, mongodb_id)
             VALUES (?, ?, ?, ?, ?)`,
            [
                productSql.brand_id,
                productSql.category_id,
                productSql.name,
                productSql.status || "active",
                productSql.mongodb_id || null,
            ]
        );
        return result.insertId as number;
    } catch (err) {
        throw new AppError("Failed to insertProductSql", 500, false);
    }
};

export const AddColorProduct = async (
    product_id_sql: number,
    color: IProduct.IProductColorPayload
): Promise<void> => {
    const conn = await mysqlPool.getConnection();
    await conn.beginTransaction();
    let newColor: IProduct.IProductColorPayload | undefined;
    try {
        color._id = new mongoose.Types.ObjectId();
        const inventory: IProduct.IProductInventorySQL[] = [];

        color.sizes.forEach(item => {
            item._id = new mongoose.Types.ObjectId();
            inventory.push({
                product_id: product_id_sql,
                color_id_mongo: color._id!.toString(),
                size_id_mongo: item._id.toString(),
                price: item.price,
                stock: item.stock,
            });
        });

        await insertProductInventory(conn, inventory);

        const product = await ProductDetailModel.findOne({
            product_id_sql: product_id_sql.toString().toLocaleLowerCase(),
        });
        if (!product) throw new AppError("Product not found", 404);

        newColor = await uploadImageSingleColor(color, product_id_sql);
        product.colors.push(newColor);
        await product.save();

        await conn.commit();
    } catch (err) {
        console.error("Failed to Add product color", err);
        await conn.rollback();
        if (newColor) await deleteImageFromSingleColor(newColor);
        throw new AppError("Failed to Add product color", 500, false);
    } finally {
        conn.release();
    }
};

export const insertProductInventory = async (
    conn: PoolConnection,
    inventories: IProduct.IProductInventorySQL[]
): Promise<void> => {
    try {
        const placeholders = inventories.map(() => "(?, ?, ?, ?, ?)").join(", ");
        const values: any[] = [];

        inventories.forEach(el => {
            values.push(el.product_id, el.color_id_mongo, el.size_id_mongo, el.price, el.stock);
        });

        await conn.query(
            `INSERT INTO product_inventories (product_id, color_id_mongo, size_id_mongo, price, stock)
             VALUES ${placeholders}`,
            values
        );
    } catch (err) {
        console.error(err);
        throw new AppError("Failed to insertProductInventory", 500, false);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// CLOUDINARY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const uploadSingleVideo = async (file: Express.Multer.File): Promise<string> => {
    try {
        if (!file) return "";
        const b64 = Buffer.from(file.buffer).toString("base64");
        const dataURI = "data:" + file.mimetype + ";base64," + b64;
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: "Products/Videos",
            resource_type: "video",
            timeout: 60000,
        });
        return result.secure_url;
    } catch (err) {
        console.error("Cloudinary Upload Video Error:", err);
        throw new AppError("Failed to upload video", 500, false);
    }
};

export const deleteVideo = async (videoUrl: string) => {
    try {
        if (!videoUrl) return;
        const publicIdMatch = videoUrl.match(/\/v\d+\/(.+)\.[a-z]+$/);
        const publicId = publicIdMatch ? publicIdMatch[1] : null;
        if (publicId) {
            await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
        }
    } catch (err) {
        console.error(`Failed to rollback video: ${videoUrl}`, err);
    }
};

export const uploadImageProducts = async (
    colors: IProduct.IProductColorPayload[],
    productSku: number
) => {
    try {
        return await Promise.all(colors.map(color => uploadImageSingleColor(color, productSku)));
    } catch (err) {
        console.error("Failed to upload images for product colors", err);
        throw new AppError("Failed to UploadImageProducts", 500, false);
    }
};

const uploadToCloudinary = (file: any, sku: number) => {
    return cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        {
            folder: `Products/${sku}`,
            tags: [String(sku)]
        }
    );
};
export const uploadImageSingleColor = async (
    color: IProduct.IProductColorPayload,
    sku: number
) => {
    try {
        if (color.image_main && typeof color.image_main !== "string") {
            const mainUpload = await uploadToCloudinary(color.image_main, sku);
            color.image_main = mainUpload.secure_url;
        }
        if (color.color_images && color.color_images.length > 0) {
            const promises: Promise<string>[] = [];
            for (const img of color.color_images) {
                if (typeof img !== "string") {
                    promises.push(uploadToCloudinary(img, sku).then(res => res.secure_url));
                } else {
                    promises.push(Promise.resolve(img));
                }
            }
            color.color_images = await Promise.all(promises);
        }
        return color;
    } catch (err) {
        console.error("Failed to upload image for single color", err);
        throw new AppError("Failed to upload image for single color", 500, false);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// MONGODB HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const insertProductMongo = async (productMongo: IProduct.IProductMongo) => {
    try {
        const createDoc = await ProductDetailModel.create(productMongo);
        return createDoc.toObject();
    } catch (err) {
        throw new AppError("Failed to insertProductMongo", 500, false);
    }
};

export const deleteProductMongo = async (id: string): Promise<void> => {
    await ProductDetailModel.findByIdAndDelete(id);
};


// ─────────────────────────────────────────────────────────────────────────────
// IMAGE DELETE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const deleteImagesFromColors = async (colors: IProduct.IProductColorPayload[]) => {
    try {
        await Promise.all(colors.map(color => deleteImageFromSingleColor(color)));
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
            color.color_images.forEach(img => {
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
        return part.substring(0, part.lastIndexOf("."));
    } catch {
        return null;
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// DELETE COLOR / INVENTORY
// ─────────────────────────────────────────────────────────────────────────────

export const deleteColor = async (
    product_id_sql: number,
    color_id_mongo: string
): Promise<void> => {
    try {
        console.log(product_id_sql, color_id_mongo);
        const existing = await query(
            `SELECT 1 FROM product_inventories
             WHERE product_id = ? AND color_id_mongo = ?`,
            [product_id_sql, color_id_mongo]
        );
        if (existing.length === 0) {
            throw new AppError(`color_id: ${color_id_mongo} not found`, 404);
        }
        await mysqlPool.query(
            `DELETE FROM product_inventories
             WHERE product_id = ? AND color_id_mongo = ?`,
            [product_id_sql, color_id_mongo]
        );
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Failed to Delete Color", err);
        throw new AppError("Failed to Delete Color", 500, false);
    }
};

export const deleteProductInventory = async (
    inventory: IProduct.deleteInventory
): Promise<void> => {
    try {
        const existing = await query(
            `SELECT 1 FROM product_inventories
             WHERE product_id = ? AND size_id_mongo = ? AND color_id_mongo = ?`,
            [inventory.product_id, inventory.size_id_mongo, inventory.color_id_mongo]
        );
        if (existing.length === 0) {
            throw new AppError(
                `Item size_id: ${inventory.size_id_mongo}, color_id: ${inventory.color_id_mongo} not found`,
                404
            );
        }
        await mysqlPool.query(
            `DELETE FROM product_inventories
             WHERE product_id = ? AND size_id_mongo = ? AND color_id_mongo = ?`,
            [inventory.product_id, inventory.size_id_mongo, inventory.color_id_mongo]
        );
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Failed to deleteInventory", err);
        throw new AppError("Failed to deleteInventory", 500, false);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PRODUCT INFO
// ─────────────────────────────────────────────────────────────────────────────

export const updateProductInfo = async (product: IProduct.UpdateProductInfo) => {
    const conn = await mysqlPool.getConnection();
    await conn.beginTransaction();
    try {
        const exists = await checkProduct(product.product_id_sql);
        if (!exists) throw new AppError("Product not found", 404);

        await updateProductInfoSql(conn, product);
        await updateProductInfoMongo(
            product.product_id_sql.toString(),
            product.description || "",
            product.attributes
        );
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        if (err instanceof AppError) throw err;
        console.error("Failed update product", err);
        throw new AppError("Failed update product", 500, false);
    } finally {
        conn.release();
    }
};

export const updateProductInfoSql = async (
    conn: PoolConnection,
    product: IProduct.UpdateProductInfo
) => {
    try {
        const setFields: string[] = [];
        const values: any[] = [];

        for (const [key, value] of Object.entries(product)) {
            if (key === "product_id_sql" || key === "attributes" || key === "description") continue;
            if (value === undefined || value === null || value === "") continue;
            setFields.push(`${key} = ?`);
            values.push(value);
        }
        if (setFields.length === 0) return;

        values.push(product.product_id_sql);
        await conn.query(
            `UPDATE products SET ${setFields.join(', ')} WHERE id = ?`,
            values
        );
    } catch (err) {
        throw new AppError("Failed update product", 500, false);
    }
};

export const updateProductInfoMongo = async (
    product_id_sql: string,
    description: string,
    attributes?: { [key: string]: string | number | boolean }
) => {
    try {
        const setFields: any = {};
        if (description) setFields.description = description;
        if (attributes && typeof attributes === "object") setFields.attributes = attributes;
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
};

export const updateProductVideo = async (
    product_id_sql: string,
    video: Express.Multer.File | string
) => {
    try {
        const ProductDoc = await ProductDetailModel.findOne({
            product_id_sql: product_id_sql.toLowerCase(),
        });
        if (!ProductDoc) throw new AppError("Product not found", 404, false);

        if (ProductDoc.video) {
            const publicId = ProductDoc.video.split("/").slice(-2).join("/").replace(".mp4", "");
            await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
        }
        if (typeof video === "string") {
            await ProductDetailModel.updateOne(
                { product_id_sql: product_id_sql.toLowerCase() },
                { $unset: { video: "" } }
            );
        } else {
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
};

export const updateProductColorSize = async (
    color: IProduct.IUpdateProductColor
) => {
    try {
        const inventorySql: IProduct.updateInventory[] = [];
        color.sizes?.forEach(size => {
            if (size.size_id_mongo && size.size_id_mongo !== "") {
                inventorySql.push({
                    product_id: color.product_id_sql,
                    color_id_mongo: color.color_id_mongo,
                    size_id_mongo: size.size_id_mongo,
                    price: size.price,
                    stock: size.stock,
                });
            } else {
                size.size_id_mongo = new mongoose.Types.ObjectId();
                inventorySql.push({
                    product_id: color.product_id_sql,
                    color_id_mongo: color.color_id_mongo,
                    size_id_mongo: size.size_id_mongo.toString(),
                    price: size.price,
                    stock: size.stock,
                });
            }
        });
        await updateProductInventory(inventorySql);
        await updateColorMongo(color, color.product_id_sql);
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Failed update product", err);
        throw new AppError("Failed update product", 500, false);
    }
};

export const updateProductInventory = async (
    inventories: IProduct.updateInventory[]
): Promise<void> => {
    const conn = await mysqlPool.getConnection();
    await conn.beginTransaction();
    try {
        for (const item of inventories) {
            const [existing]: any = await conn.query(
                `SELECT 1 FROM product_inventories
                 WHERE product_id = ? AND color_id_mongo = ? AND size_id_mongo = ?`,
                [item.product_id, item.color_id_mongo, item.size_id_mongo]
            );

            if ((existing as any[]).length === 0) {
                await conn.query(
                    `INSERT INTO product_inventories
                        (product_id, color_id_mongo, size_id_mongo, price, stock)
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        item.product_id,
                        item.color_id_mongo,
                        item.size_id_mongo,
                        item.price ?? 0,
                        item.stock ?? 0,
                    ]
                );
            } else {
                const setFields: string[] = [];
                const values: any[] = [];

                if (item.price !== undefined && item.price !== null) {
                    setFields.push("price = ?");
                    values.push(item.price);
                }
                if (item.stock !== undefined && item.stock !== null) {
                    setFields.push("stock = ?");
                    values.push(item.stock);
                }
                if (setFields.length === 0) continue;

                values.push(item.product_id, item.color_id_mongo, item.size_id_mongo);
                await conn.query(
                    `UPDATE product_inventories
                     SET ${setFields.join(', ')}
                     WHERE product_id = ? AND color_id_mongo = ? AND size_id_mongo = ?`,
                    values
                );
            }
        }
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

export const updateStockAll = async (stock: number): Promise<void> => {
    const conn = await mysqlPool.getConnection();
    await conn.beginTransaction();
    try {
        await conn.query(`UPDATE product_inventories SET stock = ?`, [stock]);
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        console.error("Failed to update all stock product");
        throw new AppError("Failed to update all stock product", 500, false);
    } finally {
        conn.release();
    }
};

export const updateProductStatusALL = async (status: string): Promise<void> => {
    const conn = await mysqlPool.getConnection();
    await conn.beginTransaction();
    try {
        await conn.query(`UPDATE products SET status = ?`, [status]);
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        console.error("Failed to update all status product");
        throw new AppError("Failed to update all status product", 500, false);
    } finally {
        conn.release();
    }
};

export const updateColorMongo = async (
    color: IProduct.IUpdateProductColor,
    product_id_sql: number
) => {
    try {
        const setFields: any = {};

        if (color.color !== undefined) setFields["colors.$[c].color"] = color.color;
        if (color.is_main !== undefined) setFields["colors.$[c].is_main"] = color.is_main;

        if (color.image_main !== undefined) {
            if (typeof color.image_main !== "string") {
                const img = await uploadToCloudinary(color.image_main, product_id_sql);
                setFields["colors.$[c].image_main"] = img.secure_url;
            } else {
                setFields["colors.$[c].image_main"] = color.image_main;
            }
        }

        if (color.color_images !== undefined) {
            const urls = await Promise.all(
                color.color_images.map(async img => {
                    if (typeof img !== "string") {
                        const uploaded = await uploadToCloudinary(img, product_id_sql);
                        return uploaded.secure_url;
                    }
                    return img;
                })
            );
            setFields["colors.$[c].color_images"] = urls;
        }

        if (color.sizes && Array.isArray(color.sizes)) {
            const processedSizes = color.sizes.map(s => ({
                _id:
                    s.size_id_mongo && s.size_id_mongo !== ''
                        ? new Types.ObjectId(s.size_id_mongo.toString())
                        : new Types.ObjectId(),
                size: s.size,
            }));
            setFields["colors.$[c].sizes"] = processedSizes;
        }

        if (Object.keys(setFields).length > 0) {
            const resultColor = await ProductDetailModel.updateOne(
                { product_id_sql: color.product_id_sql.toString().toLocaleLowerCase() },
                { $set: setFields },
                { arrayFilters: [{ "c._id": color.color_id_mongo }] }
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


// ─────────────────────────────────────────────────────────────────────────────
// SHARED SQL FRAGMENT (replaces queryGlobal with branch_inventories → product_inventories)
// ─────────────────────────────────────────────────────────────────────────────

const queryGlobal = `
    SELECT
        p.id,
        p.mongodb_id,
        p.name,
        p.category_id,
        p.brand_id,
        p.status,
        p.created_at,
        pi.color_id_mongo,
        pi.size_id_mongo,
        pi.price,
        pi.stock,
        fsi.flash_sale_price AS sale_price,
        fsi.stock         AS sale_stock,
        fsi.sold          AS sale_sold
    FROM products p
    LEFT JOIN product_inventories pi ON p.id = pi.product_id
    LEFT JOIN flash_sale_items fsi
        ON fsi.product_id  = p.id
        AND fsi.color_id_mongo = pi.color_id_mongo
        AND fsi.size_id_mongo  = pi.size_id_mongo
        AND fsi.status = 'active'
    LEFT JOIN flash_sales fs
        ON fs.ID = fsi.flash_sale_id
        AND fs.Status = 'active'
        AND fs.start_date <= NOW()
        AND fs.end_date   >= NOW()
`;


// ─────────────────────────────────────────────────────────────────────────────
// STATUS / EXISTENCE CHECKS
// ─────────────────────────────────────────────────────────────────────────────

export const changeStatusProduct = async (product_id_sql: number, status: string) => {
    try {
        const exists = await checkProduct(product_id_sql);
        if (!exists) throw new AppError("Product not found", 404);

        await mysqlPool.query(
            `UPDATE products SET status = ? WHERE id = ?`,
            [status || "active", product_id_sql]
        );
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Failed to change status product", err);
        throw new AppError("Failed to change status product", 500, false);
    }
};

export const checkProduct = async (product_id_sql: number): Promise<boolean> => {
    try {
        const rows = await query(`SELECT id FROM products WHERE id = ?`, [product_id_sql]);
        return rows.length > 0;
    } catch (err) {
        throw err;
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT LIST QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export const getTopProductsNews = async (top: number): Promise<IProduct.IProductMongoDetail[]> => {
    try {
        const sql = `
            SELECT
                p.id, p.mongodb_id, p.name, p.category_id, p.brand_id,
                p.status AS product_status, p.created_at AS product_created_at,
                pi.color_id_mongo, pi.size_id_mongo, pi.price, pi.stock,
                fsi.flash_sale_price AS sale_price,
                fsi.stock AS sale_stock, fsi.sold AS sale_sold
            FROM (
                SELECT * FROM products WHERE status = 'active' ORDER BY created_at DESC LIMIT ${top}
            ) p
            LEFT JOIN product_inventories pi ON p.id = pi.product_id
            LEFT JOIN flash_sale_items fsi
                ON fsi.product_id = p.id
                AND fsi.color_id_mongo = pi.color_id_mongo
                AND fsi.size_id_mongo  = pi.size_id_mongo
                AND fsi.status = 'active'
            LEFT JOIN flash_sales fs
                ON fs.ID = fsi.flash_sale_id
                AND fs.Status = 'active'
                AND fs.start_date <= NOW()
                AND fs.end_date   >= NOW()
            ORDER BY p.created_at DESC
        `;

        const productSql = await query(sql);
        const mongoIds = productSql.map(p => p.mongodb_id).filter(Boolean);
        const mongoProducts = await getMongoProductsByIds(mongoIds);
        const inventoryMap = buildInventoryMap(productSql);
        return mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
    } catch (err) {
        console.error("Failed to fetch top new products", err);
        throw new AppError("Failed to fetch top new products", 500, false);
    }
};

export const getTopProductsBestseller = async (top: number): Promise<IProduct.IProductMongoDetail[]> => {
    try {
        const sql = `
            SELECT
                p.id, p.mongodb_id, p.name, p.category_id, p.brand_id,
                p.status AS product_status, p.created_at AS product_created_at,
                pi.color_id_mongo, pi.size_id_mongo, pi.price, pi.stock,
                fsi.flash_sale_price AS sale_price,
                fsi.stock AS sale_stock, fsi.sold AS sale_sold,
                tsp.total_quantity_sold
            FROM (
                SELECT oi.product_id, SUM(oi.quantity) AS total_quantity_sold
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.ID
                WHERE o.status != 'cancelled'
                GROUP BY oi.product_id
                ORDER BY total_quantity_sold DESC
                LIMIT ${top}
            ) tsp
            JOIN products p ON p.id = tsp.product_id
            LEFT JOIN product_inventories pi ON p.id = pi.product_id
            LEFT JOIN flash_sale_items fsi
                ON fsi.product_id = p.id
                AND fsi.color_id_mongo = pi.color_id_mongo
                AND fsi.size_id_mongo  = pi.size_id_mongo
                AND fsi.status = 'active'
            LEFT JOIN flash_sales fs
                ON fs.ID = fsi.flash_sale_id
                AND fs.Status = 'active'
                AND fs.start_date <= NOW()
                AND fs.end_date   >= NOW()
            WHERE p.status = 'active'
            ORDER BY tsp.total_quantity_sold DESC
        `;

        const productSql = await query(sql);
        const mongoIds = productSql.map(p => p.mongodb_id).filter(Boolean);
        const mongoProducts = await getMongoProductsByIds(mongoIds);
        const inventoryMap = buildInventoryMap(productSql);
        return mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
    } catch (err) {
        console.error("Failed to fetch all products", err);
        throw new AppError("Failed to fetch all products", 500, false);
    }
};

export const getAllProductsByGender = async (gender: string): Promise<IProduct.IProductMongoDetail[]> => {
    try {
        const sql = `
            SELECT
                p.id, p.mongodb_id, p.name, p.category_id, p.brand_id,
                p.status, p.created_at,
                pi.color_id_mongo, pi.size_id_mongo, pi.price, pi.stock,
                fsi.flash_sale_price AS sale_price,
                fsi.stock AS sale_stock, fsi.sold AS sale_sold
            FROM products p
            LEFT JOIN product_inventories pi ON p.id = pi.product_id
            LEFT JOIN flash_sale_items fsi
                ON fsi.product_id = p.id
                AND fsi.color_id_mongo = pi.color_id_mongo
                AND fsi.size_id_mongo  = pi.size_id_mongo
                AND fsi.status = 'active'
            LEFT JOIN flash_sales fs
                ON fs.ID = fsi.flash_sale_id
                AND fs.Status = 'active'
                AND fs.start_date <= NOW()
                AND fs.end_date   >= NOW()
            LEFT JOIN categories c ON p.category_id = c.category_id
            WHERE c.gender = ?
        `;

        const productSql = await query(sql, [gender]);
        const mongoIds = productSql.map(p => p.mongodb_id).filter(Boolean);
        const mongoProducts = await getMongoProductsByIds(mongoIds);
        const inventoryMap = buildInventoryMap(productSql);
        return mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
    } catch (err) {
        console.error("Failed to fetch all products by gender", err);
        throw new AppError("Failed to fetch all products by gender", 500, false);
    }
};

export const getAllProductsByCategory = async (
    role: string,
    category_id: number
): Promise<IProduct.IProductMongoDetail[]> => {
    try {
        let sql = queryGlobal + " WHERE p.category_id = ?";
        const params: any[] = [category_id];

        if (role === "customer") {
            sql += " AND p.status = ?";
            params.push("active");
        }

        const productSql = await query(sql, params);
        const mongoIds = productSql.map(p => p.mongodb_id).filter(Boolean);
        const mongoProducts = await getMongoProductsByIds(mongoIds);
        const inventoryMap = buildInventoryMap(productSql);
        return mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
    } catch (err) {
        console.error("Failed to fetch all products by categoryId", err);
        throw new AppError("Failed to fetch all products by categoryId", 500, false);
    }
};

export const getAllProductsByBrand = async (
    role: string,
    brand_id: number
): Promise<IProduct.IProductMongoDetail[]> => {
    try {
        let sql = queryGlobal + " WHERE p.brand_id = ?";
        const params: any[] = [brand_id];

        if (role === "customer") {
            sql += " AND p.status = ?";
            params.push("active");
        }

        const productSql = await query(sql, params);
        const mongoIds = productSql.map(p => p.mongodb_id).filter(Boolean);
        const mongoProducts = await getMongoProductsByIds(mongoIds);
        const inventoryMap = buildInventoryMap(productSql);
        return mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
    } catch (err) {
        console.error("Failed to fetch all products by brandId", err);
        throw new AppError("Failed to fetch all products by brandId", 500, false);
    }
};

export const getAllProducts = async (role: string): Promise<IProduct.IProductMongoDetail[]> => {
    try {
        let sql = queryGlobal;
        const params: any[] = [];

        if (role === "customer") {
            sql += " WHERE p.status = ?";
            params.push("active");
        }
        const productSql = await query(sql, params);
        const mongoIds = productSql.map(p => p.mongodb_id).filter(Boolean);
        const mongoProducts = await getMongoProductsByIds(mongoIds);

        const inventoryMap = buildInventoryMap(productSql);
        return mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
    } catch (err) {
        console.error("Failed to fetch all products", err);
        throw new AppError("Failed to fetch all products", 500, false);
    }
};

export const getProductBySize = async (
    role: string,
    size_id: string
): Promise<IProduct.IProductMongoDetail> => {
    try {
        let sql = queryGlobal + " WHERE p.status = ? AND pi.size_id_mongo = ?";
        const productSql = await query(sql, ["active", size_id]);
        const mongoIds = productSql.map(p => p.mongodb_id).filter(Boolean);
        const mongoProducts = await getMongoProductsByIds(mongoIds);
        const inventoryMap = buildInventoryMap(productSql);
        const productResult = mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
        return productResult[0];
    } catch (err) {
        console.error("Failed to fetch products by size", err);
        throw new AppError("Failed to fetch products by size", 500, false);
    }
};

export const getProductDetail = async (
    product_id_sql: number,
    role: string
): Promise<IProduct.IProductMongoDetail> => {
    try {
        let sql = queryGlobal + " WHERE p.id = ?";
        const params: any[] = [product_id_sql];

        if (role === "customer") {
            sql += " AND p.status = ?";
            params.push("active");
        }

        const rows = await query(sql, params);
        if (rows.length === 0) throw new AppError("Product not found", 404);

        const inventoryMap = buildInventoryMap(rows);
        const mongoId = rows[0].mongodb_id;
        const productMongoMap = new Map<string, IProduct.IProductMongoDetail>();
        const productMongoDoc = await ProductDetailModel.findById(mongoId);
        if (productMongoDoc) {
            productMongoMap.set(mongoId, productMongoDoc.toObject() as IProduct.IProductMongoDetail);
        }

        const productResult = mergeSqlMongoProducts(rows, productMongoMap, inventoryMap);
        return productResult[0];
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Failed to fetch product detail", err);
        throw new AppError("Failed to fetch product detail", 500, false);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: TOP BESTSELLER
// ─────────────────────────────────────────────────────────────────────────────

export const getTopProductsBestsellerForAdminService = async (top: number) => {
    try {
        const sql = `
            SELECT
                p.id, p.mongodb_id, p.name, p.category_id, p.brand_id,
                p.status AS product_status, p.created_at AS product_created_at,
                pi.color_id_mongo, pi.size_id_mongo, pi.price, pi.stock,
                fsi.flash_sale_price AS sale_price,
                fsi.stock AS sale_stock, fsi.sold AS sale_sold,
                tsp.total_quantity_sold
            FROM (
                SELECT oi.product_id, SUM(oi.quantity) AS total_quantity_sold
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.ID
                WHERE o.status = 'completed'
                GROUP BY oi.product_id
                ORDER BY total_quantity_sold DESC
                LIMIT ${top}
            ) tsp
            JOIN products p ON p.id = tsp.product_id
            LEFT JOIN product_inventories pi ON p.id = pi.product_id
            LEFT JOIN flash_sale_items fsi
                ON fsi.product_id = p.id
                AND fsi.color_id_mongo = pi.color_id_mongo
                AND fsi.size_id_mongo  = pi.size_id_mongo
                AND fsi.status = 'active'
            LEFT JOIN flash_sales fs
                ON fs.ID = fsi.flash_sale_id
                AND fs.Status = 'active'
                AND fs.start_date <= NOW()
                AND fs.end_date   >= NOW()
            WHERE p.status = 'active'
            ORDER BY tsp.total_quantity_sold DESC
        `;

        const productSql = await query(sql);
        const mongoIds = productSql.map(p => p.mongodb_id).filter(Boolean);
        const mongoProducts = await getMongoProductsByIds(mongoIds);
        const inventoryMap = buildInventoryMap(productSql);
        const productResult = mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);

        return productResult.map((p, index) => ({
            ...p,
            total_quantity_sold: productSql[index]?.total_quantity_sold || 0,
        }));
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("getTopProductsBestsellerForAdminService Error:", err);
        throw new AppError("Failed to fetch best seller products for admin", 500);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// MONGO / MAP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const getMongoProductsByIds = async (mongoIds: string[]) => {
    try {
        const mongoProducts = await ProductDetailModel.find({ _id: { $in: mongoIds } }).lean();
        const mongoMap = new Map<string, IProduct.IProductMongoDetail>();
        mongoProducts.forEach(p => mongoMap.set(p._id.toString(), p as IProduct.IProductMongoDetail));
        return mongoMap;
    } catch (err) {
        throw err;
    }
};

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
                    sale_sold: row.sale_sold ?? 0,
                });
            } else {
                const key = `product_${row.product_id}`;
                inventoryMap.set(key, {
                    price: null,
                    stock: 0,
                    sale_price: null,
                    sale_stock: 0,
                    sale_sold: 0,
                });
            }
        });
        return inventoryMap;
    } catch (err) {
        throw err;
    }
};

export const mergeSqlMongoProducts = (
    sqlRows: any[],
    mongoMap: Map<string, IProduct.IProductMongoDetail>,
    inventoryMap: Map<string, IProduct.IInventoryItem>
) => {
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
                    if (!inv) key = `product_${product!.product_id_sql}`;
                    inv = inventoryMap.get(key);
                    Object.assign(size, {
                        price: inv?.price ?? null,
                        stock: inv?.stock ?? 0,
                        sale_price: inv?.sale_price ?? null,
                        sale_stock: inv?.sale_stock ?? 0,
                        sale_sold: inv?.sale_sold ?? 0,
                    });
                });
            });``
        });
        return Array.from(productMap.values());
    } catch (err) {
        throw err;
    }
};