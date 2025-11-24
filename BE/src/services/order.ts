import { ConnectionPool, Transaction } from "mssql";
import { GetOrder, OderPayLoad, Order, OrderItem } from "../interfaces/order";
import { v4 as uuidv4 } from 'uuid';
import { getProductSizesBySizeId } from "./product";
import mongoose from "mongoose";
import { OrderDetail } from "../models/order.mongo";
import { AppError } from "../utils/appError";
const insertOrder = async (tranRequest: Transaction, orderIdSql: string, orderData: Order, mongoOrderId: mongoose.Types.ObjectId): Promise<void> => {
    const query = `INSERT INTO orders (ID, user_id, total, shipping_name, shipping_phone, voucher_id, shipping_province, shipping_district, shipping_ward, shipping_street, mongodb_id)
    VALUES (@orderId, @user_id, @total, @shipping_name, @shipping_phone, @voucher_id, @shipping_province, @shipping_district, @shipping_ward, @shipping_street, @mongodb_id)`;
    await tranRequest.request().input('orderId', orderIdSql)
        .input('user_id', orderData.user_id)
        .input('total', orderData.total)
        .input('shipping_name', orderData.address.name)
        .input('shipping_phone', orderData.address.phone)
        .input('voucher_id', orderData.voucher_id || null)
        .input('shipping_province', orderData.address.province)
        .input('shipping_district', orderData.address.district)
        .input('shipping_ward', orderData.address.ward)
        .input('shipping_street', orderData.address.street_address)
        .input('mongodb_id', mongoOrderId.toString())
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

const insertOrderDetailMongoDB = async (mongoOrderId: mongoose.Types.ObjectId, orderIdSql: string, orderItems: OrderItem[]): Promise<void> => {
    await OrderDetail.create({
        _id: mongoOrderId,
        order_id_sql: orderIdSql,
        items: orderItems
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
export const createOrder = async (orderPayload: OderPayLoad, dbBranch: ConnectionPool, branch_id: string): Promise<string> => {
    const tranRequest: Transaction = dbBranch.transaction();
    const orderIdSql = uuidv4();
    const mongoOrderId = new mongoose.Types.ObjectId();
    try {
        await tranRequest.begin();
        // function insert order
        await insertOrder(tranRequest, orderIdSql, orderPayload.order, mongoOrderId);
        // function insert order items
        await insertOrderItems(tranRequest, orderIdSql, orderPayload.orderItems);
        // update stock
        await updateStockAfterOrder(tranRequest, orderPayload.orderItems, branch_id);
        // insert detail order in mongoDB
        await insertOrderDetailMongoDB(mongoOrderId, orderIdSql ,orderPayload.orderItems);

        // function insert payment
        await insertPayment(tranRequest, orderIdSql, orderPayload.order);
        await tranRequest.commit();
        return orderIdSql as string;
    } catch (err) {
        await tranRequest.rollback();
        await OrderDetail.findByIdAndDelete(mongoOrderId);

        console.error(err);
        if (err instanceof AppError) throw err;

        throw new AppError("Failed to Order", 500, false);
    }
}

export const getOrdersByUserId = async (userId: string, dbBranch: ConnectionPool): Promise<GetOrder[]> => {
    const query = `SELECT * FROM orders WHERE user_id = @user_id ORDER BY created_at DESC`;
    const result = await dbBranch.request()
        .input('user_id', userId)
        .query(query);
    const orderSqlIds = result.recordset.map(order => order.ID);

    const lowerCaseOrderSqlIds = orderSqlIds.map((id: string) => id.toString().toLowerCase());
    const mongoOrders = await OrderDetail.find({ order_id_sql: { $in: lowerCaseOrderSqlIds } }).lean();

    const orders = result.recordset.map(order => {
        const mongoOrder = mongoOrders.find(mongoOrder => mongoOrder.order_id_sql === order.ID.toString().toLowerCase());
        return {
            ...order,
            items: mongoOrder ? mongoOrder.items : []
        };
    });
    const orderResuts: GetOrder[] = orders.map(order => ({
        id: order.ID,
        user_id: order.user_id,
        voucher_id: order.voucher_id,
        total: order.total,
        mongo_id: order.mongodb_id,
        payment_method: order.payment_method,
        address: {
            name: order.shipping_name,
            phone: order.shipping_phone,
            province: order.shipping_province,
            district: order.shipping_district,
            ward: order.shipping_ward,
            street_address: order.shipping_street
        },
        status: order.status,
        created_at: order.created_at,
        items: order.items
    }));
    return orderResuts;
}
export const getOrderById = async (orderId: string, dbBranch: ConnectionPool): Promise<GetOrder | null> => {
    const query = `SELECT * FROM orders WHERE ID = @order_id`;
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
        mongo_id: order.mongodb_id,
        payment_method: order.payment_method,
        address: {
            name: order.shipping_name,
            phone: order.shipping_phone,
            province: order.shipping_province,
            district: order.shipping_district,
            ward: order.shipping_ward,
            street_address: order.shipping_street
        },
        status: order.status,
        created_at: order.created_at,
        items: mongoOrder ? mongoOrder.items : []
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
export const getOrderOfBranch = async (dbBranch: ConnectionPool) : Promise<GetOrder[]> => {
    try {
        const query = `SELECT *FROM orders`;
        const result = await dbBranch.request().query(query);
        const orderSqlIds = result.recordset.map(order => order.ID);
        const lowerCaseOrderSqlIds = orderSqlIds.map((id: string) => id.toString().toLowerCase());
        const mongoOrders = await OrderDetail.find({ order_id_sql: { $in: lowerCaseOrderSqlIds } }).lean();

        const orders = result.recordset.map(order => {
            const mongoOrder = mongoOrders.find(mongoOrder => mongoOrder.order_id_sql === order.ID.toString().toLowerCase());
            return {
                ...order,
                items: mongoOrder ? mongoOrder.items : []
            };
        });
        const orderResuts: GetOrder[] = orders.map(order => ({
            id: order.ID,
            user_id: order.user_id,
            voucher_id: order.voucher_id,
            total: order.total,
            mongo_id: order.mongodb_id,
            payment_method: order.payment_method,
            address: {
                name: order.shipping_name,
                phone: order.shipping_phone,
                province: order.shipping_province,
                district: order.shipping_district,
                ward: order.shipping_ward,
                street_address: order.shipping_street
            },
            status: order.status,
            created_at: order.created_at,
            items: order.items
        }));
        return orderResuts;

    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error(error);
        throw new AppError("Failed to cancel order", 500);
    }
}
export const getOrderByStatus = async (dbBranch: ConnectionPool, status: string): Promise<number> => {
    try {
        const query = `SELECT *FROM orders WHERE status = @status`;
        const result = await dbBranch.request().input('status', status).query(query);
        
        return result.recordset.length ;
    } catch (err) {
        if (err instanceof AppError) {
            throw err;
        }
        console.log(err);
        throw new AppError('Failed to get order by status', 500);
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

