import { NextFunction, Request, Response } from 'express'
import * as orderService from '../../services/order'
import { AppError } from '../../utils/appError';
import * as productService from '../../services/product'
import { StatisticalOrder, OderPayLoad, OrderItem } from '../../interfaces/order';
import { ProductDetailModel } from "../../models/product";

export const changeStatusOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { order_id, status } = req.body;
        await orderService.changeStatusOrder(order_id, status);

        return res.status(200).json({
            success: true,
            message: `Order ${status} successfully`
        });
    } catch (error) {
        next(error);
    }
};

export const getOrderOfSystem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const method_order = req.params.method_order as string;
        console.log("Received method_order:", method_order);
        if (method_order.toLowerCase() != 'online' && method_order.toLowerCase() != 'offline') {
            throw new AppError('invalid method_order', 400);
        }

        // Gọi thẳng service của hệ thống thay vì chi nhánh
        const order = await orderService.getOrderOfSystem(method_order.toLowerCase());

        return res.status(200).json({
            success: true,
            message: `Get order successfully`,
            data: order
        });
    } catch (error) {
        next(error);
    }
};

export const getOrderOfTypeBranch = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const method_order = req.query.method as string;

        if (!method_order || (method_order.toLowerCase() !== 'online' && method_order.toLowerCase() !== 'offline')) {
            throw new AppError('Invalid method_order. Must be "online" or "offline"', 400);
        }

        const order = await orderService.getOrderOfSystem(method_order.toLowerCase());

        return res.status(200).json({
            success: true,
            message: `Get order successfully (${method_order})`,
            data: order
        });
    } catch (error) {
        next(error);
    }
};

export const statisticalOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orders = await orderService.statisticalOrder();

        const statistical: StatisticalOrder = {
            order_pending: orders.filter(o => o.status === 'pending').length,
            order_confirmed: orders.filter(o => o.status === 'confirmed').length,
            order_completed: orders.filter(o => o.status === 'completed').length,
            order_shipped: orders.filter(o => o.status === 'shipped').length,
            order_cancelled: orders.filter(o => o.status === 'cancelled').length,
        };

        return res.status(200).json({
            success: true,
            message: `Get statistical order successfully`,
            data: statistical
        });

    } catch (error) {
        next(error);
    }
};

const makeOrderItem = async (orderItems: any[]): Promise<{ orderItemsData: OrderItem[], total: number }> => {
    const orderItemsData: OrderItem[] = [];
    let total = 0;

    for (const item of orderItems) {
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

export const createOrderByEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderItems } = req.body;
        const employeeId = Number(req.user?.id);

        const { orderItemsData, total } = await makeOrderItem(orderItems);

        const orderPayload: OderPayLoad = {
            order: {
                user_id: employeeId,
                total: total,
                discount_value: 0,
                payment_method: 'cod',
                address: undefined,
                method_order: 'offline',
                status: 'completed'
            },
            orderItems: orderItemsData
        };

        const newOrder = await orderService.createOrder(orderPayload);

        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: newOrder
        });

    } catch (err) {
        next(err);
    }
};

export const getDailyOrderComparison = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let type = req.params.type || 'hôm nay';
        const comparisonData = await orderService.getRevenueOrderComparisonService(type);

        return res.status(200).json({
            success: true,
            data: comparisonData,
            message: "Daily order comparison retrieved successfully"
        });
    } catch (err) {
        next(err);
    }
};

const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(2));
};

// 1. Daily Revenue Comparison
export const getDailyOrderComparisonForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const type = (req.params.type as string) || 'hôm nay';

        const rawData = await orderService.getRevenueOrderComparisonService(type);

        return res.status(200).json({
            success: true,
            message: "Get daily revenue comparison successfully",
            results: {
                total: rawData.revenue,
                changePercent: rawData.percentageChange, // percentageChange đã được tính sẵn trong service
            }
        });
    } catch (err) {
        next(err);
    }
};

// 2. Total Orders Comparison
export const getTotalOrderComparisonForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const type = (req.params.type as string) || 'hôm nay';

        const rawData = await orderService.getTotalOrderComparisonService(type);
        const changePercent = calculateGrowth(rawData.total, rawData.previousTotal);

        return res.status(200).json({
            success: true,
            message: "Get total orders comparison successfully",
            results: {
                total: rawData.total,
                changePercent: changePercent,
            }
        });
    } catch (err) {
        next(err);
    }
};

// 3. Cancelled Orders Comparison
export const getTotalCancelledOrderForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const type = (req.params.type as string) || 'hôm nay';

        const rawData = await orderService.getTotalOrderCancelledService(type);
        const changePercent = calculateGrowth(rawData.total, rawData.previousTotal);

        return res.status(200).json({
            success: true,
            message: "Get cancelled orders comparison successfully",
            results: {
                total: rawData.total,
                changePercent: changePercent,
            }
        });
    } catch (err) {
        next(err);
    }
};

// 4. Revenue By Year (Chart)
export const getRevenueYearForAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const year = parseInt(req.params.year as string) || new Date().getFullYear();

        const data = await orderService.getRevenueByYearService(year);

        if (!data) {
            return res.status(200).json({
                success: true,
                message: "Get revenue year successfully",
                year: null,
                monthlyRevenue: null
            });
        }

        return res.status(200).json({
            success: true,
            message: "Get revenue year successfully",
            year: data.year,
            monthlyRevenue: data.monthlyRevenue
        });
    } catch (err) {
        next(err);
    }
};

// 5. Top Orders
export const getTopOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const top = parseInt(req.params.top as string) || 10;

        const orders = await orderService.getTopOrderService(top);

        return res.status(200).json({
            success: true,
            message: "Get top orders successfully",
            orders
        });
    } catch (error) {
        next(error);
    }
};