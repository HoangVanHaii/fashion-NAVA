export interface FavouritePayload {
    user_id: number;
    product_id: number;
    created_at?: Date;
}

export interface FavouriteItem {
    product_id: number;
    product_name: string;
    image_url: string
    price: number;
    flash_price: number
    color?: string;
    size?: string;
}
export interface FavouriteSummary {
    user_id: number;
    shop_id: number;
    shop_name: string;
    products: FavouriteItem[];
    created_at?: Date;
}