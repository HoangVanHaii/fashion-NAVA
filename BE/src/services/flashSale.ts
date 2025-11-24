import { FlashSale, FlashSaleItem, FlashSaleProductSold } from "../interfaces/flashSale";
import { AppError } from "../utils/appError";
import mssql, { ConnectionPool, pool } from "mssql";

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
                    OUTPUT INSERTED.id AS flash_sale_id
                    VALUES (@title, @user_id, @start_date, @end_date, @status)`);
        return result.recordset[0].flash_sale_id;
    } catch (error) {
        console.error(error);
        throw new AppError("Failed to create flash sale", 500, false);
    }
}
export const addItemToFlashSale = async (user_id: number, flash_sale_id: number, items: FlashSaleItem[], pool: ConnectionPool): Promise<void> => {
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
                .input("product_id", item.product_id)
                .query(`SELECT id FROM flash_sale_items 
                        WHERE flash_sale_id = @flash_sale_id AND product_id = @product_id`);

            if (existingItem.recordset.length > 0) {
                throw new AppError(`Product with ID ${item.product_id} is already in the flash sale <${checkFlashSale.recordset[0].title}>`, 400,);
            }

            const checkConflict = await new mssql.Request(transaction)
                .input("product_id", item.product_id)
                .input("new_start_date", flash_sale.start_date)
                .input("new_end_date", flash_sale.end_date)
                .input("flash_sale_id", flash_sale_id)
                .query(`
                SELECT fsi.id, fs.title
                FROM flash_sale_items fsi
                JOIN flash_sales fs ON fsi.flash_sale_id = fs.id
                WHERE fsi.product_id = @product_id
                    AND fs.id <> @flash_sale_id
                    AND fs.status IN ('pending','active')
                   
                `);

            if (checkConflict.recordset.length > 0) {
                throw new AppError(`Product with ID ${item.product_id} is already in another active flash sale during the same period <${checkConflict.recordset[0].title}>`, 400);
            }
            await new mssql.Request(transaction)
                .input("flash_sale_id", flash_sale_id)
                .input("product_id", item.product_id)
                .input("flash_sale_price", item.flash_sale_price)
                .input("stock", item.stock)
                .query(`INSERT INTO flash_sale_items (flash_sale_id, product_id, flash_sale_price, stock)
                        VALUES (@flash_sale_id, @product_id, @flash_sale_price, @stock)`);
        }
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        console.error(err);
        if (err instanceof AppError) throw err;
        throw new AppError("Failed to add items to flash sale", 500, false);
    }
}
export const getAllFlashSaleDetails = async (status: string): Promise<FlashSale[]> => {
    try {
        const pool = await connectionDB();
        const result = await pool.request()
            .input("status", status || "active")
            .query(`
                SELECT 
                    fs.id AS flash_sale_id,
                    fs.title,
                    fs.start_date,
                    fs.end_date,
                    fs.status,
                    fs.created_by,
                    fs.created_at,

                    fsi.id AS flash_sale_item_id,
                    fsi.flash_sale_price,
                    fsi.stock,
                    fsi.sold,
                    fsi.status AS flash_sale_item_status,
                    fsi.created_at AS flash_sale_item_created_at,

                    p.id AS product_id,
                    p.name AS product_name,
                    MIN(ps.price) AS original_price,
                    pc.image_url AS product_image
                FROM flash_sales fs
                    LEFT JOIN flash_sale_items fsi ON fs.id = fsi.flash_sale_id
                    LEFT JOIN products p ON fsi.product_id = p.id
                    LEFT JOIN product_colors pc ON p.id = pc.product_id AND pc.is_main = 1
                    LEFT JOIN product_sizes ps ON pc.id = ps.color_id
                WHERE fs.status = @status
                GROUP BY 
                    fs.id, fs.title, fs.start_date, fs.end_date, fs.status, fs.created_by, fs.created_at,
                    fsi.id, fsi.flash_sale_price, fsi.stock, fsi.sold, fsi.status, fsi.created_at,
                    p.id, p.name, pc.image_url
            `);
        const rows = result.recordset;
        const flashSaleMap = new Map<number, FlashSale>();

        rows.forEach(row => {
            if (!flashSaleMap.has(row.flash_sale_id)) {
                flashSaleMap.set(row.flash_sale_id, {
                    id: row.flash_sale_id,
                    title: row.title,
                    start_date: row.start_date,
                    end_date: row.end_date,
                    status: row.status,
                    created_by: row.created_by,
                    created_at: row.created_at,
                    items: []
                });
            }

            if (row.flash_sale_item_id !== null) {
                const item: FlashSaleItem = {
                    id: row.flash_sale_item_id,
                    product_id: row.product_id,
                    product_name: row.product_name,
                    original_price: row.original_price,
                    product_image: row.product_image,
                    flash_sale_price: row.flash_sale_price,
                    stock: row.stock,
                    sold: row.sold,
                    status: row.flash_sale_item_status,
                    created_at: row.flash_sale_item_created_at
                };
                const flashSale = flashSaleMap.get(row.flash_sale_id);
                if (flashSale) {
                    flashSale.items = flashSale.items || [];
                    flashSale.items.push(item);
                }
            }
        });

        return Array.from(flashSaleMap.values());
    } catch (err) {
        console.error(err);
        throw new AppError("Failed to get flash sales for seller", 500, false);
    }
};
export const getAllFlashSaleForSeller = async (user_id: number, status: string): Promise<FlashSale[]> => {
    try {
        const pool = await connectionDB();
        const result = await pool.request()
            .input("status", status || "active")
            .input("user_id", user_id)
            .query(`
                SELECT 
                    fs.id AS flash_sale_id,
                    fs.title,
                    fs.start_date,
                    fs.end_date,
                    fs.status,
                    fs.created_by,
                    fs.created_at,

                    fsi.id AS flash_sale_item_id,
                    fsi.flash_sale_price,
                    fsi.stock,
                    fsi.sold,
                    fsi.status AS flash_sale_item_status,
                    fsi.created_at AS flash_sale_item_created_at,

                    p.id AS product_id,
                    p.name AS product_name,
                    MIN(ps.price) AS original_price,
                    pc.image_url AS product_image
                FROM flash_sales fs
                    INNER JOIN flash_sale_items fsi ON fs.id = fsi.flash_sale_id
                    INNER JOIN products p ON fsi.product_id = p.id
                    INNER JOIN product_colors pc ON p.id = pc.product_id AND pc.is_main = 1
                    INNER JOIN product_sizes ps ON pc.id = ps.color_id
                    INNER JOIN shops s ON s.id = p.shop_id
                WHERE fs.status = @status AND s.seller_id = @user_id
                GROUP BY 
                    fs.id, fs.title, fs.start_date, fs.end_date, fs.status, fs.created_by, fs.created_at,
                    fsi.id, fsi.flash_sale_price, fsi.stock, fsi.sold, fsi.status, fsi.created_at,
                    p.id, p.name, pc.image_url
            `);
        const rows = result.recordset;
        const flashSaleMap = new Map<number, FlashSale>();

        rows.forEach(row => {
            if (!flashSaleMap.has(row.flash_sale_id)) {
                flashSaleMap.set(row.flash_sale_id, {
                    id: row.flash_sale_id,
                    title: row.title,
                    start_date: row.start_date,
                    end_date: row.end_date,
                    status: row.status,
                    created_by: row.created_by,
                    created_at: row.created_at,
                    items: []
                });
            }

            if (row.flash_sale_item_id !== null) {
                const item: FlashSaleItem = {
                    id: row.flash_sale_item_id,
                    product_id: row.product_id,
                    product_name: row.product_name,
                    original_price: row.original_price,
                    product_image: row.product_image,
                    flash_sale_price: row.flash_sale_price,
                    stock: row.stock,
                    sold: row.sold,
                    status: row.flash_sale_item_status,
                    created_at: row.flash_sale_item_created_at
                };
                const flashSale = flashSaleMap.get(row.flash_sale_id);
                if (flashSale) {
                    flashSale.items = flashSale.items || [];
                    flashSale.items.push(item);
                }
            }
        });

        return Array.from(flashSaleMap.values());
    } catch (err) {
        console.error(err);
        throw new AppError("Failed to get flash sales for seller", 500, false);
    }
};
export const getFlashSaleById = async (id: number): Promise<FlashSale | null> => {
    try {
        const pool = await connectionDB();

        const checkFlashSale = await pool.request()
            .input("flash_sale_id", id)
            .query(`SELECT id FROM flash_sales WHERE id = @flash_sale_id`);
        if (checkFlashSale.recordset.length === 0) {
            throw new AppError("Flash sale not found", 404);
        }
        const result = await pool.request()
            .input("flash_sale_id", id)
            .query(`SELECT 
                        fs.id AS flash_sale_id,
                        fs.title,
                        fs.start_date,
                        fs.end_date,
                        fs.status,
                        fs.created_by,
                        fs.created_at,

                        fsi.id AS flash_sale_item_id,
                        fsi.product_id,
                        fsi.flash_sale_price,
                        fsi.stock,
                        fsi.sold,
                        fsi.status AS flash_sale_item_status,
                        fsi.created_at AS flash_sale_item_created_at,

                        p.name AS product_name,
                        ps.price AS original_price,
                        pc.image_url AS product_image
                    FROM flash_sales fs
                        LEFT JOIN flash_sale_items fsi ON fs.id = fsi.flash_sale_id
                        LEFT JOIN products p ON fsi.product_id = p.id
                        LEFT JOIN product_colors pc ON p.id = pc.product_id AND pc.is_main = 1
                        LEFT JOIN product_sizes ps ON pc.id = ps.color_id
                    WHERE fs.id = @flash_sale_id`);
        const rows = result.recordset;
        if (rows.length === 0) return null;
        const itemMap = new Map<number, FlashSaleItem>();
        rows.forEach(row => {
            if (row.flash_sale_item_id !== null && !itemMap.has(row.flash_sale_item_id)) {
                itemMap.set(row.flash_sale_item_id, {
                    id: row.flash_sale_item_id,
                    product_id: row.product_id,
                    product_name: row.product_name,
                    original_price: row.original_price,
                    product_image: row.product_image,
                    flash_sale_price: row.flash_sale_price,
                    stock: row.stock,
                    sold: row.sold,
                    status: row.flash_sale_item_status,
                    created_at: row.flash_sale_item_created_at
                });
            }
        });
        const flashSale: FlashSale = {
            id: rows[0].flash_sale_id,
            title: rows[0].title,
            start_date: rows[0].start_date,
            end_date: rows[0].end_date,
            status: rows[0].status,
            created_by: rows[0].created_by,
            created_at: rows[0].created_at,
            items: Array.from(itemMap.values())
        }
        return flashSale;
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to get flash sale by id", 500, false);
    }
}
export const getFlashSaleItemById = async (id: number): Promise<FlashSaleItem | null> => {
    try {
        const pool = await connectionDB();
        const result = await pool.request()
            .input("id", id)
            .query(`SELECT fsi.id, fs.id AS flash_sale_id, fsi.product_id, pc.image_url,
                 p.name, ps.price as original_price, fsi.flash_sale_price, fsi.stock, fsi.sold, fsi.status, fsi.created_at
                    FROM flash_sale_items fsi
                        JOIN flash_sales fs ON fs.id = fsi.flash_sale_id
                        JOIN products p ON p.id = fsi.product_id
                        JOIN product_colors pc ON pc.product_id = p.id
                        JOIN product_sizes ps ON ps.color_id = ps.id
                    WHERE fsi.id = @id 
                    `)
        if (result.recordset.length === 0) {
            throw new AppError("Flash sale item not found", 404);
        }
        const item = result.recordset[0];
        const flash_sale_item: FlashSaleItem = {
            id: item.id,
            flash_sale_id: item.flash_sale_id,
            product_name: item.name,
            product_image: item.image_url,
            original_price: item.original_price,
            flash_sale_price: item.flash_sale_price,
            stock: item.stock,
            sold: item.sold,
            status: item.status,
            created_at: item.created_at
        }
        return flash_sale_item;
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to get flash sale item by id", 500, false);
    }

}
export const getAllFlashSalesByStatus = async (status: string, shop_id: number): Promise<FlashSale[] | null> => {
    try {
        const pool = await connectionDB();
        const request = await pool.request();
        let stringQuery = 'AND status <> \'Cancelled\'';
        if (status) {
            request.input("status", status);
            stringQuery = 'AND status = @status';
        }
        const result = await request
            .query(`
                SELECT id, title, start_date, end_date, status, created_by, created_at
                FROM flash_sales
                WHERE 1 = 1  ${stringQuery}
            `);

        const flashSales = result.recordset as FlashSale[];
        const flashSalesWithShopStatus: FlashSale[] = [];
        for (const sale of flashSales) {

            const checkParticipation = await pool.request()
                .input("flash_sale_id", sale.id)
                .input("shop_id", shop_id)
                .input("status", "removed")
                .query(`
                    SELECT
                        CASE WHEN EXISTS (
                            SELECT 1
                            FROM flash_sale_items AS fsi
                            JOIN product_sizes AS ps ON ps.id = fsi.size_id
                            JOIN product_colors AS pc ON pc.id = ps.color_id
                            JOIN products AS p ON p.id = pc.product_id
                            WHERE
                                fsi.flash_sale_id = @flash_sale_id
                                AND p.shop_id = @shop_id
                                AND fsi.status <> @status
                        ) THEN 1 
                        ELSE 0 
                        END AS ShopParticipated
                `);

            const shopParticipated = checkParticipation.recordset.length > 0 && checkParticipation.recordset[0].ShopParticipated === 1;

            const newSale = {
                ...sale,
                shop_has_sale: shopParticipated
            };

            flashSalesWithShopStatus.push(newSale);
        }

        return flashSalesWithShopStatus.length > 0 ? flashSalesWithShopStatus : null;

    } catch (err) {
        console.error(err);
        throw new AppError("Failed to get flash sales by status", 500, false);
    }
};
export const cancelFlashSaleForAdmin = async (id: number): Promise<void> => {
    const pool = await connectionDB();
    const transaction = new mssql.Transaction(pool);

    try {
        await transaction.begin();

        const checkSale = await new mssql.Request(transaction)
            .input("flash_sale_id", id)
            .query(`
            SELECT id, created_by, status
            FROM flash_sales
            WHERE id = @flash_sale_id
        `);

        if (checkSale.recordset.length === 0) {
            throw new AppError("Flash sale not found", 404);
        }
        const flash_sale = checkSale.recordset[0];

        if (flash_sale.status === "active") {
            throw new AppError(`Cannot update while flash sale is active`, 400);
        }
        if (flash_sale.status === "cancelled") {
            throw new AppError(`flash sale was cancelled`, 400);
        }

        await new mssql.Request(transaction)
            .input("flash_sale_id", id)
            .query(`
                UPDATE flash_sales
                SET status = 'cancelled'
                WHERE id = @flash_sale_id
            `);

        await new mssql.Request(transaction)
            .input("flash_sale_id", id)
            .query(`
                UPDATE flash_sale_items
                SET status = 'removed'
                WHERE flash_sale_id = @flash_sale_id
            `);

        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to cancel flash sale", 500);
    }
}
export const cancelAllFlashSaleItemsForSeller = async (shop_id: number, id: number): Promise<void> => {
    const pool = await connectionDB();
    const transaction = new mssql.Transaction(pool);

    try {
        await transaction.begin();

        const checkSale = await new mssql.Request(transaction)
            .input("flash_sale_id", id)
            .query(`
                SELECT id, status
                FROM flash_sales
                WHERE id = @flash_sale_id
        `);

        if (checkSale.recordset.length === 0) {
            throw new AppError("Flash sale not found", 404);
        }
        const flash_sale = checkSale.recordset[0];

        if (flash_sale.status === "cancelled") {
            throw new AppError(`flash sale was cancelled`, 400);
        }
        if (flash_sale.status === "ended") {
            throw new AppError(`flash sale was ended`, 400);
        }
        await new mssql.Request(transaction)
            .input("flash_sale_id", id)
            .input("shop_id", shop_id)
            .query(`
                UPDATE fsi
                SET status = 'removed'
                FROM flash_sale_items fsi
                    JOIN product_sizes ps ON ps.id = fsi.size_id
                    JOIN product_colors pc ON pc.id = ps.color_id
                    JOIN products p ON p.id = pc.product_id
                WHERE fsi.flash_sale_id = @flash_sale_id AND p.shop_id = @shop_id
            `);
        await transaction.commit();
        console.log(11111111111111111111111111111);
    } catch (err) {
        await transaction.rollback();
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to cancel flash sale", 500, false);
    }
}

export const removeFlashSaleItem = async (user_id: number, flash_sale_item_id: number): Promise<void> => {
    try {
        const pool = await connectionDB();
        const checkItem = await pool.request()
            .input("flash_sale_item_id", flash_sale_item_id)
            .input("user_id", user_id)
            .query(`SELECT fs.id
                    FROM flash_sale_items fsi
                        JOIN products p ON p.id = fsi.product_id
                        JOIN shops s ON s.id = p.shop_id
                        JOIN flash_sales fs ON fsi.flash_sale_id = fs.id
                        WHERE fsi.id = @flash_sale_item_id AND s.seller_id = @user_id
                        `)
        if (checkItem.recordset.length === 0) {
            throw new AppError("Flash sale item not found or not belongs to seller", 404);
        }
        const result = await pool.request()
            .input("flash_sale_item_id", flash_sale_item_id)
            .query(`UPDATE flash_sale_items
                    SET status = 'removed'
                    WHERE id = @flash_sale_item_id`);

    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to remove flash sale item", 500, false);
    }
}

export const updateFlashSale = async (flashSale: FlashSale): Promise<void> => {
    try {
        const pool = await connectionDB();

        const result = await pool.request()
            .input("flash_sale_id", flashSale.id)
            .query(`
                SELECT id, created_by, start_date, end_date, status
                FROM flash_sales 
                WHERE id = @flash_sale_id
            `);

        if (result.recordset.length === 0) {
            throw new AppError("Flash sale not found", 404);
        }
        const existingSale = result.recordset[0];

        if (existingSale.status === "active") {
            throw new AppError("Cannot update flash sale while it is running", 400);
        }
        const allowedFields = ["title", "start_date", "end_date", "status"];
        const request = pool.request();
        request.input("flash_sale_id", flashSale.id);

        const setList: string[] = [];

        Object.entries(flashSale).forEach(([key, value]) => {
            if (allowedFields.includes(key) && value != null && value !== "") {
                if (key === "start_date" || key === "end_date") {
                    const vnTime = new Date(new Date(value as any).getTime() + 7 * 60 * 60 * 1000);
                    setList.push(`${key} = @${key}`);
                    request.input(key, vnTime);
                } else {
                    setList.push(`${key} = @${key}`);
                    request.input(key, value);
                }
            }
        });
        if (setList.length === 0) {
            throw new AppError("No valid fields to update", 400);
        }
        await request.query(`
            UPDATE flash_sales
            SET ${setList.join(", ")}
            WHERE id = @flash_sale_id
        `);

    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to update flash sale", 500, false);
    }
};

export const updateFlashSaleItem = async (user_id: number, item: FlashSaleItem): Promise<void> => {
    try {
        const pool = await connectionDB();

        const checkItem = await pool.request()
            .input("flash_sale_item_id", item.id)
            .query(`
                SELECT fsi.id, s.seller_id, fs.status
                FROM flash_sale_items fsi
                JOIN products p ON p.id = fsi.product_id
                JOIN shops s ON s.id = p.shop_id
                INNER JOIN flash_sales fs ON fsi.flash_sale_id = fs.id
                WHERE fsi.id = @flash_sale_item_id
            `);

        if (checkItem.recordset.length === 0) {
            throw new AppError("Flash sale item not found", 404);
        }
        const { seller_id, status } = checkItem.recordset[0];
        if (seller_id !== user_id) {
            throw new AppError("You are not allowed to update this flash sale item", 403);
        }
        if (status !== "pending") {
            throw new AppError("Flash sale is not pending, cannot update items", 400);
        }
        const allowedFields = ["flash_sale_price", "stock", "status"];
        const request = pool.request();
        request.input("flash_sale_item_id", item.id);
        const setList: string[] = [];
        Object.entries(item).forEach(([key, value]) => {
            if (allowedFields.includes(key) && value != null && value !== "") {
                setList.push(`${key} = @${key}`);
                request.input(key, value);
            }
        });

        if (setList.length === 0) {
            throw new AppError("No valid fields to update", 400);
        }
        await request.query(`
            UPDATE flash_sale_items
            SET ${setList.join(", ")}
            WHERE id = @flash_sale_item_id
        `);

    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to update flash sale item", 500);
    }
};

export const getTotalSoldFlashSaleById = async (id: number): Promise<FlashSaleProductSold[]> => {
    try {
        const pool = await connectionDB()
        const result = await pool.request()
            .input("flash_sale_id", id)
            .query(`
                SELECT 
                    p.id AS product_id,
                    SUM(fsi.sold) AS total_flash_sale_sold,
                    SUM(fsi.stock) as total_stock
                FROM products p
                INNER JOIN product_colors pc ON pc.product_id = p.id
                INNER JOIN product_sizes ps ON ps.color_id = pc.id
                INNER JOIN flash_sale_items fsi ON fsi.size_id = ps.id AND fsi.status = 'active'
                INNER JOIN flash_sales fs ON fs.id = fsi.flash_sale_id AND fs.status = 'active'
                WHERE fs.id = @flash_sale_id
                GROUP BY p.id;

            `)
        return result.recordset as FlashSaleProductSold[];

    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to update flash sale item", 500);
    }
}
export const getFlashSaleHome = async (): Promise<{ flash_sale: FlashSale, products: ProductSummary[] }> => {
    try {
        const pool = await connectionDB();
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
        const products = await getProductsActive(flash_sale.id);
        return { flash_sale, products };
    } catch (err) {
        console.error("Error getFlashSaleHome:", err);
        throw new AppError("Failed to get flash sale Home", 500, false);
    }
};
export const getFlashSaleHotDeal = async (excludeIds: number[] = []): Promise<{ flash_sale: FlashSale, products: ProductSummary[] }> => {
    try {
        const pool = await connectionDB();
        const request = pool.request();
        let notInClause = "";
        if (excludeIds.length > 0) {
            const params = excludeIds.map((_, i) => `@id${i}`).join(",");
            notInClause = `AND fs.id NOT IN (${params})`;
            excludeIds.forEach((id, i) => {
                request.input(`id${i}`, id);
            });
        }
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
              ${notInClause}
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


        const products = await getProductsActive(flash_sale.id);
        return { flash_sale, products };
    } catch (err) {
        console.error("Error getHotDeal:", err);
        throw new AppError("Failed to get hot deal", 500, false);
    }
};



export const getProductsActive = async (flash_sale_id: number): Promise<ProductSummary[]> => {
    try {
        const query = `${baseQuery}
            HAVING p.status = 'active'
            ORDER BY fsi.flash_sale_price DESC `;
        const pool = await connectionDB();
        const result = await pool.request()
            .input("flash_sale_id", flash_sale_id)
            .query(query);
        const records = result.recordset;
        const productMap = new Map<number, ProductSummary>();

        for (const row of records) {
            const { id, name, shop_id, description, category_name, image_url, min_price, max_price, sold_quantity, flash_sale_price, avg_rating } = row;

            if (!productMap.has(id)) {
                productMap.set(id, {
                    id,
                    name,
                    shop_id,
                    description,
                    category_name,
                    min_price,
                    max_price,
                    sold_quantity,
                    avg_rating: avg_rating ?? 0,
                    flash_price: flash_sale_price ?? null,
                    images: [],
                    thumbnail: image_url
                });
            }
            else {
                const product = productMap.get(id)!;
                product.sold_quantity += sold_quantity ?? 0;
            }

            const product = productMap.get(id)!;
            if (image_url && !product.images.includes(image_url)) {
                product.images.push(image_url);
            }

        }

        return Array.from(productMap.values());
    } catch (error) {
        console.error(error);
        throw new AppError('Failed to fetch active products', 500, false);
    }
};

const baseQuery = `
                SELECT  
                p.id,
                fsi.id AS flash_sale_item_id,
                p.name,
                p.description,
                p.status,
                i.image_url,
                MIN(fsi.flash_sale_price) AS flash_sale_price,
                MIN(s.price) AS min_price,   
                MAX(s.price) AS max_price,
                fsi.stock AS sold_quantity
            FROM products p
            INNER JOIN categories c ON p.category_id = c.category_id
            INNER JOIN product_colors i ON i.product_id = p.id
            INNER JOIN product_sizes s ON s.color_id = i.id
            LEFT JOIN flash_sale_items fsi ON fsi.size_id = s.id AND fsi.status = 'active'
            LEFT JOIN flash_sales fs ON fs.id = fsi.flash_sale_id AND fs.status = 'active' 
            WHERE fs.id = @flash_sale_id
            GROUP BY 
                p.id, fsi.id, p.name, p.description, p.status, i.image_url, fsi.flash_sale_price, fsi.stock
            `;