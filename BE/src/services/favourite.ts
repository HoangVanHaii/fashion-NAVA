import { ConnectionPool } from "mssql";
import { FavouriteDetail, FavouritePayload, FavouriteResponse } from "../interfaces/favourite";
import { AppError } from "../utils/appError"
import * as IProduct from '../interfaces/product'
import * as productService from '../services/product'

export const createFavourite = async (favourite: FavouritePayload, pool: ConnectionPool): Promise<void> => {
    try {
        const checkProduct = await productService.checkProduct(pool, favourite.product_id);
        if (!checkProduct) {
            throw new AppError("Product not found", 404);
        }
        const checkConflict = await pool.request()
            .input("product_id", favourite.product_id)
            .input("user_id", favourite.user_id)
            .query(`SELECT id 
                    FROM favourites 
                    WHERE user_id = @user_id AND product_id = @product_id`)
        
        if (checkConflict.recordset.length !== 0) {
            throw new AppError("Product already in favourites", 409);
        }
        
        const query = `INSERT INTO favourites (user_id, product_id)
                       VALUES (@user_id, @product_id)`;
        await pool.request()
            .input("user_id", favourite.user_id)
            .input("product_id", favourite.product_id)
            .query(query);
        
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Failed to create favourite", error);
        throw new AppError('Failed to create favourite', 500, false);
    }
}
export const deleteFavourite = async (user_id: string, product_id: string, pool: ConnectionPool): Promise<void> => {
    try {
        const query = `DELETE FROM favourites WHERE user_id = @user_id AND product_id = @product_id`;
        await pool.request()
            .input("user_id", user_id)
            .input("product_id", product_id)
            .query(query);
    } catch (error: any) {
        throw new AppError('Failed to delete favourite', 500, false);
    } 
}
export const getAllFavouritesDetailByUserId = async (pool: ConnectionPool, user_id: string, branch_id: string): Promise<FavouriteDetail[]> => {
    try {
        const productSql = await getAllFavouritesSql(pool, user_id, branch_id);
        
        const mongoIds = productSql
            .map(p => p.mongodb_id)
            .filter(Boolean);
        const mongoProducts = await productService.getMongoProductsByIds(mongoIds)
        
        const inventoryMap = productService.buildInventoryMap(productSql);

        const productResult = mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);
        
        return productResult 

    } catch (error: any) {
        console.error(error);
        throw new AppError('Failed to fetch favourites', 500, false);
    }
};

export const getAllFavouriteIdsByUserId = async (pool: ConnectionPool, user_id: string): Promise<FavouriteResponse[]> => {
    try {
        const productSql = await pool.request()
            .input("user_id", user_id)
            .query(`SELECT f.id as favourite_id, f.product_id
                    FROM favourites f
                    JOIN products p ON f.product_id = p.id AND p.status = 'active'
                    WHERE f.user_id = @user_id`);
        
        return productSql.recordset as FavouriteResponse[]; 

    } catch (error: any) {
        console.error(error);
        throw new AppError('Failed to fetch favouriteIds', 500, false);
    }
};

export const mergeSqlMongoProducts = (sqlRows: any[], mongoMap: Map<string, IProduct.IProductMongoDetail>, inventoryMap: Map<string, IProduct.IInventoryItem>) =>{
    try {
        
        const productMap = new Map<string, FavouriteDetail>();
        sqlRows.forEach(row => {
            let product = productMap.get(row.mongodb_id);
            if (!product) {
                const mongoDoc = mongoMap.get(row.mongodb_id);
                product = {
                    favourite_id: row.favourite_id,
                    product_id_mongo: row.mongodb_id,
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

const getAllFavouritesSql = async (pool: ConnectionPool, user_id: string, branch_id: string) => {
    try {
    const query = `
                    SELECT
                        f.id as favourite_id,
                        f.created_at,
                        p.id,
                        p.mongodb_id,
                        p.name,
                        p.category_id,
                        p.brand_id,
                        p.status,
                        bi.color_id_mongo,
                        bi.size_id_mongo,
                        bi.price,
                        bi.stock,
                        fsi.flash_sale_price AS sale_price,
                        fsi.stock AS sale_stock,
                        fsi.sold AS sale_sold
                    FROM favourites f
                    INNER JOIN products p ON p.id = f.product_id AND p.status = 'active'
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
                    WHERE user_id = @user_id
                    `;
        const req = await  pool.request()
            .input("user_id", user_id)
            .input("branch_id", branch_id)
            .query(query);
        
        return req.recordset;
        
    } catch (error) {
        throw error;
    }
};
