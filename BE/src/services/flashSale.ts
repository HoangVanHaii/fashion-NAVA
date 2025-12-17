import { FlashSale, FlashSaleItem, FlashSaleProductSold } from "../interfaces/flashSale";
import { IProductMongoDetail } from "../interfaces/product";
import { AppError } from "../utils/appError";
import mssql, { ConnectionPool, Transaction } from "mssql";
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
            .input("status", "active")
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
        console.log(flash_sale_id, branch_id);

        const checkFlashSale = await new mssql.Request(transaction)
            .input("flash_sale_id", flash_sale_id)
            .query(`
                SELECT id, title, status, start_date, end_date
                FROM flash_sales
                WHERE id = @flash_sale_id
                  AND status IN ('active', 'pending')
                  AND end_date >= GETDATE()
              `);

        const flash_sale = checkFlashSale.recordset[0];
        if (!flash_sale) {
            throw new AppError(
                "Flash sale has ended or is not available",
                400
            );
        }
        
        // if (flash_sale.status !== "active") {
        //     throw new AppError(`Cannot add items while the flash sale is ${flash_sale.status}`, 400);
        // }
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
                .input("branch_id", branch_id)
                .input("new_start_date", flash_sale.start_date)
                .input("new_end_date", flash_sale.end_date)
                .input("flash_sale_id", flash_sale_id)
                .query(`
                    SELECT fsi.id, fs.title
                    FROM flash_sale_items fsi
                    JOIN flash_sales fs ON fs.id = fsi.flash_sale_id
                    WHERE fsi.size_id_mongo = @size_id_mongo
                        AND fsi.branch_id = @branch_id
                        AND fs.id <> @flash_sale_id
                        AND fs.status IN ('active', 'pending')
                        AND fs.start_date <= @new_end_date
                        AND fs.end_date >= @new_start_date
                `);


            if (checkConflict.recordset.length > 0) {
                throw new AppError(`Product with ID ${item.product_id} is already in another active flash sale during the same period <${checkConflict.recordset[0].title}>`, 400);
            }
            console.log(branch_id);
            await new mssql.Request(transaction)
                .input("flash_sale_id", mssql.UniqueIdentifier, flash_sale_id)
                .input("product_id", mssql.UniqueIdentifier, item.product_id)
                .input('color_id_mongo', item.color_id_mongo)
                .input("size_id_mongo", item.size_id_mongo)
                .input('branch_id', branch_id)
                .input("flash_sale_price", item.flash_sale_price)
                .input("stock", item.stock)
                .query(`INSERT INTO flash_sale_items (flash_sale_id, product_id, color_id_mongo, size_id_mongo, branch_id, flash_sale_price, stock)
                        VALUES (@flash_sale_id, @product_id, @color_id_mongo, @size_id_mongo, @branch_id, @flash_sale_price, @stock)`);
        }
        await transaction.commit();
        console.log("success");
    } catch (err) {
        try {
            // if (!transaction._ab) {
                await transaction.rollback();
            // }
        } catch (_) {}    
        console.error(err);
        if (err instanceof AppError) throw err;
        throw new AppError("Failed to add items to flash sale", 500, false);
    }
}
export const sortDeleteItem = async (dbBranch: ConnectionPool, idItem: string): Promise<void> => {
    try {
        const query = `
            UPDATE flash_sale_items
            SET status = 'removed'
            WHERE id = @idItem;
        `;

        const result = await dbBranch.request()
            .input('idItem', idItem) 
            .query(query);

        if (result.rowsAffected[0] === 0) {
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

export const sortDeleteFlashSale = async (dbBranch: ConnectionPool, idFlashSale: string): Promise<void> => {
    try {
        const updateFlashSaleQuery = `
            UPDATE flash_sales
            SET status = 'cancelled'
            WHERE id = @idFlashSale;
        `;
        await dbBranch.request()
            .input('idFlashSale', idFlashSale)
            .query(updateFlashSaleQuery);
        

    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error("Error in sortDeleteFlashSale:", error);
        throw new AppError("Failed to update Flash Sale and associated items status.", 500);
    }
};
export const getFlashSaleActive = async (pool: ConnectionPool): Promise<FlashSale[]> => {
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
        const result = await pool.request().query(query);
        const flash_sale_result: FlashSale[] = result.recordset.map(fl => {
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
        console.error("Error getHotDeal:", error);
        throw new AppError("Failed to get hot deal", 500, false);
    }
}
export const getFlashSaleHotDeal = async (excludeIds: string, pool: ConnectionPool, branch_id: string, role: string): Promise<{ flash_sale: FlashSale, products: IProductMongoDetail[] }> => {
    try {
        const request = pool.request();
        
        const excludeArray = excludeIds
            .split(',')
            .map(id => id.trim())
            .filter(id => /^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$/.test(id));
        let notInClause = '';
        if (excludeArray.length > 0) {
            notInClause = `AND fs.id NOT IN (${excludeArray.map(id => `'${id}'`).join(',')})`;
        }
            
        
        const query = `
            SELECT TOP 1 fs.*
            FROM flash_sales fs
            WHERE fs.status = 'active'
              AND (
                  SELECT COUNT(*)
                  FROM flash_sale_items fsi
                  WHERE fsi.flash_sale_id = fs.id
                    AND fsi.status = 'active' AND fsi.branch_id = @branch_id
              ) >= 4
            ${notInClause}
            ORDER BY fs.start_date DESC;
        `;
        const flashSaleResult = await request
            .input("branch_id", branch_id)    
            .query(query);
        const flash_sale = flashSaleResult.recordset[0];
        if (flash_sale) {
            flash_sale.id = flash_sale.ID;
        }
        // console.log(flash_sale);

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
        flash_sale.id = flash_sale.ID;
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


export const getProductsNotSale = async (pool: ConnectionPool, branch_id: string): Promise<IProductMongoDetail[]> => {
    try {
        let query = queryGlobalTmp;
        const req = pool.request()
            .input("branch_id", branch_id)
            .input("status", "active")
        
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
const queryGlobalTmp = `
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
        bi.stock
    FROM products p
    INNER JOIN branch_inventories bi
        ON bi.product_id = p.id
        AND bi.branch_id = @branch_id
    WHERE p.status = @status
      AND NOT EXISTS (
        SELECT 1
        FROM branch_inventories bi2
        INNER JOIN flash_sale_items fsi
            ON fsi.product_id = bi2.product_id
            AND fsi.color_id_mongo = bi2.color_id_mongo
            AND fsi.size_id_mongo = bi2.size_id_mongo
            AND fsi.branch_id = @branch_id
        INNER JOIN flash_sales fs
            ON fs.id = fsi.flash_sale_id
            AND fs.status IN ('active', 'pending')
            AND fs.start_date <= GETDATE()
            AND fs.end_date >= GETDATE()
        WHERE bi2.product_id = p.id
          AND bi2.branch_id = @branch_id
      );
`;






export const updateFlashSaleStatusWithTransaction = async (transaction: Transaction, idFlashSale: string, branch_id: string): Promise<void> => {
    
    // 1. Kiểm tra Flash Sale (Dùng request của transaction truyền vào)
    const checkResult = await new mssql.Request(transaction)
        .input('idFlashSale', idFlashSale)
        .query(`
            SELECT id, title, status, start_date, end_date 
            FROM flash_sales 
            WHERE id = @idFlashSale
        `);

    const flashSale = checkResult.recordset[0];
    if (!flashSale) {
        throw new AppError("Flash sale not found", 404);
    }

    // 2. Tính toán trạng thái (Logic giữ nguyên)
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
            // Nếu đã hủy thì không cần làm gì, nhưng cũng không throw lỗi
            return; 
        default:
            throw new AppError(`Unknown status: ${flashSale.status}`, 400);
    }

    // 3. Update bảng cha
    await new mssql.Request(transaction)
        .input('idFlashSale', idFlashSale)
        .input('newStatus', newStatus)
        .input('newStartDate', newStartDate)
        .input('newEndDate', newEndDate)
        .query(`
            UPDATE flash_sales
            SET status = @newStatus, start_date = @newStartDate, end_date = @newEndDate
            WHERE id = @idFlashSale
        `);

    // 4. Update bảng con nếu cần
    if (newStatus === 'ended' || newStatus === 'cancelled') {
        await new mssql.Request(transaction)
            .input('idFlashSale', idFlashSale)
            .input('branch_id', branch_id)
            .query(`
                UPDATE flash_sale_items
                SET status = 'removed'
                WHERE flash_sale_id = @idFlashSale AND branch_id = @branch_id
            `);
    }
};