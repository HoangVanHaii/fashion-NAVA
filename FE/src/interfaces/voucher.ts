export interface Voucher {
    id?: number;
    code: string;
    description?: string;
    discount_type: 'PERCENT' | 'FIXED';
    discount_value: number; 
    max_discount: number;
    min_order_value: number;
    quantity: number;
    used?: number;
    start_date: Date;
    end_date: Date;
    created_by: number;
    scope: 'GLOBAL' | 'SHOP';
    shop_id?: number;
    image_url: string;
    created_at?: Date;
    updated_at?: Date;
}