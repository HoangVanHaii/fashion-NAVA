    export interface IProductSQL {
        id?: number;
        brand_id: number;
        category_id: number;
        name: string;
        mongodb_id: string;
        status: 'active' | 'hidden' | 'banned';
        created_at?: Date;
    }
    
    export interface IBranchInventorySQL {
        id?: number;
        branch_id: number;
        product_id?: number;
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
        product_id_sql: number;
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
        product_id_sql: number;
        color_id_mongo: string;
        color?: string;
        is_main?: boolean;
        image_main?: string | File;
        color_images?: (string | File)[];
        sizes?: updateSize[];
    }


    export interface UpdateProductInfo {
        product_id_sql: number;
        name?: string;
        description?: string;
        brand_id?: number;
        category_id?: number;
        attributes?: {
            [key: string]: string | number | boolean;
        };
    }

    /////

    export interface IProductMongoDetail {
        _id: string;
        product_id_sql: number;
        name?: string;
        description: string;
        brand_id?: number;
        category_id?: number;
        status?: string;
        attributes?: {
            [key: string]: string | number | boolean;
        };
        video?: string;
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
    export interface updateInventory {
        product_id: number;
        color_id_mongo: string;
        size_id_mongo: string;
        price?: number;
        stock?: number;
    }
    export interface deleteInventory {
        product_id: number;
        color_id_mongo: string;
        size_id_mongo: string;
    }
