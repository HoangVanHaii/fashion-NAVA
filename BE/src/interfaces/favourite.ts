import mongoose from "mongoose";

export interface FavouritePayload {
    user_id: number;
    product_id: number;
    created_at?: Date;
}

export interface FavouriteResponse {
    favourite_id: number;
    product_id: number;
}

export interface FavouriteDetail {
    favourite_id: number;
    product_id_mongo: string;
    product_id_sql: number;
    name?: string;
    description: string;
    brand_id?: string 
    category_id?: string;
    status?: string;
    attributes?: {
        [key: string]: string | number | boolean;
    };
    created_at?: Date;
    colors: IProductColorResponse[];
}
export interface IInventoryItem {
    price: number | null;
    stock: number;
    sale_price: number | null;
    sale_stock: number;
    sale_sold: number;
}
export interface IProductColorResponse {
    _id: string | mongoose.Types.ObjectId;
    color?: string;
    is_main: boolean;
    image_main: string;
    color_images: (string | Express.Multer.File)[];
    sizes: IProductSizeResponse[];
}
  
export interface IProductSizeResponse {
    _id: string | mongoose.Types.ObjectId;
    size: string;
    price: number | null;
    stock: number;
    sale_price?: number | null;
    sale_stock?: number;
    sale_sold?: number;
}
