import { FlashSale, FlashSaleItem, FlashSaleProductSold } from "../interfaces/flashSale";
import { IProductMongoDetail } from "../interfaces/product";
import { AppError } from "../utils/appError";
import mssql, { ConnectionPool } from "mssql";
import { buildInventoryMap, getMongoProductsByIds, mergeSqlMongoProducts } from "./product";

export const createFlashSale = async (flashSale: FlashSale, pool: ConnectionPool): Promise<number> => {
    try {
        const startDateVN = new Date(new Date(flashSale.start_date).getTime() + 7 * 60 * 60 * 1000);
        const endDateVN = new Date(new Date(flashSale.end_date).getTime() + 7 * 60 * 60 * 1000);
        const result = await pool.request()
            .input("title", flashSale.title)
            .input("user_id", flashSale.created_by)
            .input("start_date", startDateVN)
            .input("end_date", endDateVN)
            .input("status", "pending")
            .query(`INSERT INTO flash_sales (title, created_by, start_date, end_date, status)
                    VALUES (@title, @user_id, @start_date, @end_date, @status)`);
        return 1;
    } catch (error) {
        console.error(error);
        throw new AppError("Failed to create flash sale", 500, false);
    }
}
export const addItemToFlashSale = async (branch_id: string, flash_sale_id: string, items: FlashSaleItem[], pool: ConnectionPool): Promise<void> => {
    const transaction = new mssql.Transaction(pool);
    try {
        await transaction.begin();

        const checkFlashSale = await new mssql.Request(transaction)
            .input("flash_sale_id", flash_sale_id)
            .query(`SELECT fs.status
                FROM flash_sales fs
                WHERE fs.id = @flash_sale_id`);

        const flash_sale = checkFlashSale.recordset[0];
        if (!flash_sale) {
            throw new AppError("Flash sale not found", 404,);
        }

        if (flash_sale.status !== "pending") {
            throw new AppError(`Cannot add items while the flash sale is ${flash_sale.status}`, 400);
        }
        for (const item of items) {
            const existingItem = await new mssql.Request(transaction)
                .input("flash_sale_id", flash_sale_id)
                .input("size_id_mongo", item.size_id_mongo)
                .input('branch_id', branch_id)
                .query(`SELECT flash_sale_price
                        FROM flash_sale_items 
                        WHERE branch_id = @branch_id
                            AND size_id_mongo = @size_id_mongo
                            AND flash_sale_id = @flash_sale_id
                `);

            if (existingItem.recordset.length > 0) {
                throw new AppError(`Product with ID ${item.size_id_mongo} is already in the flash sale <${checkFlashSale.recordset[0].title}>`, 400,);
            }

            const checkConflict = await new mssql.Request(transaction)
                .input("size_id_mongo", item.size_id_mongo)
                .input('branch_id', branch_id)
                .input("new_start_date", flash_sale.start_date)
                .input("new_end_date", flash_sale.end_date)
                .input("flash_sale_id", flash_sale_id)
                .query(`
                    SELECT fsi.id, fs.title
                    FROM flash_sale_items fsi
                    JOIN flash_sales fs ON fsi.flash_sale_id = fs.id 
                                        AND fs.status IN ('pending','active')
                    WHERE fsi.size_id_mongo = @size_id_mongo
                        AND fsi.branch_id = @branch_id
                        AND fs.id <> @flash_sale_id
                        AND fsi.status = 'active'
                `);

            if (checkConflict.recordset.length > 0) {
                throw new AppError(`Product with ID ${item.product_id} is already in another active flash sale during the same period <${checkConflict.recordset[0].title}>`, 400);
            }
            console.log(branch_id);
            await new mssql.Request(transaction)
                .input("flash_sale_id", flash_sale_id)
                .input("product_id", item.product_id)
                .input('color_id_mongo', item.color_id_mongo)
                .input("size_id_mongo", item.size_id_mongo)
                .input('branch_id', branch_id)
                .input("flash_sale_price", item.flash_sale_price)
                .input("stock", item.stock)
                .query(`INSERT INTO flash_sale_items (flash_sale_id, product_id, color_id_mongo, size_id_mongo, branch_id, flash_sale_price, stock)
                        VALUES (@flash_sale_id, @product_id, @color_id_mongo, @size_id_mongo, @branch_id, @flash_sale_price, @stock)`);
        }
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        console.error(err);
        if (err instanceof AppError) throw err;
        throw new AppError("Failed to add items to flash sale", 500, false);
    }
}

export const getFlashSaleHotDeal = async (excludeIds: string, pool: ConnectionPool, branch_id: string, role: string): Promise<{ flash_sale: FlashSale, products: IProductMongoDetail[] }> => {
    try {
        const request = pool.request();
        
        const excludeSql = excludeIds
            .split(',')
            .map(id => `'${id.trim()}'`)
            .join(',');
        const query = `
            SELECT TOP 1 fs.*
            FROM flash_sales fs
            WHERE fs.status = 'active'
              AND (
                  SELECT COUNT(*)
                  FROM flash_sale_items fsi
                  WHERE fsi.flash_sale_id = fs.id
                    AND fsi.status = 'active'
              ) >= 4
              AND fs.id NOT IN (${excludeSql})
            ORDER BY fs.start_date DESC;
        `;

        const flashSaleResult = await request.query(query);
        const flash_sale = flashSaleResult.recordset[0];

        if (!flash_sale) {
            return {
                flash_sale: {} as FlashSale,
                products: [],
            };
        }
        const products = await getProductsActive(flash_sale.ID, pool, branch_id, role);
        return { flash_sale, products };
    } catch (err) {
        console.error("Error getHotDeal:", err);
        throw new AppError("Failed to get hot deal", 500, false);
    }
};
export const getFlashSaleHome = async (pool: ConnectionPool, branch_id: string, role: string): Promise<{ flash_sale: FlashSale, products: IProductMongoDetail[] }> => {
    try {
        const flashSaleResult = await pool.request().query(`
            SELECT TOP 1 fs.*
            FROM flash_sales fs
            WHERE fs.status = 'active'
              AND (
                  SELECT COUNT(*)
                  FROM flash_sale_items fsi
                  WHERE fsi.flash_sale_id = fs.id
                    AND fsi.status = 'active'
              ) >= 4
            ORDER BY fs.start_date DESC
        `);
        const flash_sale = flashSaleResult.recordset[0];
        const products = await getProductsActive(flash_sale.ID, pool, branch_id, role);
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


export const getProductsActive = async (flash_sale_id: string, pool: ConnectionPool, branch_id: string, role: string): Promise<IProductMongoDetail[]> => {
    try {
        let query = `${queryGlobal}
                    WHERE fs.id = @flash_sale_id`;
        const req = pool.request()
            .input("branch_id", branch_id)
            .input('flash_sale_id', flash_sale_id);
                
        if (role === "customer") {
            query += ' AND p.status = @status';
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
