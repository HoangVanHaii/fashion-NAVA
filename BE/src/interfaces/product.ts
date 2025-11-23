export interface IProductSQL {
    id?: string;
    brand_id: string;
    category_id: string;
    name: string;
    mongodb_id: string | null;
    status: 'active' | 'hidden' | 'banned';
    created_at?: Date;
}
  
export interface IBranchInventorySQL {
    id?: string;
    branch_id: string;
    product_id?: string;
    color_id_mongo: string | null; 
    size_id_mongo: string | null;  
    price: number;
    stock: number;
    created_at?: Date;
}
  
////

export interface IProductSizeMongo {
    _id: string | null;
    size: string;
    price: number;
    stock: number;
}
  
export interface IProductColorMongo {
    _id: string | null;
    color?: string;
    is_main: boolean;
    image_main: string | Express.Multer.File;
    color_images: (string | Express.Multer.File)[];
    sizes: IProductSizeMongo[];
}
  
export interface IProductDetailMongo {
    _id: string | null;
    name: string; 
    description: string;
    attributes?: {
        [key: string]: string | number | boolean;
    };
    colors: IProductColorMongo[];
    created_at?: Date;
}