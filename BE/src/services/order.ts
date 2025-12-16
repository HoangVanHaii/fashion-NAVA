import { ConnectionPool, Transaction } from "mssql";
import { GetOrder, IKpiResponse, IRevenueMonth, IRevenueYearResponse, OderPayLoad, Order, OrderItem, RevenueOrder } from "../interfaces/order";
import { v4 as uuidv4 } from 'uuid';
import { getProductSizesBySizeId } from "./product";
import mongoose from "mongoose";
import { OrderDetail } from "../models/order.mongo";
import { AppError } from "../utils/appError";
import { Address } from "../interfaces/address";
import CartItemMongo  from "../models/cart.mongo";
import { getBranchPool } from "../config/database";
const insertOrder = async (tranRequest: Transaction, orderIdSql: string, orderData: Order, mongoOrderId: mongoose.Types.ObjectId): Promise<void> => {
    const query = `INSERT INTO orders (ID, user_id, total, discount_value, voucher_id, mongodb_id, method_order, status)
    VALUES (@orderId, @user_id, @total, @discount_value, @voucher_id, @mongodb_id, @method_order, @status)`;
    await tranRequest.request()
        .input('orderId', orderIdSql)
        .input('user_id', orderData.user_id)
        .input('total', orderData.total)
        .input('discount_value', orderData.discount_value)
        .input('voucher_id', orderData.voucher_id || null)
        .input('mongodb_id', mongoOrderId.toString())
        .input('method_order', orderData.method_order || 'online')
        .input('status', orderData.status || 'pending')
        .query(query);
}
const insertOrderItems = async (tranRequest: Transaction, orderIdSql: string, orderItems: any[]): Promise<void> => {
    const query = `INSERT INTO order_items (order_id, product_id, size_id_mongo, quantity, price)
    VALUES (@order_id, @product_id, @size_id_mongo, @quantity, @price)`;
    for (const item of orderItems) {
        await tranRequest.request().input('order_id', orderIdSql)
            .input('product_id', item.product_id_sql)
            .input('size_id_mongo', item.size_id_mongo)
            .input('quantity', item.quantity)
            .input('price', item.price)
            .query(query);
    }
}
export const updateStockAfterOrder = async (
    tranRequest: Transaction,
    orderItems: OrderItem[],
    branch_id: string
): Promise<void> => {

    for (const item of orderItems) {
        const combinedUpdateQuery = `
            DECLARE 
                @QuantityNeeded INT = @quantity,
                @FSCurrentStock INT = 0,
                @RegCurrentStock INT = 0,
                @DeductFS INT = 0,
                @DeductReg INT = 0;

            -- Lấy tồn flash sale và lock hàng
            SELECT @FSCurrentStock = stock
            FROM flash_sale_items WITH (UPDLOCK, ROWLOCK)
            WHERE size_id_mongo = @size_id
            AND branch_id = @branch_id;

            -- Lấy tồn kho thường
            SELECT @RegCurrentStock = stock
            FROM branch_inventories WITH (UPDLOCK, ROWLOCK)
            WHERE size_id_mongo = @size_id
            AND branch_id = @branch_id;

            -- Kiểm tra tổng tồn đủ hay không
            IF (@FSCurrentStock + @RegCurrentStock < @QuantityNeeded)
            BEGIN
                THROW 50001, 'NOT_ENOUGH_STOCK', 1;
            END;

            -- Tính số lượng trừ Flash sale
            SET @DeductFS = CASE
                WHEN @FSCurrentStock >= @QuantityNeeded THEN @QuantityNeeded
                ELSE @FSCurrentStock
            END;

            SET @DeductReg = @QuantityNeeded - @DeductFS;

            -- Trừ flash sale
            IF @DeductFS > 0
            BEGIN
                UPDATE flash_sale_items
                SET stock = stock - @DeductFS
                WHERE size_id_mongo = @size_id
                AND branch_id = @branch_id;
            END;

            -- Trừ kho thường
            IF @DeductReg > 0
            BEGIN
                UPDATE branch_inventories
                SET stock = stock - @DeductReg
                WHERE size_id_mongo = @size_id
                AND branch_id = @branch_id;
            END;
        `;

        await tranRequest.request()
            .input("quantity", item.quantity)
            .input("size_id", item.size_id_mongo)
            .input("branch_id", branch_id)
            .query(combinedUpdateQuery);
    }
};

const insertOrderDetailMongoDB = async (mongoOrderId: mongoose.Types.ObjectId, orderIdSql: string, orderItems: OrderItem[], address: Address, note: any): Promise<void> => {
    await OrderDetail.create({
        _id: mongoOrderId,
        order_id_sql: orderIdSql,
        items: orderItems,
        shipping_address: address,
        note: note
    });
}
const insertPayment = async (tranRequest: Transaction, orderIdSql: string, orderData: Order): Promise<void> => {
    const query = `INSERT INTO payments (order_id, amount, method, status)
    VALUES (@order_id, @amount, @payment_method, @status)`;
    await tranRequest.request().input('order_id', orderIdSql)
        .input('amount', orderData.total)
        .input('payment_method', orderData.payment_method)
        .input('status', 'pending')
        .query(query);
}

const removeItemsFromCart = async (userIdSql: string, orderItems: OrderItem[],checkout_source?:string): Promise<void> => {
    if(checkout_source==="cart"){
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

export const createOrder = async (orderPayload: OderPayLoad, dbBranch: ConnectionPool, branch_id: string): Promise<string> => {
    const tranRequest: Transaction = dbBranch.transaction();
    const orderIdSql = uuidv4();
    const mongoOrderId = new mongoose.Types.ObjectId();
    try {
        await tranRequest.begin();
        await insertOrder(tranRequest, orderIdSql, orderPayload.order, mongoOrderId);
        await insertOrderItems(tranRequest, orderIdSql, orderPayload.orderItems);
        await updateStockAfterOrder(tranRequest, orderPayload.orderItems, branch_id);
        await insertOrderDetailMongoDB(mongoOrderId, orderIdSql ,orderPayload.orderItems, orderPayload.order.address!, orderPayload.order.note);
        await insertPayment(tranRequest, orderIdSql, orderPayload.order);
        await tranRequest.commit();

        try {
            await removeItemsFromCart(orderPayload.order.user_id, orderPayload.orderItems,orderPayload.order.checkout_source);
        } catch (error) {
            console.error(error);
        }

        return orderIdSql as string;
    } catch (err) {
        console.error(" LỖI SQL GỐC (NGUYÊN NHÂN 500):", err);
        await tranRequest.rollback();
        await OrderDetail.findByIdAndDelete(mongoOrderId);

        console.error(err);
        if (err instanceof AppError) throw err;

        throw new AppError("Failed to Order", 500, false);
    }
}

export const getOrdersByUserId = async (userId: string, dbBranch: ConnectionPool): Promise<GetOrder[]> => {
    const query = `
        SELECT o.*, p.method as payment_method 
        FROM orders o
        LEFT JOIN payments p ON o.ID = p.order_id
        WHERE o.user_id = @user_id 
        ORDER BY o.created_at DESC
    `;
    const result = await dbBranch.request()
        .input('user_id', userId)
        .query(query);
    
    const ordersRecordset = result.recordset;
    if (ordersRecordset.length === 0) return []; 

    const orderSqlIds = ordersRecordset.map(order => order.ID);

    const sqlItemsQuery = `
        SELECT ID, order_id, product_id, size_id_mongo 
        FROM order_items 
        WHERE order_id IN (${orderSqlIds.map(id => `'${id}'`).join(',')})
    `;
    const sqlItemsResult = await dbBranch.request().query(sqlItemsQuery);
    const sqlItems = sqlItemsResult.recordset; 
    const lowerCaseOrderSqlIds = orderSqlIds.map((id: string) => id.toString().toLowerCase());
    const mongoOrders = await OrderDetail.find({ order_id_sql: { $in: lowerCaseOrderSqlIds } }).lean();
    const orderResuts: GetOrder[] = ordersRecordset.map(order => {
        const mongoOrder = mongoOrders.find(m => m.order_id_sql === order.ID.toString().toLowerCase());
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
                street_address: order.shipping_street,
                full_address_mongo: mongoOrder?.shipping_address 
            },
            
            status: order.status,
            created_at: order.created_at,
            items: mergedItems,
            note: mongoOrder?.note
        };
    });

    return orderResuts;
}
export const getOrderById = async (orderId: string, dbBranch: ConnectionPool): Promise<GetOrder | null> => {
    const query = `SELECT o.*, p.status as payment_status, p.method as payment_method
             FROM orders o INNER JOIN payments p ON o.id = p.order_id
            WHERE o.ID = @order_id`;
    const result = await dbBranch.request()
        .input('order_id', orderId)
        .query(query);
    if (result.recordset.length === 0) {
        return null;
    }
    const order = result.recordset[0];
    const mongoOrder = await OrderDetail.findOne({ order_id_sql: order.ID.toString().toLowerCase() }).lean();
    const orderDetail: GetOrder = {
        id: order.ID,
        user_id: order.user_id,
        voucher_id: order.voucher_id,
        total: order.total,
        discount_value: order.discount_Value || 0,
        mongo_id: order.mongodb_id,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        method_order: order.method_order,
        address: mongoOrder ? mongoOrder?.shipping_address : {},
        status: order.status,
        created_at: order.created_at,
        items: mongoOrder ? mongoOrder.items : [],
        note: mongoOrder ? mongoOrder.note : "Không có ghi chú"
    };
    return orderDetail;
}
export const cancelOrderById = async (orderId: string, dbBranch: ConnectionPool): Promise<void> => {
    try {
        const queryCheck = `SELECT status FROM orders WHERE id = @order_id`;
        const resultCheck = await dbBranch.request()
            .input('order_id', orderId)
            .query(queryCheck);
        if (resultCheck.recordset.length === 0) {
            throw new AppError("Order not found", 404);
        }
        const orderStatus = resultCheck.recordset[0].status;
        if (orderStatus !== 'pending') {
            throw new AppError("Only orders with pending payment can be cancelled", 400);
        }
        // console.log(queryCheck);
        const query = `UPDATE orders SET status = 'cancelled' WHERE id = @order_id`;
        await dbBranch.request()
            .input('order_id', orderId)
            .query(query);

    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }   
        console.error(error);
        throw new AppError("Failed to cancel order", 500);
    }
   
}
export const changeStatusOrder = async (dbBranch: ConnectionPool, order_id: string, status: string) => {
    try {
        const queryCheck = `SELECT status FROM orders WHERE id = @order_id`;
        const resultCheck = await dbBranch.request()
            .input('order_id', order_id)
            .query(queryCheck);
        if (resultCheck.recordset.length === 0) {
            throw new AppError("Order not found", 404);
        }
        const orderStatus = resultCheck.recordset[0].status;
        // console.log(queryCheck);
        const query = `UPDATE orders SET status = @status WHERE id = @order_id`;
        await dbBranch.request()
            .input('status', status)
            .input('order_id', order_id)
            .query(query);

    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error(error);
        throw new AppError("Failed to cancel order", 500);
    }

}
export const getOrderOfBranch = async (dbBranch: ConnectionPool, method_order: string) : Promise<GetOrder[]> => {
    try {
        const query = `SELECT 
                o.*, 
                u.name AS user_name_buyer
            FROM orders o
            INNER JOIN users u ON o.user_id = u.ID
            WHERE o.method_order = @method_order
        `;
        const result = await dbBranch.request().input('method_order', method_order).query(query);
        const orderSqlIds = result.recordset.map(order => order.ID);
        const lowerCaseOrderSqlIds = orderSqlIds.map((id: string) => id.toString().toLowerCase());
        const mongoOrders = await OrderDetail.find({ order_id_sql: { $in: lowerCaseOrderSqlIds } }).lean();
        // console.log("aa", mongoOrders)
        const orders = result.recordset.map(order => {
            const mongoOrder = mongoOrders.find(mongoOrder => mongoOrder.order_id_sql === order.ID.toString().toLowerCase());
            return {
                ...order,
                items: mongoOrder ? mongoOrder.items : [],
                shipping_address: mongoOrder ? mongoOrder.shipping_address : {},
                note: mongoOrder ? mongoOrder.note : "Không có ghi chú"
            };
        });
        // console.log("1", orders)
        const orderResuts: GetOrder[] = orders.map(order => ({
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
            items: order.items,
            note: order.note
        }));
        return orderResuts;

    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error(error);
        throw new AppError("Failed to get order of branch", 500);
    }
}

const fetchOrdersFromPool = async (pool: ConnectionPool, method_order: string): Promise<GetOrder[]> => {
    if (!pool || !pool.connected) {
        console.warn("Pool is not connected or not found");
        return [];
    }

    // Query SQL Server
    const query = `
        SELECT 
            o.*, 
            u.name AS user_name_buyer
        FROM orders o
        INNER JOIN users u ON o.user_id = u.ID
        WHERE o.method_order = @method_order
    `;

    const result = await pool.request().input('method_order', method_order).query(query);

    if (result.recordset.length === 0) return [];

    // Chuẩn bị ID để query Mongo
    const orderSqlIds = result.recordset.map(order => order.ID);
    const lowerCaseOrderSqlIds = orderSqlIds.map((id: any) => id.toString().toLowerCase());

    // Query MongoDB (OrderDetail)
    const mongoOrders = await OrderDetail.find({ order_id_sql: { $in: lowerCaseOrderSqlIds } }).lean();

    // Merge Data
    const orders = result.recordset.map(order => {
        const mongoOrder = mongoOrders.find(mo => mo.order_id_sql === order.ID.toString().toLowerCase());
        return {
            id: order.ID,
            user_id: order.user_id,
            voucher_id: order.voucher_id,
            total: order.total,
            discount_value: order.discount_value,
            mongo_id: order.mongodb_id,
            payment_method: order.payment_method,
            user_name_buyer: order.user_name_buyer,
            // Data từ Mongo
            address: mongoOrder ? mongoOrder.shipping_address : {},
            status: order.status,
            created_at: order.created_at,
            items: mongoOrder ? mongoOrder.items : [],
            note: mongoOrder ? mongoOrder.note : "Không có ghi chú"
        };
    });

    return orders;
};

// 2. Main Service Function: Xử lý logic Branch Code (CT vs Single Branch)
export const getOrderOfTypeBranchService = async (branch_code: string, method_order: string): Promise<GetOrder[]> => {
    try {
        // CASE 1: Toàn hệ thống (CT) -> Merge data
        if (branch_code === 'CT') {
            const branches = ['HN', 'DN', 'HCM'];

            // Chạy song song 3 request
            const promises = branches.map(async (code) => {
                const pool = getBranchPool(code); // hoặc getDbPool(code) tùy tên hàm bạn import

                // 1. Kiểm tra kết nối
                if (!pool || !pool.connected) {
                    console.warn(`[WARNING] Branch ${code} is disconnected or pool not found. Skipping...`);
                    // Trả về mảng rỗng để không ảnh hưởng chi nhánh khác
                    return [];
                }

                // 2. Thử lấy dữ liệu, nếu query lỗi cũng catch lại để không sập app
                try {
                    return await fetchOrdersFromPool(pool, method_order);
                } catch (err) {
                    console.error(`[ERROR] Failed to fetch data from branch ${code}:`, err);
                    return []; // Trả về mảng rỗng nếu query lỗi
                }
            });

            const results = await Promise.all(promises);

            // results lúc này là mảng 2 chiều: [[...ordersHN], [], [...ordersHCM]]
            // Dùng flat() sẽ tự động loại bỏ các mảng rỗng và gộp thành 1 mảng duy nhất
            const allOrders = results.flat().sort((a, b) => {
                const timeA = new Date(a.created_at ?? 0).getTime();
                const timeB = new Date(b.created_at ?? 0).getTime();
                return timeB - timeA; // Mới nhất lên đầu
            });

            return allOrders;
        }

        // CASE 2: Chi nhánh lẻ (HN, DN, HCM)
        else {
            const pool = getBranchPool(branch_code);

            // Nếu chọn cụ thể 1 chi nhánh mà nó mất kết nối thì PHẢI báo lỗi cho người dùng biết
            if (!pool || !pool.connected) {
                return [];
            }

            const orders = await fetchOrdersFromPool(pool, method_order);
            return orders.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
        }

    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("getOrderOfTypeBranchService Error:", error);
        throw new AppError("Failed to get order of type branch", 500);
    }
};
export const statisticalOrder = async (dbBranch: ConnectionPool): Promise<any[]> => {
    try {
        const query = `SELECT status FROM orders`;
        const result = await dbBranch.request().query(query);
        
        return result.recordset;
    } catch (err) {
        if (err instanceof AppError) {
            throw err;
        }
        console.log(err);
        throw new AppError('Failed to get statistical order', 500);
    }
}

export const getRevenueOfBranch = async (dbBranch: ConnectionPool): Promise<number> => {
    try {
        const query = `SELECT Sum(total) as total_aoumt FROM orders WHERE status = 'completed' `;
        const result = await dbBranch.request().query(query);

        return result.recordset[0].total_aoumt || 0;
    } catch (err) {
        if (err instanceof AppError) {
            throw err;
        }
        console.log(err);
        throw new AppError('Failed to get order by status', 500);
    }
}

export const getDateRange = (type: string): { currentStart: string, currentEnd: string, previousStart: string, previousEnd: string } => {
    const today = 'CAST(GETDATE() AS DATE)';
    let currentStart = '';
    let previousStart = '';
    const currentEnd = 'GETDATE()';

    switch (type.toLowerCase()) {
        case 'hôm nay':
            currentStart = today; // 00:00:00 hôm nay
            previousStart = `DATEADD(DAY, -1, ${today})`; // 00:00:00 hôm qua
            return { currentStart, currentEnd, previousStart, previousEnd: today };
        case 'tuần này':
            return {
                currentStart: `DATEADD(DAY, -((DATEPART(WEEKDAY, GETDATE()) + @@DATEFIRST - 2) % 7), CAST(GETDATE() AS DATE))`,
                currentEnd: `GETDATE()`,
                previousStart: `DATEADD(WEEK, -1, DATEADD(DAY, -((DATEPART(WEEKDAY, GETDATE()) + @@DATEFIRST - 2) % 7), CAST(GETDATE() AS DATE)))`,
                previousEnd: `DATEADD(DAY, -((DATEPART(WEEKDAY, GETDATE()) + @@DATEFIRST - 2) % 7), CAST(GETDATE() AS DATE))`
            };
              
            
        case 'tháng này':
            currentStart = `DATEADD(mm, DATEDIFF(mm, 0, GETDATE()), 0)`;
            previousStart = `DATEADD(mm, DATEDIFF(mm, 0, GETDATE()) - 1, 0)`;
            return { currentStart, currentEnd, previousStart, previousEnd: currentStart };
        case 'năm nay':
            return {
                currentStart: `DATEFROMPARTS(YEAR(GETDATE()), 1, 1)`,
                currentEnd: `GETDATE()`,
                previousStart: `DATEFROMPARTS(YEAR(GETDATE()) - 1, 1, 1)`,
                previousEnd: `DATEFROMPARTS(YEAR(GETDATE()), 1, 1)`
            };
              
              
        case 'từ trước tới nay':
            // Không có khoảng thời gian so sánh, chỉ lấy tổng
            currentStart = `'1900-01-01'`;
            previousStart = `'1900-01-01'`; // Giả lập để không lỗi cú pháp
            return { currentStart, currentEnd, previousStart, previousEnd: currentStart };

        default:
            // Mặc định về hôm nay nếu type không hợp lệ
            return getDateRange('hôm nay');
    }
}


export const getRevenueOrderComparison = async (dbBranch: ConnectionPool, type: string): Promise<RevenueOrder> => {
    const { currentStart, currentEnd, previousStart, previousEnd } = getDateRange(type); 

    const isAllTime = type.toLowerCase() === 'từ trước tới nay';

    try {
        // --- 1. TRUY VẤN DỮ LIỆU HIỆN TẠI (CURRENT) ---
        // Lấy Tổng doanh thu, Đơn Online, Đơn Offline trong khoảng thời gian hiện tại
        const currentQuery = `
            SELECT 
                SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END) AS revenue,
                COUNT(CASE WHEN status != 'cancelled' AND method_order = 'online' THEN 1 ELSE NULL END) AS total_order_online,
                COUNT(CASE WHEN status != 'cancelled' AND method_order = 'offline' THEN 1 ELSE NULL END) AS total_order_offline,
                COUNT(ID) AS total_orders -- Tổng số đơn hiện tại
            FROM orders
            WHERE created_at >= ${currentStart} AND created_at < ${currentEnd};
        `;

        const currentResult = await dbBranch.request().query(currentQuery);
        const currentData = currentResult.recordset[0];

        // --- 2. TRUY VẤN DỮ LIỆU SO SÁNH (PREVIOUS) ---
        let previousTotalOrders = 0;
        let percentageChange = 0;

        if (!isAllTime) {
            // Lấy Tổng số đơn trong khoảng thời gian so sánh
            const previousQuery = `
                SELECT 
                    COUNT(ID) AS previous_total_orders
                FROM orders
                WHERE status != 'cancelled'
                  AND created_at >= ${previousStart} AND created_at < ${previousEnd};
            `;

            const previousResult = await dbBranch.request().query(previousQuery);
            previousTotalOrders = previousResult.recordset[0].previous_total_orders as number;
            // phần trăm
            const currentTotalOrders = currentData.total_orders as number;

            if (previousTotalOrders === 0) {
                percentageChange = currentTotalOrders > 0 ? 100 : 0;
            } else {
                percentageChange = ((currentTotalOrders - previousTotalOrders) / previousTotalOrders) * 100;
            }
        }

        const revenueOrder: RevenueOrder = {
            revenue: currentData.revenue ? parseFloat(currentData.revenue.toFixed(2)) : 0,
            total_order_online: currentData.total_order_online as number,
            total_order_offline: currentData.total_order_offline as number,
            percentageChange: parseFloat(percentageChange.toFixed(2))
        };

        return revenueOrder;

    } catch (error) {
        if (error instanceof AppError) {
            console.error("Error in getRevenueOrderComparison:", error);
            throw error;
        }
        throw new AppError("Failed to get revenue and order comparison data", 500);
    }
};

const getRevenueOrderComparisonFromPool = async (dbBranch: ConnectionPool, type: string): Promise<IKpiResponse> => {
    const { currentStart, currentEnd, previousStart, previousEnd } = getDateRange(type);
    const isAllTime = type.toLowerCase() === 'từ trước tới nay';

    // 1. DOANH THU HIỆN TẠI
    const currentQuery = `
        SELECT ISNULL(SUM(total), 0) AS total_revenue
        FROM orders
        WHERE status != 'cancelled'
          AND created_at >= ${currentStart} AND created_at < ${currentEnd};
    `;
    const currentResult = await dbBranch.request().query(currentQuery);
    const currentRevenue = currentResult.recordset[0]?.total_revenue || 0;

    // 2. DOANH THU KỲ TRƯỚC
    let previousRevenue = 0;
    if (!isAllTime) {
        const previousQuery = `
            SELECT ISNULL(SUM(total), 0) AS previous_total_revenue
            FROM orders
            WHERE status != 'cancelled'
              AND created_at >= ${previousStart} AND created_at < ${previousEnd};
        `;
        const previousResult = await dbBranch.request().query(previousQuery);
        previousRevenue = previousResult.recordset[0]?.previous_total_revenue || 0;
    }

    return { total: currentRevenue, previousTotal: previousRevenue };
};

const getTotalOrderComparisonFromPool = async (dbBranch: ConnectionPool, type: string): Promise<IKpiResponse> => {
    const { currentStart, currentEnd, previousStart, previousEnd } = getDateRange(type);
    const isAllTime = type.toLowerCase() === 'từ trước tới nay';

    // 1. DỮ LIỆU HIỆN TẠI
    const currentQuery = `
        SELECT COUNT(ID) AS total_orders
        FROM orders
        WHERE status != 'cancelled'
          AND created_at >= ${currentStart} AND created_at < ${currentEnd};
    `;
    const currentResult = await dbBranch.request().query(currentQuery);
    const currentTotalOrders = currentResult.recordset[0]?.total_orders || 0;

    // 2. DỮ LIỆU SO SÁNH
    let previousTotalOrders = 0;
    if (!isAllTime) {
        const previousQuery = `
            SELECT COUNT(ID) AS previous_total_orders
            FROM orders
            WHERE status != 'cancelled'
              AND created_at >= ${previousStart} AND created_at < ${previousEnd};
        `;
        const previousResult = await dbBranch.request().query(previousQuery);
        previousTotalOrders = previousResult.recordset[0]?.previous_total_orders || 0;
    }
    return { total: currentTotalOrders, previousTotal: previousTotalOrders };
};

const getTotalOrderCancelledFromPool = async (dbBranch: ConnectionPool, type: string): Promise<IKpiResponse> => {
    const { currentStart, currentEnd, previousStart, previousEnd } = getDateRange(type);
    const isAllTime = type.toLowerCase() === 'từ trước tới nay';

    // 1. DỮ LIỆU HIỆN TẠI
    const currentQuery = `
        SELECT COUNT(ID) AS total_orders
        FROM orders
        WHERE status = 'cancelled'
          AND created_at >= ${currentStart} AND created_at < ${currentEnd};
    `;
    const currentResult = await dbBranch.request().query(currentQuery);
    const currentTotalOrders = currentResult.recordset[0]?.total_orders || 0;

    // 2. DỮ LIỆU SO SÁNH
    let previousTotalOrders = 0;
    if (!isAllTime) {
        const previousQuery = `
            SELECT COUNT(ID) AS previous_total_orders
            FROM orders
            WHERE status = 'cancelled'
              AND created_at >= ${previousStart} AND created_at < ${previousEnd};
        `;
        const previousResult = await dbBranch.request().query(previousQuery);
        previousTotalOrders = previousResult.recordset[0]?.previous_total_orders || 0;
    }
    return { total: currentTotalOrders, previousTotal: previousTotalOrders };
};

const getTopOrderFromPool = async (dbBranch: ConnectionPool, top: number) => {
    const query = `
        SELECT TOP (@top)
            o.*, 
            u.name AS user_name_buyer
        FROM orders o
        INNER JOIN users u ON o.user_id = u.ID
        ORDER BY o.created_at DESC
    `;
    const result = await dbBranch.request().input('top', top).query(query);

    const orderSqlIds = result.recordset.map(order => order.ID);
    const lowerCaseOrderSqlIds = orderSqlIds.map((id: any) => id.toString().toLowerCase());

    const mongoOrders = await OrderDetail.find({ order_id_sql: { $in: lowerCaseOrderSqlIds } }).lean();

    const orders = result.recordset.map(order => {
        const mongoOrder = mongoOrders.find(mongoOrder => mongoOrder.order_id_sql === order.ID.toString().toLowerCase());
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
        };
    });
    // Map về đúng kiểu GetOrder nếu cần thiết, ở đây return luôn
    return orders;
};

const getRevenueByYearFromPool = async (dbBranch: ConnectionPool, year: number): Promise<IRevenueYearResponse> => {
    const result = await dbBranch.request().input('year', year).query(`
        SELECT MONTH(created_at) AS month, SUM(total) AS revenue
        FROM orders WHERE status != 'cancelled' AND YEAR(created_at) = @year
        GROUP BY MONTH(created_at) ORDER BY month
    `);

    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
        const monthData = result.recordset.find(r => r.month === i + 1);
        return { month: i + 1, revenue: monthData?.revenue || 0 };
    });
    return { year, monthlyRevenue };
};


// ==========================================
// 2. MAIN SERVICE FUNCTIONS (Exported)
// ==========================================

// 1. Service: Daily Revenue Comparison (KPI Doanh thu)
export const getRevenueOrderComparisonService = async (branch_code: string, type: string) => {
    if (branch_code === 'CT') {
        const branches = ['HN', 'DN', 'HCM'];
        const promises = branches.map(async (code) => {
            const pool = getBranchPool(code);
            if (!pool || !pool.connected) return { total: 0, previousTotal: 0 };
            try { return await getRevenueOrderComparisonFromPool(pool, type); }
            catch { return { total: 0, previousTotal: 0 }; }
        });
        const results = await Promise.all(promises);
        return results.reduce((acc, curr) => ({
            total: acc.total + curr.total,
            previousTotal: acc.previousTotal + curr.previousTotal
        }), { total: 0, previousTotal: 0 });
    } else {
        const pool = getBranchPool(branch_code);
        if (!pool || !pool.connected) return { total: 0, previousTotal: 0 };
        return await getRevenueOrderComparisonFromPool(pool, type);
    }
};

// 2. Service: Total Orders Comparison (KPI Tổng đơn hàng)
export const getTotalOrderComparisonService = async (branch_code: string, type: string) => {
    if (branch_code === 'CT') {
        const branches = ['HN', 'DN', 'HCM'];
        const promises = branches.map(async (code) => {
            const pool = getBranchPool(code);
            if (!pool || !pool.connected) return { total: 0, previousTotal: 0 };
            try { return await getTotalOrderComparisonFromPool(pool, type); }
            catch { return { total: 0, previousTotal: 0 }; }
        });
        const results = await Promise.all(promises);
        return results.reduce((acc, curr) => ({
            total: acc.total + curr.total,
            previousTotal: acc.previousTotal + curr.previousTotal
        }), { total: 0, previousTotal: 0 });
    } else {
        const pool = getBranchPool(branch_code);
        if (!pool || !pool.connected) return { total: 0, previousTotal: 0 };
        return await getTotalOrderComparisonFromPool(pool, type);
    }
};

// 3. Service: Cancelled Orders Comparison (KPI Đơn hủy)
export const getTotalOrderCancelledService = async (branch_code: string, type: string) => {
    if (branch_code === 'CT') {
        const branches = ['HN', 'DN', 'HCM'];
        const promises = branches.map(async (code) => {
            const pool = getBranchPool(code);
            if (!pool || !pool.connected) return { total: 0, previousTotal: 0 };
            try { return await getTotalOrderCancelledFromPool(pool, type); }
            catch { return { total: 0, previousTotal: 0 }; }
        });
        const results = await Promise.all(promises);
        return results.reduce((acc, curr) => ({
            total: acc.total + curr.total,
            previousTotal: acc.previousTotal + curr.previousTotal
        }), { total: 0, previousTotal: 0 });
    } else {
        const pool = getBranchPool(branch_code);
        if (!pool || !pool.connected) return { total: 0, previousTotal: 0 };
        return await getTotalOrderCancelledFromPool(pool, type);
    }
};

// 4. Service: Top Orders (Đơn hàng gần đây)
export const getTopOrderOfBranchService = async (branch_code: string, top: number) => {
    if (branch_code === 'CT') {
        const branches = ['HN', 'DN', 'HCM'];
        const promises = branches.map(async (code) => {
            const pool = getBranchPool(code);
            if (!pool || !pool.connected) return [];
            try { return await getTopOrderFromPool(pool, top); }
            catch { return []; }
        });
        const results = await Promise.all(promises);

        return results.flat()
            .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
            .slice(0, top);
    } else {
        const pool = getBranchPool(branch_code);
        if (!pool || !pool.connected) return [];
        return await getTopOrderFromPool(pool, top);
    }
};

// 5. Service: Revenue By Year (Biểu đồ doanh thu)
export const getRevenueByYearService = async (branch_code: string, year: number) => {
    if (branch_code === 'CT') {
        const branches = ['HN', 'DN', 'HCM'];
        const promises = branches.map(async (code) => {
            const pool = getBranchPool(code);
            if (!pool || !pool.connected) return null;
            try { return await getRevenueByYearFromPool(pool, year); }
            catch { return null; }
        });
        const results = await Promise.all(promises);

        let finalRevenue = { year, monthlyRevenue: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0 })) };
        results.forEach(res => {
            if (res) {
                res.monthlyRevenue.forEach(m => {
                    finalRevenue.monthlyRevenue[m.month - 1].revenue += m.revenue;
                });
            }
        });
        return finalRevenue;
    } else {
        const pool = getBranchPool(branch_code);
        if (!pool || !pool.connected) return null;
        return await getRevenueByYearFromPool(pool, year);
    }
};