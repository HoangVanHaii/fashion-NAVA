import type { IProductMongoDetail } from "./product";
export interface FlashSale {
    id?: string
    title: string;
    start_date: Date;
    end_date: Date;
    status?: string;
    created_by: string;
    created_at?: Date;
    items?: FlashSaleItem[];
    is_participate?: boolean
}
export interface FlashSaleItem {
    flash_sale_id?: string;
    product_id?: string; 
    color_id_mongo?: string;
    size_id_mongo?: string
    product_name?: string;
    flash_sale_price: number;
    stock: number;
    sold?: number;
    status?: string;
    created_at?: Date;
}
export interface ImageProducts {
    color_id: string;
    image_url: string;
  items?: FlashSaleItem[];
  is_participate?: boolean
}
export interface FlashSaleItem {
  flash_sale_id?: string;
  product_id?: string;
  color_id_mongo?: string;
  size_id_mongo?: string
  product_name?: string;
  flash_sale_price: number;
  stock: number;
  sold?: number;
  status?: string;
  created_at?: Date;
}
export interface ImageProducts {
  color_id: string;
  image_url: string;
}
export interface FlashSaleProductSold {
  product_id: string;
  total_flash_sale_sold: number;
  total_stock: number;
}
