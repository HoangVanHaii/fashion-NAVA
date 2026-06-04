import { GetOrder, IKpiResponse, IOrderItem, IRevenueYearResponse, OderPayLoad, Order, OrderItem, RevenueOrder } from "../interfaces/order";
import mongoose from "mongoose";
import { OrderDetail } from "../models/order.mongo";
import { AppError } from "../utils/appError";
import { Address } from "../interfaces/address";
import CartItemMongo from "../models/cart.mongo";
import { mysqlPool } from "../config/database";
import { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

const insertOrder = async (connection: PoolConnection, orderData: Order, mongoOrderId: mongoose.Types.ObjectId): Promise<number> => {
    const query = `
        INSERT INTO orders (user_id, total, discount_value, voucher_id, mongodb_id, method_order, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await connection.query<ResultSetHeader>(query, [
        orderData.user_id,
        orderData.total,
        orderData.discount_value,
        orderData.voucher_id || null,
        mongoOrderId.toString(),
        orderData.method_order || 'online',
        orderData.status || 'pending'
    ]);
    return result.insertId;
};

const insertOrderItems = async (connection: PoolConnection, orderIdSql: number, orderItems: any[]): Promise<void> => {
    const query = `
        INSERT INTO order_items (order_id, product_id, size_id_mongo, quantity, price)
        VALUES (?, ?, ?, ?, ?)
    `;
    for (const item of orderItems) {
        await connection.query(query, [
            orderIdSql,
            item.product_id_sql,
            item.size_id_mongo,
            item.quantity,
            item.price
        ]);
    }
};

export const updateStockAfterOrder = async (connection: PoolConnection, orderItems: OrderItem[]): Promise<void> => {
    for (const item of orderItems) {
        // 1. Lấy tồn kho Flash Sale và khóa dòng (Row lock)
        const [fsRows] = await connection.query<RowDataPacket[]>(
            `SELECT stock FROM flash_sale_items WHERE size_id_mongo = ? FOR UPDATE`,
            [item.size_id_mongo]
        );
        const fsCurrentStock = fsRows.length > 0 ? fsRows[0].stock : 0;

        // 2. Lấy tồn kho thường và khóa dòng
        const [regRows] = await connection.query<RowDataPacket[]>(
            `SELECT stock FROM product_inventories WHERE size_id_mongo = ? FOR UPDATE`,
            [item.size_id_mongo]
        );
        const regCurrentStock = regRows.length > 0 ? regRows[0].stock : 0;

        // 3. Kiểm tra tổng tồn
        if (fsCurrentStock + regCurrentStock < item.quantity) {
            throw new AppError('NOT_ENOUGH_STOCK', 400);
        }

        // 4. Tính toán trừ kho
        const deductFS = Math.min(fsCurrentStock, item.quantity);
        const deductReg = item.quantity - deductFS;

        // 5. Cập nhật tồn kho Flash Sale
        if (deductFS > 0) {
            await connection.query(
                `UPDATE flash_sale_items 
                 SET stock = stock - ?, sold = sold + ? 
                 WHERE size_id_mongo = ?`,
                [deductFS, item.quantity, item.size_id_mongo]
            );
        }

        // 6. Cập nhật tồn kho thường
        if (deductReg > 0) {
            await connection.query(
                `UPDATE product_inventories 
                 SET stock = stock - ? 
                 WHERE size_id_mongo = ?`,
                [deductReg, item.size_id_mongo]
            );
        }
    }
};

const insertOrderDetailMongoDB = async (mongoOrderId: mongoose.Types.ObjectId, orderIdSql: number, orderItems: OrderItem[], address: Address, note: any): Promise<void> => {
    await OrderDetail.create({
        _id: mongoOrderId,
        order_id_sql: orderIdSql,
        items: orderItems,
        shipping_address: address,
        note: note
    });
};

const insertPayment = async (connection: PoolConnection, orderIdSql: number, orderData: Order): Promise<void> => {
    const query = `
        INSERT INTO payments (order_id, amount, method, status)
        VALUES (?, ?, ?, ?)
    `;
    await connection.query(query, [
        orderIdSql,
        orderData.total,
        orderData.payment_method,
        'pending'
    ]);
};

const removeItemsFromCart = async (userIdSql: number, orderItems: OrderItem[], checkout_source?: string): Promise<void> => {
    if (checkout_source === "cart") {
        const sizeIdsToRemove = orderItems.map(item => item.size_id_mongo);
        await CartItemMongo.updateOne(
            { user_id_sql: userIdSql },
            { 
                $pull: { 
                    items: { 
                        size_id_mongo: { $in: sizeIdsToRemove } 
                    } 
                } 
            }
        );
    }
};

export const createOrder = async (orderPayload: OderPayLoad): Promise<string> => {
    const connection = await mysqlPool.getConnection();
    const mongoOrderId = new mongoose.Types.ObjectId();
    try {
        await connection.beginTransaction();

        const orderIdSql = await insertOrder(connection, orderPayload.order, mongoOrderId);
        await insertOrderItems(connection, orderIdSql, orderPayload.orderItems);
        await updateStockAfterOrder(connection, orderPayload.orderItems);
        await insertOrderDetailMongoDB(mongoOrderId, orderIdSql, orderPayload.orderItems, orderPayload.order.address!, orderPayload.order.note);
        await insertPayment(connection, orderIdSql, orderPayload.order);
        
        await connection.commit();

        try {
            await removeItemsFromCart(orderPayload.order.user_id, orderPayload.orderItems, orderPayload.order.checkout_source);
        } catch (error) {
            console.error("Remove from cart failed:", error);
        }

        return orderIdSql.toString();
    } catch (err) {
        await connection.rollback();
        await OrderDetail.findByIdAndDelete(mongoOrderId);
        console.error("Order Transaction Failed:", err);
        if (err instanceof AppError) throw err;
        throw new AppError("Failed to Order", 500, false);
    } finally {
        connection.release();
    }
};

export const getOrdersByUserId = async (userId: number): Promise<GetOrder[]> => {
    const query = `
        SELECT o.*, p.method as payment_method 
        FROM orders o
        LEFT JOIN payments p ON o.ID = p.order_id
        WHERE o.user_id = ? 
        ORDER BY o.created_at DESC
    `;
    const [ordersRecordset] = await mysqlPool.query<RowDataPacket[]>(query, [userId]);
    
    if (ordersRecordset.length === 0) return []; 

    const orderSqlIds = ordersRecordset.map(order => order.ID);

    const sqlItemsQuery = `
        SELECT ID, order_id, product_id, size_id_mongo 
        FROM order_items 
        WHERE order_id IN (?)
    `;
    const [sqlItems] = await mysqlPool.query<RowDataPacket[]>(sqlItemsQuery, [orderSqlIds]);
    
    const stringOrderSqlIds = orderSqlIds.map((id: number) => id.toString());
    const mongoOrders = await OrderDetail.find({ order_id_sql: { $in: stringOrderSqlIds } }).lean();

    const orderResults: GetOrder[] = ordersRecordset.map(order => {
        const mongoOrder = mongoOrders.find(m => m.order_id_sql === order.ID.toString());
        let mergedItems: IOrderItem[] = [];
        
        if (mongoOrder && mongoOrder.items) {
            mergedItems = mongoOrder.items.map((mItem: any) => {
                const matchedSqlItem = sqlItems.find(sItem => 
                    sItem.order_id === order.ID && 
                    sItem.product_id.toString().toLowerCase() === mItem.product_id_sql.toLowerCase() && 
                    sItem.size_id_mongo === mItem.size_id_mongo 
                );

                return {
                    ...mItem, 
                    order_item_id: matchedSqlItem ? matchedSqlItem.ID : undefined 
                };
            });
        }

        return {
            id: order.ID,
            user_id: order.user_id,
            voucher_id: order.voucher_id,
            total: order.total,
            discount_value: order.discount_value || 0,
            mongo_id: order.mongodb_id,
            payment_method: order.payment_method || 'cod',
            method_order: order.method_order,
            address: {
                name: order.shipping_name,
                phone: order.shipping_phone,
                province: order.shipping_province,
                district: order.shipping_district,
                ward: order.shipping_ward,
                street_address: order.shipping_address,
                full_address_mongo: mongoOrder?.shipping_address 
            },
            status: order.status,
            created_at: order.created_at,
            items: mergedItems,
            note: mongoOrder?.note
        } as GetOrder;
    });

    return orderResults;
};

export const getOrderById = async (orderId: number): Promise<GetOrder | null> => {
    const query = `
        SELECT o.*, p.status as payment_status, p.method as payment_method
        FROM orders o 
        INNER JOIN payments p ON o.id = p.order_id
        WHERE o.ID = ?
    `;
    const [rows] = await mysqlPool.query<RowDataPacket[]>(query, [orderId]);
    
    if (rows.length === 0) {
        return null;
    }
    const order = rows[0];
    const mongoOrder = await OrderDetail.findOne({ order_id_sql: order.ID.toString() }).lean();
    
    return {
        id: order.ID,
        user_id: order.user_id,
        voucher_id: order.voucher_id,
        total: order.total,
        discount_value: order.discount_value || 0,
        mongo_id: order.mongodb_id,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        method_order: order.method_order,
        address: mongoOrder ? mongoOrder?.shipping_address : {},
        status: order.status,
        created_at: order.created_at,
        items: mongoOrder ? mongoOrder.items : [],
        note: mongoOrder ? mongoOrder.note : "Không có ghi chú"
    } as GetOrder;
};

export const cancelOrderById = async (orderId: number): Promise<void> => {
    try {
        const [checkRows] = await mysqlPool.query<RowDataPacket[]>(`SELECT status FROM orders WHERE id = ?`, [orderId]);
        
        if (checkRows.length === 0) {
            throw new AppError("Order not found", 404);
        }
        
        const orderStatus = checkRows[0].status;
        if (orderStatus !== 'pending') {
            throw new AppError("Only orders with pending payment can be cancelled", 400);
        }
        
        await mysqlPool.query(`UPDATE orders SET status = 'cancelled' WHERE id = ?`, [orderId]);

    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to cancel order", 500);
    }
};

export const changeStatusOrder = async (order_id: number, status: string): Promise<void> => {
    try {
        const [checkRows] = await mysqlPool.query<RowDataPacket[]>(`SELECT status FROM orders WHERE id = ?`, [order_id]);
        
        if (checkRows.length === 0) {
            throw new AppError("Order not found", 404);
        }
        
        await mysqlPool.query(`UPDATE orders SET status = ? WHERE id = ?`, [status, order_id]);
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to update status order", 500);
    }
};

export const getOrderOfSystem = async (method_order: string) : Promise<GetOrder[]> => {
    try {
        const query = `
            SELECT o.*, u.name AS user_name_buyer
            FROM orders o
            INNER JOIN users u ON o.user_id = u.ID
            WHERE o.method_order = ?
            ORDER BY o.created_at DESC
        `;
        const [ordersRecordset] = await mysqlPool.query<RowDataPacket[]>(query, [method_order]);
        
        if (ordersRecordset.length === 0) return [];
        
        const orderSqlIds = ordersRecordset.map(order => order.ID);
        const stringOrderSqlIds = orderSqlIds.map((id: number) => id.toString());
        const mongoOrders = await OrderDetail.find({ order_id_sql: { $in: stringOrderSqlIds } }).lean();

        const orderResults: GetOrder[] = ordersRecordset.map(order => {
            const mongoOrder = mongoOrders.find(m => m.order_id_sql === order.ID.toString());
            return {
                id: order.ID,
                user_id: order.user_id,
                voucher_id: order.voucher_id,
                total: order.total,
                discount_value: order.discount_value,
                mongo_id: order.mongodb_id,
                payment_method: order.payment_method,
                user_name_buyer: order.user_name_buyer,
                address: order.shipping_address,
                status: order.status,
                created_at: order.created_at,
                items: mongoOrder ? mongoOrder.items : [],
                note: mongoOrder ? mongoOrder.note : "Không có ghi chú"
            } as GetOrder;
        });
        
        return orderResults;

    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to get order of system", 500);
    }
};

export const statisticalOrder = async (): Promise<any[]> => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(`SELECT status FROM orders`);
        return rows;
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.log(err);
        throw new AppError('Failed to get statistical order', 500);
    }
};

export const getDateRange = (type: string): {
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
} => {
    let currentStart = '';
    let previousStart = '';
    let currentEnd = 'NOW()';
    let previousEnd = '';

    switch (type.toLowerCase()) {
        case 'hôm nay':
            currentStart = 'CURDATE()';
            previousStart = 'DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
            previousEnd = 'CURDATE()';
            break;
        case 'tuần này':
            currentStart = 'DATE(DATE_SUB(NOW(), INTERVAL WEEKDAY(NOW()) DAY))';
            previousStart = 'DATE_SUB(DATE(DATE_SUB(NOW(), INTERVAL WEEKDAY(NOW()) DAY)), INTERVAL 1 WEEK)';
            previousEnd = 'DATE(DATE_SUB(NOW(), INTERVAL WEEKDAY(NOW()) DAY))';
            break;
        case 'tháng này':
            currentStart = "DATE_FORMAT(NOW() ,'%Y-%m-01')";
            previousStart = "DATE_SUB(DATE_FORMAT(NOW() ,'%Y-%m-01'), INTERVAL 1 MONTH)";
            previousEnd = "DATE_FORMAT(NOW() ,'%Y-%m-01')";
            break;
        case 'năm nay':
            currentStart = "DATE_FORMAT(NOW() ,'%Y-01-01')";
            previousStart = "DATE_SUB(DATE_FORMAT(NOW() ,'%Y-01-01'), INTERVAL 1 YEAR)";
            previousEnd = "DATE_FORMAT(NOW() ,'%Y-01-01')";
            break;
        case 'từ trước tới nay':
            currentStart = "'1900-01-01'";
            previousStart = "'1900-01-01'";
            previousEnd = "'1900-01-01'";
            break;
        default:
            return getDateRange('hôm nay');
    }
    return { currentStart, currentEnd, previousStart, previousEnd };
};

export const getRevenueOrderComparisonService = async (type: string): Promise<RevenueOrder> => {
    const { currentStart, currentEnd, previousStart, previousEnd } = getDateRange(type); 
    const isAllTime = type.toLowerCase() === 'từ trước tới nay';

    try {
        const currentQuery = `
            SELECT 
                IFNULL(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) AS revenue,
                COUNT(CASE WHEN o.status != 'cancelled' AND p.method = 'online' THEN 1 ELSE NULL END) AS total_order_online,
                COUNT(CASE WHEN o.status != 'cancelled' AND p.method = 'offline' THEN 1 ELSE NULL END) AS total_order_offline,
                COUNT(o.ID) AS total_orders
            FROM orders o
            JOIN payments p ON o.ID = p.order_id
            WHERE o.created_at >= ${currentStart} AND o.created_at < ${currentEnd}
        `;

        const [currentResult] = await mysqlPool.query<RowDataPacket[]>(currentQuery);
        const currentData = currentResult[0];

        let previousTotalOrders = 0;
        let percentageChange = 0;

        if (!isAllTime) {
            const previousQuery = `
                SELECT COUNT(ID) AS previous_total_orders
                FROM orders
                WHERE status != 'cancelled'
                  AND created_at >= ${previousStart} AND created_at < ${previousEnd}
            `;
            const [previousResult] = await mysqlPool.query<RowDataPacket[]>(previousQuery);
            previousTotalOrders = Number(previousResult[0].previous_total_orders) || 0;
            
            const currentTotalOrders = Number(currentData.total_orders) || 0;

            if (previousTotalOrders === 0) {
                percentageChange = currentTotalOrders > 0 ? 100 : 0;
            } else {
                percentageChange = ((currentTotalOrders - previousTotalOrders) / previousTotalOrders) * 100;
            }
        }

        return {
            revenue: parseFloat(Number(currentData.revenue).toFixed(2)),
            total_order_online: Number(currentData.total_order_online),
            total_order_offline: Number(currentData.total_order_offline),
            percentageChange: parseFloat(percentageChange.toFixed(2))
        };

    } catch (error) {
        console.error("Error in getRevenueOrderComparison:", error);
        throw new AppError("Failed to get revenue and order comparison data", 500);
    }
};

export const getTotalOrderComparisonService = async (type: string): Promise<IKpiResponse> => {
    const { currentStart, currentEnd, previousStart, previousEnd } = getDateRange(type);
    const isAllTime = type.toLowerCase() === 'từ trước tới nay';

    const currentQuery = `
        SELECT COUNT(ID) AS total_orders
        FROM orders
        WHERE status != 'cancelled'
          AND created_at >= ${currentStart} AND created_at < ${currentEnd}
    `;
    const [currentResult] = await mysqlPool.query<RowDataPacket[]>(currentQuery);
    const currentTotalOrders = currentResult[0]?.total_orders || 0;

    let previousTotalOrders = 0;
    if (!isAllTime) {
        const previousQuery = `
            SELECT COUNT(ID) AS previous_total_orders
            FROM orders
            WHERE status != 'cancelled'
              AND created_at >= ${previousStart} AND created_at < ${previousEnd}
        `;
        const [previousResult] = await mysqlPool.query<RowDataPacket[]>(previousQuery);
        previousTotalOrders = previousResult[0]?.previous_total_orders || 0;
    }
    return { total: currentTotalOrders, previousTotal: previousTotalOrders };
};

export const getTotalOrderCancelledService = async (type: string): Promise<IKpiResponse> => {
    const { currentStart, currentEnd, previousStart, previousEnd } = getDateRange(type);
    const isAllTime = type.toLowerCase() === 'từ trước tới nay';

    const currentQuery = `
        SELECT COUNT(ID) AS total_orders
        FROM orders
        WHERE status = 'cancelled'
          AND created_at >= ${currentStart} AND created_at < ${currentEnd}
    `;
    const [currentResult] = await mysqlPool.query<RowDataPacket[]>(currentQuery);
    const currentTotalOrders = currentResult[0]?.total_orders || 0;

    let previousTotalOrders = 0;
    if (!isAllTime) {
        const previousQuery = `
            SELECT COUNT(ID) AS previous_total_orders
            FROM orders
            WHERE status = 'cancelled'
              AND created_at >= ${previousStart} AND created_at < ${previousEnd}
        `;
        const [previousResult] = await mysqlPool.query<RowDataPacket[]>(previousQuery);
        previousTotalOrders = previousResult[0]?.previous_total_orders || 0;
    }
    return { total: currentTotalOrders, previousTotal: previousTotalOrders };
};

export const getTopOrderService = async (top: number) => {
    const query = `
        SELECT o.*, u.name AS user_name_buyer
        FROM orders o
        INNER JOIN users u ON o.user_id = u.ID
        ORDER BY o.created_at DESC
        LIMIT ?
    `;
    // Lưu ý: LIMIT trong query MySQL2 yêu cầu số phải được bind cẩn thận (với kiểu number)
    const [rows] = await mysqlPool.query<RowDataPacket[]>(query, [top]);

    const orderSqlIds = rows.map(order => order.ID);
    const stringOrderSqlIds = orderSqlIds.map((id: number) => id.toString());

    const mongoOrders = await OrderDetail.find({ order_id_sql: { $in: stringOrderSqlIds } }).lean();

    return rows.map(order => {
        const mongoOrder = mongoOrders.find(mo => mo.order_id_sql === order.ID.toString());
        return {
            id: order.ID,
            user_id: order.user_id,
            voucher_id: order.voucher_id,
            total: order.total,
            discount_value: order.discount_value,
            mongo_id: order.mongodb_id,
            payment_method: order.payment_method,
            user_name_buyer: order.user_name_buyer,
            address: mongoOrder ? mongoOrder.shipping_address : {},
            status: order.status,
            created_at: order.created_at,
            items: mongoOrder ? mongoOrder.items : [],
            note: mongoOrder ? mongoOrder.note : "Không có ghi chú"
        } as GetOrder;
    });
};

export const getRevenueByYearService = async (year: number): Promise<IRevenueYearResponse> => {
    const query = `
        SELECT MONTH(created_at) AS month, SUM(total) AS revenue
        FROM orders 
        WHERE status != 'cancelled' AND YEAR(created_at) = ?
        GROUP BY MONTH(created_at) 
        ORDER BY month
    `;
    const [rows] = await mysqlPool.query<RowDataPacket[]>(query, [year]);

    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
        const monthData = rows.find(r => r.month === i + 1);
        return { month: i + 1, revenue: monthData ? Number(monthData.revenue) : 0 };
    });
    
    return { year, monthlyRevenue };
};