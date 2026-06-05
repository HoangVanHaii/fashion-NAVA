import { Response, Request, NextFunction } from "express";
import { OderPayLoad, OrderItem } from "../interfaces/order";
import { AppError } from "../utils/appError";
import * as orderService from "../services/order";
import * as voucherService from "../services/voucher";
import * as productService from "../services/product";
import * as paymentUtils from "../utils/vnpay";
import { ProductDetailModel } from "../models/product";

const makeOrderItem = async (orderItems: any[]): Promise<{ orderItemsData: OrderItem[], total: number }> => {
    const orderItemsData: OrderItem[] = [];
    let total = 0;

    for (const item of orderItems) {
        // Đã cập nhật productService để không cần truyền pool/branch
        const productSize = await productService.getProductSizesBySizeId(item.size_id);

        if (!productSize) {
            throw new AppError(`Size with ID ${item.size_id} not found`, 404);
        }
        if (productSize.stock < item.quantity) {
            throw new AppError(`Insufficient stock for size ${productSize.id} (available: ${productSize.stock}, requested: ${item.quantity})`, 400);
        }

        const productName = await productService.getProductName(productSize.product_id);

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
        };

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
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderItems, voucherCode, address, payment_method, note, checkout_source } = req.body;
        // console.log("Received create order request:", { orderItems, voucherCode, address, payment_method, note, checkout_source });
        if (!req.user) throw new AppError("Unauthorized", 401);
        const userId = Number(req.user.id);

        const { orderItemsData, total } = await makeOrderItem(orderItems);

        let discount_value = 0;
        let validVoucherId = null;

        if (voucherCode) {
            const voucherResult = await voucherService.validateVoucher(voucherCode, total);

            discount_value = voucherResult.discount;
            validVoucherId = voucherResult.voucher_id;
        }

        const orderPayload: OderPayLoad = {
            order: {
                user_id: userId,
                voucher_id: validVoucherId ? Number(validVoucherId) : undefined,
                total: total - discount_value,
                discount_value: discount_value,
                payment_method: payment_method,
                address: address,
                note: note,
                checkout_source: checkout_source
            },
            orderItems: orderItemsData
        };

        const newOrder = await orderService.createOrder(orderPayload);

        if (payment_method === 'vnpay') {
            if (total < 5000) {
                throw new AppError("Minimum order amount for VNPAY is 5000 VND", 400);
            }

            // Gọi hàm tạo URL VNPAY (nhớ xóa biến branch_code ở trong utils của bạn nhé)
            const paymentUrl = await paymentUtils.buildPaymentUrl(
                newOrder,
                total - discount_value
            );
            return res.status(201).json({ paymentUrl });
        }

        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: newOrder
        });

    } catch (err) {
        console.error(err);
        next(err);
    }
};

export const getOrderOfMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new AppError("Unauthorized", 401);
        const userId = Number(req.user.id);

        const orders = await orderService.getOrdersByUserId(userId);
        return res.status(200).json({
            success: true,
            data: orders
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
};

export const getOrderDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orderId = Number(req.params.id);
        const orderDetail = await orderService.getOrderById(orderId);

        if (!orderDetail) throw new AppError("Order not found", 404);

        return res.status(200).json({
            success: true,
            data: orderDetail
        });
    } catch (err) {
        next(err);
    }
};

export const getOrderDetailforAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orderId = Number(req.params.id);
        const orderDetail = await orderService.getOrderById(orderId);

        if (!orderDetail) throw new AppError("Order not found", 404);

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
        const orderId = Number(req.params.id);
        await orderService.cancelOrderById(orderId);

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully"
        });
    } catch (err) {
        next(err);
    }
};