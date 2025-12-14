export interface Voucher {
    id: string; // BE mới dùng string (UUID)
    code: string;
    description?: string;
    discount_type: 'PERCENT' | 'FIXED';
    discount_value: number; 
    max_discount?: number; // Có thể null
    min_order_value: number;
    quantity: number;
    start_date: string; // ISO String
    end_date: string; // ISO String
    // Các trường bổ sung cho FE hiển thị (nếu BE trả về user_vouchers join với vouchers)
    used_date?: string | null; 
    image_url?: string; // Tạm thời optional, nếu BE không có sẽ dùng ảnh mặc định
}