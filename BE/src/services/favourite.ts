import { RowDataPacket } from "mysql2";
import { FavouriteDetail, FavouritePayload, FavouriteResponse } from "../interfaces/favourite";
import { AppError } from "../utils/appError";
import * as IProduct from '../interfaces/product';
import * as productService from '../services/product';
import { mysqlPool } from "../config/database"; // Điều chỉnh lại đường dẫn cho chuẩn với project của bạn

export const createFavourite = async (favourite: FavouritePayload): Promise<void> => {
    try {

        const checkProduct = await productService.checkProduct(favourite.product_id);
        if (!checkProduct) {
            throw new AppError("Product not found", 404);
        }

        const [conflictRows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT id 
             FROM favourites 
             WHERE user_id = ? AND product_id = ?`,
            [favourite.user_id, favourite.product_id]
        );

        if (conflictRows.length !== 0) {
            throw new AppError("Product already in favourites", 409);
        }

        await mysqlPool.query(
            `INSERT INTO favourites (user_id, product_id)
             VALUES (?, ?)`,
            [favourite.user_id, favourite.product_id]
        );

    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Failed to create favourite", error);
        throw new AppError('Failed to create favourite', 500, false);
    }
};

export const deleteFavourite = async (user_id: number, product_id: number): Promise<void> => {
    try {
        await mysqlPool.query(
            `DELETE FROM favourites WHERE user_id = ? AND product_id = ?`,
            [user_id, product_id]
        );
    } catch (error: any) {
        throw new AppError('Failed to delete favourite', 500, false);
    }
};

export const getAllFavouritesDetailByUserId = async (user_id: number): Promise<FavouriteDetail[]> => {
    try {
        const productSql = await getAllFavouritesSql(user_id);

        const mongoIds = productSql
            .map(p => p.mongodb_id)
            .filter(Boolean);
        const mongoProducts = await productService.getMongoProductsByIds(mongoIds);

        const inventoryMap = productService.buildInventoryMap(productSql);

        const productResult = mergeSqlMongoProducts(productSql, mongoProducts, inventoryMap);

        return productResult;

    } catch (error: any) {
        console.error(error);
        throw new AppError('Failed to fetch favourites', 500, false);
    }
};

export const getAllFavouriteIdsByUserId = async (user_id: number): Promise<FavouriteResponse[]> => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT f.id as favourite_id, f.product_id
             FROM favourites f
             JOIN products p ON f.product_id = p.id AND p.status = 'active'
             WHERE f.user_id = ?`,
            [user_id]
        );

        return rows as FavouriteResponse[];

    } catch (error: any) {
        console.error(error);
        throw new AppError('Failed to fetch favouriteIds', 500, false);
    }
};

export const mergeSqlMongoProducts = (sqlRows: any[], mongoMap: Map<string, IProduct.IProductMongoDetail>, inventoryMap: Map<string, IProduct.IInventoryItem>) => {
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
                        key = `product_${product!.product_id_sql}`;
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
};

const getAllFavouritesSql = async (user_id: number) => {
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
                pi.color_id_mongo,
                pi.size_id_mongo,
                pi.price,
                pi.stock,
                fsi.flash_sale_price AS sale_price,
                fsi.stock AS sale_stock,
                fsi.sold AS sale_sold
            FROM favourites f
            INNER JOIN products p ON p.id = f.product_id AND p.status = 'active'
            LEFT JOIN product_inventories pi 
                ON p.id = pi.product_id
            LEFT JOIN flash_sale_items fsi
                ON fsi.product_id = p.id
                AND fsi.color_id_mongo = pi.color_id_mongo
                AND fsi.size_id_mongo = pi.size_id_mongo
                AND fsi.status = 'active'
            LEFT JOIN flash_sales fs
                ON fs.id = fsi.flash_sale_id
                AND fs.status = 'active'
                AND fs.start_date <= NOW()
                AND fs.end_date >= NOW()
            WHERE user_id = ?
        `;

        const [rows] = await mysqlPool.query<RowDataPacket[]>(query, [user_id]);
        return rows;

    } catch (error) {
        throw error;
    }
};