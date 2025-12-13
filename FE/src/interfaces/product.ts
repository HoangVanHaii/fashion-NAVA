export interface IProductSQL {
    id?: string;
    brand_id: string;
    category_id: string;
    name: string;
    mongodb_id: string;
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
    _id?: string;
    size: string;
    price: number;
    stock: number;
}
  
export interface IProductColorPayload {
    _id?: string;
    color?: string;
    is_main: boolean;
    image_main: string | File;
    color_images: (string | File)[];
    sizes: IProductSizePayload[];
}
  
export interface IProductMongo {
    _id: string;
    product_id_sql: string;
    description: string;
    attributes?: {
        [key: string]: string | number | boolean;
    };
    colors: IProductColorPayload[];
    created_at?: Date;
}


export interface updateSize {
    size_id_mongo: string;
    size?: string;
    price?: number;
    stock?: number;
}

export interface IUpdateProductColor {
    product_id_sql: string;
    color_id_mongo: string;
    color?: string;
    is_main?: boolean;
    image_main?: string | File;
    color_images?: (string | File)[];
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
    _id: string;
    product_id_sql: string;
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
export interface IProductColorResponse {
    _id: string;
    color?: string;
    is_main: boolean;
    image_main: string;
    color_images: (string | File)[];
    sizes: IProductSizeResponse[];
}
  
export interface IProductSizeResponse {
    _id: string;
    size: string;
    price: number | null;
    stock: number;
    sale_price?: number | null;
    sale_stock?: number;
    sale_sold?: number;
}

///
export interface IInventoryItem {
    price: number | null;
    stock: number;
    sale_price: number | null;
    sale_stock: number;
    sale_sold: number;
}
export interface updateInventory{
    product_id: string;
    color_id_mongo: string;
    size_id_mongo: string;
    price?: number;
    stock?: number;
}
export interface deleteInventory{
    product_id: string;
    color_id_mongo: string;
    size_id_mongo: string;
}













///

export interface ProductSummary {
    id: number;
    name: string;
    shop_id?: number;
    description?: string;
    category_name: string;
    thumbnail?: string;
    min_price: number;
    max_price: number;
    sold_quantity: number;
    avg_rating: number;
    flash_price?: number;
    images: string[];
}
export interface ProductPayload {
    id?: number,
    shop_id: number;
    shop_name?: string;
    category_id: number;
    category_name?: string;
    name: string;
    description?: string;
    status?: string;
    colors: ProductColor[];
    sold_product?: number;
}

export interface ProductColor {
    id?: number,
    product_id?: number,
    color: string,
    image_url: string;
    is_main?: boolean,
    sizes: ProductSize[];
    images?: string[];
    sold_count?: number

}
export interface ProductSize {
    product_id?: number;
    id?: number;
    size: string;
    stock: number;
    price: number;
    flash_sale_price?: number;
}
