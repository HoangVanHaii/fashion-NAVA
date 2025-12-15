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

export interface VoucherAdmin {
    ID?: string;
    code: string;
    description?: string;
    discount_type: "PERCENT" | "FIXED";
    discount_value: number;
    max_discount: number; // Theo interface của bạn là number (nếu không giới hạn có thể để số rất lớn hoặc 0 tùy logic BE)
    min_order_value: number;
    quantity: number;
    used?: number;
    start_date: Date;
    end_date: Date;
    created_by: string; // Vẫn giữ trong interface để đúng kiểu dữ liệu
    created_at?: Date;
    updated_at?: Date;
  }