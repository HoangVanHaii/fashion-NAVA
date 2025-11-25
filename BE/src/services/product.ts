import { IResult, ConnectionPool, Transaction , Request, pool} from "mssql";
import * as IProduct from "../interfaces/product";
import { AppError } from "../utils/appError";
import { ProductDetailModel } from "../models/product";
import cloudinary from "../config/cloudinary";
import { Db } from "mongodb";
import sql from 'mssql'


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
        console.error(err);
        throw new AppError("Failed to insertBranchInventory", 500, false)
    }
}

export const uploadImageProducts = async (colors: IProduct.IProductColorPayload[]) => {
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
        const publicIds: string[] = [];
        colors.forEach((color) => {
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
        });
        if (publicIds.length === 0) return;
        const result = await cloudinary.api.delete_resources(publicIds);
        return result;

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



export const deleteBranchInnventory = async (pool: ConnectionPool, branch_id: string, branchInventory: IProduct.deleteInventory[]): Promise<void> => {
    const transaction = pool.transaction();
    try {
        await transaction.begin();
        const request = transaction.request();

        for (const item of branchInventory) {
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
                .input("branch_id", branch_id)
                .input("product_id", item.product_id)
                .input("size_id_mongo", item.size_id_mongo)
                .input("color_id_mongo", item.color_id_mongo)
                .query(`
                    DELETE FROM branch_inventories 
                    WHERE branch_id = @branch_id
                        AND product_id = @product_id
                        AND size_id_mongo = @size_id_mongo
                        AND color_id_mongo = @color_id_mongo
                `);
        }

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
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
            inventorySql.push({
                product_id: color.product_id_sql.toString(),
                color_id_mongo: color.color_id_mongo,
                size_id_mongo: size.size_id_mongo,
                price: size.price,
                stock: size.stock,
            });
        });
        
        await updateBranchInnventory(pool, branch_id, inventorySql)
        await updateColorMongo(color);
        
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Failed update product", err);
        throw new AppError("Failed update product", 500, false);
    }
}

export const updateBranchInnventory = async (pool: ConnectionPool, branch_id: string, branchInventory: IProduct.updateInventory[]): Promise<void> => {
    const transaction = pool.transaction();
    try {
        await transaction.begin();

        for (const item of branchInventory) {
            let setFields: string[] = [];
            const req = transaction.request();

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
            if (result.rowsAffected[0] === 0) {
                throw new AppError(`Item size: ${item.size_id_mongo}, color: ${item.color_id_mongo} not found`, 404);
            }
        }

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

export const updateColorMongo = async (color: IProduct.IUpdateProductColor) => {
    try {
        const setFields: any = {};
        if (color.color !== undefined) setFields["colors.$[c].color"] = color.color;
        if (color.is_main !== undefined) setFields["colors.$[c].is_main"] = color.is_main;

        if (color.image_main && typeof color.image_main !== "string") {
            const img = await uploadToCloudinary(color.image_main);
            setFields["colors.$[c].image_main"] = img.secure_url;
        }
        if (color.color_images && color.color_images.length > 0) {
            const urls = await Promise.all(
                color.color_images.map(async (img) => {
                    if (typeof img !== "string") {
                        const uploaded = await uploadToCloudinary(img);
                        return uploaded.secure_url;
                    }
                    return img;
                })
            );
            setFields["colors.$[c].color_images"] = urls.filter(Boolean);
        }

        if (Object.keys(setFields).length > 0) {
            const resultColor = await ProductDetailModel.updateOne(
                { product_id_sql: color.product_id_sql },
                { $set: setFields },
                { arrayFilters: [{ "c._id": color.color_id_mongo }] }
            );

            if (resultColor.matchedCount === 0) {
                throw new AppError("Color not found in MongoDB", 404);
            }
        }

        if (color.sizes && color.sizes.length > 0) {
            for (const s of color.sizes) {
                await ProductDetailModel.updateOne(
                    { product_id_sql: color.product_id_sql },
                    { $set: {
                        "colors.$[c].sizes.$[s].size": s.size,
                    }},
                    {
                        arrayFilters: [
                            { "c._id": color.color_id_mongo },
                            { "s._id": s.size_id_mongo }
                        ]
                    }
                );
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
        return Array.from(productMap.values());
    } catch (err) {
        throw err;
    }
}

//
