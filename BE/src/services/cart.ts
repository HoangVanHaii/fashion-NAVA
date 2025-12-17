import { ConnectionPool } from "mssql";
import { AppError } from "../utils/appError";
import { getBranchPool } from "../config/database";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import CartItemMongo  from "../models/cart.mongo";
import {ICartFull, ICartItem, ICartItemColor, ICartItemFull, ICartItemSize} from "../interfaces/cart"
import { ProductDetailModel } from "../models/product";

export const addtoCart = async (user_id: string, data: ICartItem, branch_code: string) => {
    const pool: ConnectionPool | null = getBranchPool(branch_code);
    if (!pool) throw new AppError("SQL pool cannot connect", 503);

    if (!data.product_id_sql || !data.size_id_mongo) {
        throw new AppError("Missing product_id_sql or size_id_mongo", 400);
    }

    const inputProductId = data.product_id_sql.toLowerCase();
    const inputSizeId = data.size_id_mongo.toString();
    data.product_id_sql = inputProductId;
    const productDetail = await ProductDetailModel.findOne({ 
        product_id_sql: inputProductId 
    }).lean();

    if (!productDetail) {
        throw new AppError("Product not found in details database.", 404);
    }
    
    let isSizeValid = false;
    if (productDetail.colors) {
        for (const color of productDetail.colors) {
            const sizeExists = color.sizes.find((s: any) => 
                s._id.toString() === inputSizeId 
            );
            if (sizeExists) {
                isSizeValid = true;
                break; 
            }
        }
    }

    if (!isSizeValid) {
        throw new AppError("Invalid size ID for this product.", 400);
    }

    const stockQuery = await pool.request()
        .input("product_id", inputProductId) 
        .input("size_id", inputSizeId)       
        .query(`
            SELECT stock
            FROM branch_inventories
            WHERE product_id = @product_id
              AND size_id_mongo = @size_id
        `);

    const stock = stockQuery.recordset[0]?.stock ?? 0;

    if (data.quantity > stock) {
        throw new AppError(`Only ${stock} items in stock`, 400);
    }

    try {
        let cart_id_sql; 
        let item_mongo_id;
        
        const result = await pool.request()
            .input("user_id", user_id)
            .query(`
                SELECT id, user_id, item_mongo_id
                FROM carts
                WHERE user_id = @user_id
            `);

        const cart = result.recordset[0];

        if (!cart) {
            const id_sql = uuidv4();
            const id_mongo = new mongoose.Types.ObjectId();
            
            await pool.request()
                .input("id", id_sql)
                .input("user_id", user_id)
                .input("item_mongo_id", id_mongo.toString())
                .query(`
                    INSERT INTO carts(id,user_id,item_mongo_id)
                    VALUES(@id,@user_id,@item_mongo_id)
                `);

            cart_id_sql = id_sql;
            item_mongo_id = id_mongo;

            await CartItemMongo.create({
                _id: item_mongo_id,
                cart_id_sql,
                user_id_sql: user_id,
                items: [data] 
            });

        } else {
            cart_id_sql = cart.id;
            item_mongo_id = cart.item_mongo_id;
            const cartMongo = await CartItemMongo.findById(item_mongo_id).lean();

            if (!cartMongo) {
                throw new AppError("Cart Mongo not found", 500);
            }

            const existingItem = cartMongo.items.find(item => 
                item.product_id_sql?.toLowerCase() === inputProductId && 
                item.size_id_mongo?.toString() === inputSizeId
            );

            if (existingItem) {
                const newQty = existingItem.quantity + data.quantity;

                if (newQty > stock) {
                    const maxCanAdd = stock - existingItem.quantity;
                    throw new AppError(`Only addMax ${maxCanAdd} items in stock`, 400);
                }
                
             
                await CartItemMongo.updateOne(
                    { 
                        _id: item_mongo_id, 
                        "items.size_id_mongo": data.size_id_mongo, 
                        "items.product_id_sql": inputProductId 
                    },
                    { 
                        $inc: { "items.$.quantity": data.quantity }, 
                        $set: { updated_at: new Date() }
                    }    
                );
            } else {
        
                await CartItemMongo.findByIdAndUpdate(
                    item_mongo_id,
                    { $push: { items: data } },
                    { new: true, upsert: true }
                );
            }
        }
    } catch (error) {
        console.error("ADD TO CART REAL ERROR:", error);
        if (error instanceof AppError) throw error;
        throw new AppError("Error checking/creating cart", 500, false);
    }
};

export const getCartItems = async (
    user_id: string,
    branch_code: string
): Promise<ICartFull> => {
    try {
        const cartMongo = await CartItemMongo.findOne({ user_id_sql: user_id });

        if (!cartMongo) {
            return {
                cart_id_sql: "",
                user_id_sql: user_id,
                items: [],
                total_quantity: 0,
                total_amount: 0
            };
        }

        const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500);

        const itemPromises = cartMongo.items.map(async (item) => {
            if (!item.product_id_sql) return null;

            // ===== SQL PRODUCT =====
            const result = await pool.request()
                .input("product_id", item.product_id_sql)
                .input("size_id", item.size_id_mongo)
                .query(`
                    SELECT 
                        p.id,
                        p.name,
                        bi.price AS base_price,
                        fsi.flash_sale_price
                    FROM products p
                    JOIN branch_inventories bi ON p.id = bi.product_id AND bi.size_id_mongo = @size_id
                    LEFT JOIN flash_sale_items fsi 
                        ON fsi.product_id = p.id
                        AND fsi.size_id_mongo = @size_id
                        AND fsi.status = 'active'
                    WHERE p.id = @product_id
                `);

            const product = result.recordset[0];
            if (!product) return null;

            const price = product.flash_sale_price ?? product.base_price;
            const total_price = price * item.quantity;

            const productDetail = await ProductDetailModel
                .findOne({ product_id_sql: item.product_id_sql })
                .lean();

            let variantSize: ICartItemSize | undefined;
            let variantColor: ICartItemColor | undefined;

            if (productDetail?.colors?.length) {
                for (const color of productDetail.colors) {
                    const sizeExists = color.sizes.find(
                        (s: any) => s._id.toString() === item.size_id_mongo.toString()
                    );

                    if (sizeExists) {
                        variantSize = {
                            size_id_mongo: item.size_id_mongo,
                            size: sizeExists.size
                        };

                        variantColor = {
                            color_id_mongo: color._id!.toString(),
                            color: color.color,
                            image_main: color.image_main as string
                        };
                        break;
                    }
                }
            }

            return {
                _id: item._id!.toString(), 
                product_id_sql: item.product_id_sql,
                name: product.name,
                quantity: item.quantity,
                base_price: product.base_price,
                price,
                total_price,
                variant: {
                    size: variantSize,
                    color: variantColor
                }
            } as ICartItemFull;
        });

        const results = await Promise.all(itemPromises);
        const itemsFull = results.filter(
            (item): item is ICartItemFull => item !== null
        );

        const total_quantity = itemsFull.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        const total_amount = itemsFull.reduce(
            (sum, item) => sum + item.total_price,
            0
        );

        return {
            cart_id_sql: cartMongo.cart_id_sql || "",
            user_id_sql: cartMongo.user_id_sql,
            items: itemsFull,
            total_quantity,
            total_amount
        };
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("GetCart Error:", error);
        throw new AppError("Error get cart", 500, false);
    }
};


export const updateCartItemQuantity = async (cartItem_mongo_id: string, newQuantity: number, branch_code:string)=>{
    try {
        const cart = await CartItemMongo.findOne({ "items._id": cartItem_mongo_id });
        if (!cart) throw new AppError("Cart item not found", 404);

        const cartItem = cart.items.find(item => item._id && item._id.toString() === cartItem_mongo_id);
        if (!cartItem) throw new AppError("Cart item not found", 404);

        const pool = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500, false);

        const result = await pool.request()
            .input("product_id", cartItem.product_id_sql)
            .input("size_id", cartItem.size_id_mongo)
            .query(`
                SELECT stock
                FROM branch_inventories
                WHERE product_id = @product_id
                  AND size_id_mongo = @size_id
            `);
        const stock = result.recordset[0]?.stock ?? 0;
        if (newQuantity > stock) {
            throw new AppError(`Only ${stock} items in stock`, 400);
        }
        const updateResult = await CartItemMongo.updateOne(
            { "items._id": cartItem_mongo_id },
            {
                $set: {
                    "items.$.quantity": newQuantity,
                    updated_at: new Date()
                }
            }
        );
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("UPDATE QUANTITY ERROR:", error);
        throw new AppError("Error updating quantity", 500, false);
    }
}

export const updateCartItem = async (cartItem_mongo_id: string, new_size_id:string,branch_code: string)=>{
    try {
        const cart = await CartItemMongo.findOne({"items._id": cartItem_mongo_id });
        if (!cart) throw new AppError("Cart item not found", 404);

        const cartItem = cart.items.find(item => item._id && item._id.toString() === cartItem_mongo_id);
        if (!cartItem) throw new AppError("Cart item not found", 404);
        
        const product_id_sql = cartItem.product_id_sql;
        const quantity = cartItem.quantity;

        const productDetail = await ProductDetailModel.findOne({ product_id_sql }).lean();
        if (!productDetail) throw new AppError("Product details not found", 404);
        let matchedSize = null;

        for (const color of productDetail.colors) {
            const size = color.sizes.find(s => s._id && s._id.toString() === new_size_id);
            if (size) {
                matchedSize = size;
                break;
            }
        }

        if (!matchedSize) throw new AppError("Invalid size for this product", 400);

        const pool = getBranchPool(branch_code);
        if (!pool) throw new AppError("DB connection failed", 500);

        const stockQuery = await pool.request()
            .input("product_id", product_id_sql)
            .input("size_id", new_size_id)
            .query(`
                SELECT stock
                FROM branch_inventories
                WHERE product_id = @product_id
                AND size_id_mongo = @size_id
            `);
        const stock = stockQuery.recordset[0]?.stock ?? 0;
        const totalInCartForSize = cart.items
            .filter(item => 
                item._id?.toString() !== cartItem_mongo_id &&
                item.product_id_sql === product_id_sql &&
                item.size_id_mongo?.toString() === new_size_id
            )
            .reduce((sum, item) => sum + item.quantity, 0);

        if (quantity + totalInCartForSize > stock) {
            throw new AppError(`Cannot update. Max available for this size is ${stock - totalInCartForSize}`,400);
        }
        const existingItemNewSize = cart.items.find(item =>
            item._id?.toString() !== cartItem_mongo_id &&
            item.product_id_sql === product_id_sql &&
            item.size_id_mongo?.toString() === new_size_id
        );
        if (existingItemNewSize) {
            await CartItemMongo.updateOne(
                { _id: cart._id, "items._id": existingItemNewSize._id },
                { $inc: { "items.$.quantity": quantity }, $set: { updated_at: new Date() } }
            );
            await CartItemMongo.updateOne(
                { _id: cart._id },
                { $pull: { items: { _id: cartItem_mongo_id } }, $set: { updated_at: new Date() } }
            );
        }else{
            await CartItemMongo.updateOne(
                { "items._id": cartItem_mongo_id },
                { $set: { "items.$.size_id_mongo": new_size_id, updated_at: new Date() } }
            );
        }
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("UPDATE QUANTITY ERROR:", error);
        throw new AppError("Error updating quantity", 500, false);
    }
}

export const removeCartItem = async (cartItem_mongo_id: string) => {
    try {
        const cart = await CartItemMongo.findOne({ "items._id": cartItem_mongo_id });
        if (!cart) throw new AppError("Cart item not found", 404);

        await CartItemMongo.updateOne(
            { _id: cart._id },
            { $pull: { items: { _id: cartItem_mongo_id } }, $set: { updated_at: new Date() } }
        );

    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("REMOVE CART ITEM ERROR:", error);
        throw new AppError("Error removing cart item", 500, false);
    }
};


export const clearCart = async (user_id: string) => {
    try {
        const cart = await CartItemMongo.findOne({ user_id_sql: user_id });
        if (!cart) return; 
        await CartItemMongo.updateOne(
            { _id: cart._id },
            { $set: { items: [], updated_at: new Date() } }
        );
    } catch (error) {
        console.error("CLEAR CART ERROR:", error);
        throw new AppError("Error clearing cart", 500, false);
    }
};

export const countCartItems = async (user_id: string): Promise<number> => {
    try {
        const cartMongo = await CartItemMongo.findOne(
            { user_id_sql: user_id }, 
            { items: 1 } 
        ).lean();

        if (!cartMongo || !cartMongo.items) {
            return 0;
        }

        return cartMongo.items.length;
    } catch (error) {
        console.error("COUNT CART ERROR:", error);
        throw new AppError("Error counting cart items", 500, false);
    }
};