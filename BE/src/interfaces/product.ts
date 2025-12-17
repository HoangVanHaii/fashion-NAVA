import mongoose from "mongoose";

export interface IProductSQL {
    id?: string;
    brand_id: string;
    category_id: string;
    name: string;
    mongodb_id: string | mongoose.Types.ObjectId;
    status: 'active' | 'hidden' | 'banned';
    created_at?: Date;
}
  
export interface IBranchInventorySQL {
    id?: string;
    branch_id: string;
    product_id?: string;
    color_id_mongo: string; 
    size_id_mongo: string;  
    price: number;
    stock: number;
    created_at?: Date;
}
  
////

export interface IProductSizePayload {
    _id: string | mongoose.Types.ObjectId;
    size: string;
    price: number;
    stock: number;
}
  
export interface IProductColorPayload {
    _id?: string | mongoose.Types.ObjectId;
    color?: string;
    is_main: boolean;
    image_main: string | Express.Multer.File;
    color_images: (string | Express.Multer.File)[];
    sizes: IProductSizePayload[];
}
  
export interface IProductMongo {
    _id: mongoose.Types.ObjectId;
    product_id_sql: string;
    description: string;
    video?: string;
    attributes?: {
        [key: string]: string | number | boolean;
    };
    colors: IProductColorPayload[];
    created_at?: Date;
}


export interface updateSize {
    size_id_mongo: string | mongoose.Types.ObjectId;
    size?: string;
    price?: number;
    stock?: number;
}

export interface IUpdateProductColor {
    product_id_sql: string | mongoose.Types.ObjectId;
    color_id_mongo: string;
    color?: string;
    is_main?: boolean;
    image_main?: string | Express.Multer.File;
    color_images?: (string | Express.Multer.File)[];
    sizes?: updateSize[];
}


export interface UpdateProductInfo {
    product_id_sql: string;
    name?: string;
    description?: string;
    brand_id?: string;
    category_id?: string;
    attributes?: {
        [key: string]: string | number | boolean;
    };
}

/////

export interface IProductMongoDetail {
    _id: string | mongoose.Types.ObjectId;
    product_id_sql: string;
    name?: string;
    description: string;
    brand_id?: string;
    category_id?: string;
    status?: string;
    video?: string
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

///

export interface updateInventory{
    product_id: string;
    color_id_mongo: string | mongoose.Types.ObjectId;
    size_id_mongo: string | mongoose.Types.ObjectId;
    price?: number;
    stock?: number;
}
export interface deleteInventory{
    product_id: string;
    color_id_mongo: string | mongoose.Types.ObjectId;
    size_id_mongo: string | mongoose.Types.ObjectId;
}