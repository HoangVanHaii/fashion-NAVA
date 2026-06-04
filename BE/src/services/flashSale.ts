import { FlashSale, FlashSaleItem, FlashSaleProductSold } from "../interfaces/flashSale";
import { IProductMongoDetail } from "../interfaces/product";
import { AppError } from "../utils/appError";
import { PoolConnection, RowDataPacket } from "mysql2/promise";
import { mysqlPool } from "../config/database";
import { buildInventoryMap, getMongoProductsByIds, mergeSqlMongoProducts } from "./product";

export const createFlashSale = async (flashSale: FlashSale): Promise<number> => {
    try {
        const startDateVN = new Date(new Date(flashSale.start_date).getTime() + 7 * 60 * 60 * 1000);
        const endDateVN = new Date(new Date(flashSale.end_date).getTime() + 7 * 60 * 60 * 1000);

        await mysqlPool.query(
            `INSERT INTO flash_sales (title, created_by, start_date, end_date, status)
             VALUES (?, ?, ?, ?, ?)`,
            [flashSale.title, flashSale.created_by, startDateVN, endDateVN, "active"]
        );
        return 1;
    } catch (error) {
        console.error(error);
        throw new AppError("Failed to create flash sale", 500, false);
    }
};

export const addItemToFlashSale = async (flash_sale_id: number, items: FlashSaleItem[]): Promise<void> => {
    const connection = await mysqlPool.getConnection();
    try {
        await connection.beginTransaction();

        const [flashSaleRows] = await connection.query<RowDataPacket[]>(
            `SELECT id, title, status, start_date, end_date
             FROM flash_sales
             WHERE id = ?
               AND status IN ('active', 'pending')
               AND end_date >= NOW()`,
            [flash_sale_id]
        );

        const flash_sale = flashSaleRows[0];
        if (!flash_sale) {
            throw new AppError("Flash sale has ended or is not available", 400);
        }

        for (const item of items) {
            const [existingItemRows] = await connection.query<RowDataPacket[]>(
                `SELECT flash_sale_price
                 FROM flash_sale_items 
                 WHERE size_id_mongo = ?
                   AND flash_sale_id = ?`,
                [item.size_id_mongo, flash_sale_id]
            );

            if (existingItemRows.length > 0) {
                throw new AppError(`Product with size ID ${item.size_id_mongo} is already in the flash sale <${flash_sale.title}>`, 400);
            }

            const [checkConflictRows] = await connection.query<RowDataPacket[]>(
                `SELECT fsi.id, fs.title
                 FROM flash_sale_items fsi
                 JOIN flash_sales fs ON fs.id = fsi.flash_sale_id
                 WHERE fsi.size_id_mongo = ?
                   AND fs.id <> ?
                   AND fs.status IN ('active', 'pending')
                   AND fs.start_date <= ?
                   AND fs.end_date >= ?`,
                [item.size_id_mongo, flash_sale_id, flash_sale.end_date, flash_sale.start_date]
            );

            if (checkConflictRows.length > 0) {
                throw new AppError(`Product with ID ${item.product_id} is already in another active flash sale during the same period <${checkConflictRows[0].title}>`, 400);
            }

            await connection.query(
                `INSERT INTO flash_sale_items (flash_sale_id, product_id, color_id_mongo, size_id_mongo, flash_sale_price, stock)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [flash_sale_id, item.product_id, item.color_id_mongo, item.size_id_mongo, item.flash_sale_price, item.stock]
            );
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        console.error(err);
        if (err instanceof AppError) throw err;
        throw new AppError("Failed to add items to flash sale", 500, false);
    } finally {
        connection.release();
    }
};

export const sortDeleteItem = async (idItem: number): Promise<void> => {
    try {
        const [result] = await mysqlPool.query<any>(
            `UPDATE flash_sale_items
             SET status = 'removed'
             WHERE id = ?`,
            [idItem]
        );

        if (result.affectedRows === 0) {
            throw new AppError(`Flash Sale Item with ID ${idItem} not found or already removed.`, 404);
        }

    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error("Error in sortDeleteItem:", error);
        throw new AppError("Failed to update Flash Sale Item status.", 500);
    }
};

export const sortDeleteFlashSale = async (idFlashSale: number): Promise<void> => {
    try {
        await mysqlPool.query(
            `UPDATE flash_sales
             SET status = 'cancelled'
             WHERE id = ?`,
            [idFlashSale]
        );
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error("Error in sortDeleteFlashSale:", error);
        throw new AppError("Failed to update Flash Sale status.", 500);
    }
};

export const getFlashSaleActive = async (): Promise<FlashSale[]> => {
    try {
        const query = `
            SELECT
                fs.*,
                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM flash_sale_items fsi
                        WHERE fsi.flash_sale_id = fs.id
                        AND fsi.status = 'active'
                    ) THEN 1
                    ELSE 0
                END AS is_participate
            FROM flash_sales fs
            ORDER BY fs.start_date DESC;
        `;
        const [rows] = await mysqlPool.query<RowDataPacket[]>(query);

        const flash_sale_result: FlashSale[] = rows.map(fl => {
            const is_participate = fl.is_participate === 1;

            return {
                id: fl.ID,
                title: fl.title,
                start_date: fl.start_date,
                end_date: fl.end_date,
                status: fl.Status,
                created_by: fl.created_by,
                created_at: fl.created_at,
                is_participate: is_participate,
            };
        });
        return flash_sale_result;

    } catch (error) {
        console.error("Error getFlashSaleActive:", error);
        throw new AppError("Failed to get flash sales", 500, false);
    }
};

export const getFlashSaleHotDeal = async (excludeIds: string, role: string): Promise<{ flash_sale: FlashSale, products: IProductMongoDetail[] }> => {
    try {

        const excludeArray = excludeIds
            .split(',')
            .map(id => id.trim())
            .filter(id => !isNaN(Number(id)) && id !== '');

        let notInClause = '';
        if (excludeArray.length > 0) {
            notInClause = `AND fs.id NOT IN (${excludeArray.map(id => mysqlPool.escape(id)).join(',')})`;
        }

        const query = `
            SELECT fs.*
            FROM flash_sales fs
            WHERE fs.status = 'active'
              AND (
                  SELECT COUNT(*)
                  FROM flash_sale_items fsi
                  WHERE fsi.flash_sale_id = fs.id
                    AND fsi.status = 'active'
              ) >= 4
            ${notInClause}
            ORDER BY fs.start_date DESC
            LIMIT 1;
        `;

        const [rows] = await mysqlPool.query<RowDataPacket[]>(query);
        const flash_sale = rows[0] as FlashSale;

        if (flash_sale) {
            flash_sale.id = (flash_sale as any).ID || flash_sale.id;
        }

        if (!flash_sale) {
            return {
                flash_sale: {} as FlashSale,
                products: [],
            };
        }

        const products = await getProductsActive(flash_sale.id || 1, role);
        return { flash_sale, products };
    } catch (err) {
        console.error("Error getHotDeal:", err);
        throw new AppError("Failed to get hot deal", 500, false);
    }
};

export const getFlashSaleHome = async (role: string): Promise<{ flash_sale: FlashSale, products: IProductMongoDetail[] }> => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(`
            SELECT fs.*
            FROM flash_sales fs
            WHERE fs.status = 'active'
              AND (
                  SELECT COUNT(*)
                  FROM flash_sale_items fsi
                  WHERE fsi.flash_sale_id = fs.id
                    AND fsi.status = 'active'
              ) >= 4
            ORDER BY fs.start_date DESC
            LIMIT 1
        `);

        const flash_sale = rows[0] as FlashSale;

        if (!flash_sale) {
            return { flash_sale: {} as FlashSale, products: [] };
        }

        flash_sale.id = (flash_sale as any).ID || flash_sale.id;
        const products = await getProductsActive(flash_sale.id || 1, role);
        return { flash_sale, products };
    } catch (err) {
        console.error("Error getFlashSaleHome:", err);
        throw new AppError("Failed to get flash sale Home", 500, false);
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
        pi.color_id_mongo,
        pi.size_id_mongo,
        pi.price,
        pi.stock,
        fsi.flash_sale_price AS sale_price,
        fsi.stock AS sale_stock,
        fsi.sold AS sale_sold
    FROM products p
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
`;

export const getProductsActive = async (flash_sale_id: number, role: string): Promise<IProductMongoDetail[]> => {
    try {
        let query = `${queryGlobal} WHERE fs.id = ?`;
        const params: any[] = [flash_sale_id];

        if (role === "customer") {
            query += ' AND p.status = ?';
            params.push("active");
        }

        const [sqlResult] = await mysqlPool.query<RowDataPacket[]>(query, params);
        const productSql = sqlResult;

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

const queryGlobalTmp = `
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
        pi.stock
    FROM products p
    INNER JOIN product_inventories pi
        ON pi.product_id = p.id
    WHERE p.status = ?
      AND NOT EXISTS (
        SELECT 1
        FROM product_inventories pi2
        INNER JOIN flash_sale_items fsi
            ON fsi.product_id = pi2.product_id
            AND fsi.color_id_mongo = pi2.color_id_mongo
            AND fsi.size_id_mongo = pi2.size_id_mongo
        INNER JOIN flash_sales fs
            ON fs.id = fsi.flash_sale_id
            AND fs.status IN ('active', 'pending')
            AND fs.start_date <= NOW()
            AND fs.end_date >= NOW()
        WHERE pi2.product_id = p.id
      );
`;

export const getProductsNotSale = async (): Promise<IProductMongoDetail[]> => {
    try {
        const [productSql] = await mysqlPool.query<RowDataPacket[]>(queryGlobalTmp, ["active"]);

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

// Lưu ý: Thay vì nhận `Transaction` của mssql, hàm này giờ nhận `PoolConnection` của mysql2
export const updateFlashSaleStatusWithTransaction = async (connection: PoolConnection, idFlashSale: number): Promise<void> => {

    // 1. Kiểm tra Flash Sale
    const [checkResult] = await connection.query<RowDataPacket[]>(
        `SELECT id, title, status, start_date, end_date 
         FROM flash_sales 
         WHERE id = ?`,
        [idFlashSale]
    );

    const flashSale = checkResult[0];
    if (!flashSale) {
        throw new AppError("Flash sale not found", 404);
    }

    // 2. Tính toán trạng thái
    let newStatus = flashSale.status;
    let newStartDate = flashSale.start_date;
    let newEndDate = flashSale.end_date;
    const now = new Date();

    switch (flashSale.status) {
        case 'pending':
            newStatus = 'active';
            newStartDate = now;
            break;
        case 'active':
            newStatus = 'ended';
            newEndDate = now;
            break;
        case 'ended':
            newStatus = 'cancelled';
            break;
        case 'cancelled':
            return;
        default:
            throw new AppError(`Unknown status: ${flashSale.status}`, 400);
    }

    // 3. Update bảng cha
    await connection.query(
        `UPDATE flash_sales
         SET status = ?, start_date = ?, end_date = ?
         WHERE id = ?`,
        [newStatus, newStartDate, newEndDate, idFlashSale]
    );

    // 4. Update bảng con nếu cần
    if (newStatus === 'ended' || newStatus === 'cancelled') {
        await connection.query(
            `UPDATE flash_sale_items
             SET status = 'removed'
             WHERE flash_sale_id = ?`,
            [idFlashSale]
        );
    }
};