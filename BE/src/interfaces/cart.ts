import mongoose from "mongoose";

export interface ICartItem {
    _id?: mongoose.Types.ObjectId;
    product_id_sql?: number;
    size_id_mongo: string;
    quantity: number;
}

export interface ICartItemSize {
    size_id_mongo: string;  
    size: string;
}

export interface ICartItemColor {
    color_id_mongo: string;   
    color?: string;
    image_main: string;
}

export interface ICartItemFull {
    _id: string;                
    product_id_sql: number;
    name: string;
    quantity: number;
    base_price?: number;
    price: number;
    total_price: number;
    variant: {
        size?: ICartItemSize;
        color?: ICartItemColor;
    };
}

export interface ICartFull {
    cart_id_sql: number;
    user_id_sql: number;
    items: ICartItemFull[];
    total_quantity: number;  
    total_amount: number;    
}