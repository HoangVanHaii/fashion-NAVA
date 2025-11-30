export interface Voucher {
    id: string;
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
    created_by: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface UserVoucher {
    id?: number;
    voucher_id: number;
    user_id: number;
    used_date?: Date | null;
}
export interface UserVoucherDetail {
    id: number;
    voucher_id: number;
    code: string;
    description: string;
    discount_type: string;
    discount_value: number;
    start_date: Date;
    end_date: Date;
    used_date: Date | null;
  }
  