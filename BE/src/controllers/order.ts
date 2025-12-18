import { Response, Request, NextFunction } from "express";
import { OderPayLoad, OrderItem } from "../interfaces/order";
import { AppError } from "../utils/appError";
import * as orderService from "../services/order";
import *as voucherService from "../services/voucher";
import * as productService from "../services/product";
import *as paymentUtils from "../utils/vnpay";
import { ConnectionPool } from "mssql";
import { ProductDetailModel } from "../models/product";
import { getBranchPool } from "../config/database";

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
export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderItems, voucherCode, address, methodPayment, note,checkout_source } = req.body;

        const userId = req.user?.id as string;
        const branch_id = req.user?.branch_id as string;
        const dbBranch = req.dbBranch;
        const branch_code = req.user?.branch_code;
        
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        
        const { orderItemsData, total } = await makeOrderItem(orderItems, dbBranch, branch_id);

        let discount_value = 0;
        let validVoucherId = null; 

        if (voucherCode) {
            const voucherResult = await voucherService.validateVoucher(voucherCode, total, dbBranch);
            
            discount_value = voucherResult.discount;
            validVoucherId = voucherResult.voucher_id; 
        }

        const orderPayload: OderPayLoad = {
            order: {
                user_id: userId, 
                voucher_id: validVoucherId ? validVoucherId : undefined,
                total: total - discount_value,
                discount_value: discount_value,
                payment_method: methodPayment,
                address: address,
                note: note,
                checkout_source:checkout_source
            },
            orderItems: orderItemsData
        };

        const newOrder = await orderService.createOrder(orderPayload, dbBranch, branch_id);

        if (methodPayment === 'vnpay') {
            if (total < 5000) {
                throw new AppError("Minimum order amount for VNPAY is 5000", 400);
            }

            const paymentUrl = await paymentUtils.buildPaymentUrl(
                newOrder,
                total - discount_value,
                branch_code ? branch_code : 'DN'
            );
            return res.status(201).json({ paymentUrl });
        }

        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: newOrder
        });

    } catch (err) {
        console.log(err)
        next(err);
    }
}

export const getOrderOfMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id as string;  
        const dbBranch = req.dbBranch;
        const branch_code = req.user?.branch_code;
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        const orders = await orderService.getOrdersByUserId(userId, dbBranch);
        return res.status(200).json({
            success: true,
            data: orders
        });
    } catch (err) {
        console.log(err)
        next(err);
    }
};
export const getOrderDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orderId = req.params.id;
        const pool = req.dbBranch;
        // const o
        // const pool = getBranchPool(branch_code);
        const branch_code = req.user?.branch_code;
        if (!pool || !pool.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        console.log(pool);
        const orderDetail = await orderService.getOrderById(orderId, pool); 
        return res.status(200).json({
            success: true,
            data: orderDetail
        });
    } catch (err) {
        next(err);
    }
};
export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orderId = req.params.id;
        const dbBranch = req.dbBranch;
        const branch_code = req.user?.branch_code;
        if (!dbBranch || !dbBranch.connected) {
            throw new AppError(`${branch_code} is not connected`, 503);
        }
        await orderService.cancelOrderById(orderId, dbBranch);
        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully"
        });
    }
    catch (err) {
        next(err);
    }
};
