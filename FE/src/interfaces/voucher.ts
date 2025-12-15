export interface Voucher {
    id: string; // BE mới dùng string (UUID)
    code: string;
    description?: string;
    discount_type: 'PERCENT' | 'FIXED';
    discount_value: number; 
    max_discount?: number; // Có thể null
    min_order_value: number;
    quantity: number;
    used: number;
    start_date: string; 
    end_date: string;
    status?: string;
    used_date?: string | null; 
    image_url?: string;
}