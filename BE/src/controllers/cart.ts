import { Request, Response, NextFunction } from "express";
import * as cartService from "../services/cart";
import { ICartFull, ICartItem } from "../interfaces/cart";
import { AppError } from "../utils/appError";

export const addtoCartController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_id = Number(req.user!.id);
        const { product_id_sql, product_id_mongo, size_id_mongo, quantity } = req.body;

        const cartItem: ICartItem = {
            product_id_sql,
            product_id_mongo,
            size_id_mongo,
            quantity: Number(quantity)
        };  
        console.log("Received add to cart request:", { user_id, cartItem });

        await cartService.addtoCart(user_id, cartItem);

        return res.status(201).json({
            success: true,
            message: "Product added to cart"
        });
    } catch (error) {
        console.error("ADD TO CART ERROR:", error);
        next(error);
    }
};

export const getCartItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_id = Number(req.user!.id);
        const cart: ICartFull = await cartService.getCartItems(user_id);

        return res.status(200).json({
            success: true,
            message: cart ? "Cart fetched successfully" : "Cart is empty",
            data: cart
        });
    } catch (err: any) {
        next(err);
    }
};

export const updateCartItemQuantity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cartItem_mongo_id = req.params.id;
        const { newQuantity } = req.body;

        await cartService.updateCartItemQuantity(cartItem_mongo_id, newQuantity);

        return res.status(200).json({
            success: true,
            message: "Cart item quantity updated successfully"
        });
    } catch (err: any) {
        next(err);
    }
};

export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cartItem_mongo_id = req.params.id;
        const { size_id } = req.body;

        await cartService.updateCartItem(cartItem_mongo_id, size_id);

        return res.status(200).json({
            success: true,
            message: "Cart item updated successfully"
        });
    } catch (err: any) {
        next(err);
    }
};

export const removeCartItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cartItem_mongo_id = req.params.id;

        await cartService.removeCartItem(cartItem_mongo_id);

        return res.status(200).json({
            success: true,
            message: "Cart item removed successfully"
        });
    } catch (err: any) {
        next(err);
    }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_id = Number(req.user!.id);
        await cartService.clearCart(user_id);

        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully"
        });
    } catch (err: any) {
        next(err);
    }
};

export const countCartItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_id = Number(req.user!.id);
        const totalQuantity = await cartService.countCartItems(user_id);

        return res.status(200).json({
            success: true,
            message: "Cart count fetched successfully",
            data: totalQuantity
        });
    } catch (err: any) {
        next(err);
    }
};