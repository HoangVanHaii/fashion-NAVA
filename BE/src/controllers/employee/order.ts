import { NextFunction, Request, Response } from 'express'
import *as orderService from '../../services/order'
import { AppError } from '../../utils/appError';
import *as productService from '../../services/product'
import { StatisticalOrder } from '../../interfaces/order';
import { OderPayLoad, OrderItem } from "../../interfaces/order";
import *as voucherService from "../../services/voucher";
import { ConnectionPool } from "mssql";
import { ProductDetailModel } from "../../models/product";

export const changeStatusOrder = async (req: Request, res: Response, next: NextFunction) => {
    const { order_id, status } = req.body
    const dbBranch = req.dbBranch;
    const branch_code = req.user?.branch_code;

    if (!dbBranch || !dbBranch.connected) {
        throw new AppError(`${branch_code} is not connected`, 503);
    }
    try {
        await orderService.changeStatusOrder(dbBranch, order_id, status);
        return res.status(200).json({
            success: true,
            message: `Order ${status} successfully`
        });
    } catch (error) {
        next(error);
    }
    
}
export const getOrderOfBranch = async (req: Request, res: Response, next: NextFunction) => {
    const method_order  = req.params.method_order as string
    if (method_order.toLocaleLowerCase() != 'online' && method_order.toLocaleLowerCase() != 'offline') {
        throw new AppError('invalid method_order', 400);
    }
    const dbBranch = req.dbBranch;
    const branch_code = req.user?.branch_code;
    if (!dbBranch || !dbBranch.connected) {
        throw new AppError(`${branch_code} is not connected`, 503);
    }
    try {
        const order = await orderService.getOrderOfBranch(dbBranch, method_order.toLocaleLowerCase());
        return res.status(200).json({
            success: true,
            message: `get order successfully`,
            data: order
        });
    } catch (error) {
        next(error);
    }
}

export const statisticalOrder = async (req: Request, res: Response, next: NextFunction) => {
    const dbBranch = req.dbBranch;
    const branch_code = req.user?.branch_code;
    if (!dbBranch || !dbBranch.connected) {
        throw new AppError(`${branch_code} is not connected`, 503);
    }
    try {
        const orders = await orderService.statisticalOrder(dbBranch);
        // const revenue = await orderService.getRevenueOfBranch(dbBranch);
        
        // const total_order_offline = orders.filter(o => o.status === 'completed' && o.method_order.toString().toLowerCase() == 'offline').length

        const statistical: StatisticalOrder = {
            order_pending: orders.filter(o => o.status === 'pending').length,
            order_confirmed: orders.filter(o => o.status === 'confirmed').length,
            order_completed: orders.filter(o => o.status === 'completed').length,
            order_shipped: orders.filter(o => o.status === 'shipped').length,
            order_cancelled: orders.filter(o => o.status === 'cancelled').length,
            // total_order_offline: total_order_offline,
            // total_order_online: orders.length - total_order_offline,
            // revenue: revenue
        };

        return res.status(200).json({
            success: true,
            message: `get statistical order successfully`,
            data: statistical
        });

    } catch (error) {
        next(error);
    }
}

const makeOrderItem = async (orderItems: any, dbBranch: ConnectionPool, branch_id: string): Promise<any> => {
    const orderItemsData: OrderItem[] = [];
    let total = 0;
    for (const item of orderItems) {
        const productSize = await productService.getProductSizesBySizeId(item.size_id, dbBranch, branch_id);
        
        if (!productSize) {
            throw new AppError(`Size with ID ${item.size_id} not found`, 404);
        }
        if (productSize.stock < item.quantity) {
            throw new AppError(`Insufficient stock for size ${productSize.id} (available: ${productSize.stock}, requested: ${item.quantity}`, 400)
        }
        const productName = await productService.getProductName(productSize.product_id, dbBranch);


        const productMongo = await ProductDetailModel.findOne({
            product_id_sql: productSize.product_id.toString().toLowerCase()
        }).lean();
        
        let foundSizeName = "Unknown";
        let foundColorName = "Unknown";
        let foundImage = "default.jpg";

        const matchedColor = productMongo?.colors.find((c: any) =>
            c.sizes.some((s: any) => s._id.toString() === item.size_id)
        );

        if (matchedColor) {
            foundColorName = matchedColor.color || 'Unknown';
            foundImage = matchedColor.image_main.toString(); 

            const matchedSize = matchedColor.sizes.find((s: any) => s._id.toString() === item.size_id);
            if (matchedSize) {
                foundSizeName = matchedSize.size;
            }
        }
        item.price = productSize.price;
        const orderItem: OrderItem = {
            size_id_mongo: item.size_id,
            quantity: item.quantity,
            price: item.price,
            image: foundImage,
            color: foundColorName,
            size: foundSizeName,
            product_id_sql: productSize.product_id,
            product_name: productName || "Unknown Product",
            
        }
        if (productSize.flash_sale_price && productSize.stock_fsi > item.quantity) {
            orderItem.price = productSize.flash_sale_price;
        } else if (productSize.flash_sale_price && productSize.stock_fsi > 0 && productSize.stock_fsi < item.quantity) {
            const flashSaleQuantity = productSize.stock_fsi;
            const regularQuantity = item.quantity - flashSaleQuantity;
            orderItem.price = ((flashSaleQuantity * productSize.flash_sale_price) + (regularQuantity * productSize.price)) / item.quantity;
        }
        total += orderItem.price * orderItem.quantity;
        orderItemsData.push(orderItem);
    }
    return { orderItemsData, total };
}
export const createOrderByEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
        
        const { orderItems } = req.body;
        const employeeId = req.user?.id as string;
        const branch_id = req.user?.branch_id as string;
        const dbBranch = req.dbBranch;
        const branch_code = req.user?.branch_code;
        
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        const { orderItemsData, total } = await makeOrderItem(orderItems, dbBranch, branch_id);

        const orderPayload: OderPayLoad = {
            order: {
                user_id: employeeId, 
                total: total,
                payment_method: 'cod',
                address: undefined,
                method_order: 'offline',
                status: 'completed'
            },
            orderItems: orderItemsData
        };
        const newOrder = await orderService.createOrder(orderPayload, dbBranch, branch_id);

        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: newOrder
        });

    } catch (err) {
        next(err);
    }
}
export const getDailyOrderComparison = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const dbBranch = req.dbBranch;
        const branch_code = req.user?.branch_code;
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        let { type } = req.body
        if (!type) {
            type = 'hôm nay'
        }
        const comparisonData = await orderService.getRevenueOrderComparison(dbBranch, type);

        return res.status(200).json({
            success: true,
            data: comparisonData,
            message: "Daily order comparison retrieved successfully"
        });
    }
    catch (err) {
        next(err);
    }
};