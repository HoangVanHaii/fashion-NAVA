import type { Address } from './address';

export interface Order {
    id?: string;
    user_id: string;
    voucher_id?: string;
    total: number;
    discount_value: number;
    payment_method: 'cod' | 'credit_card' | 'paypal' | 'vnpay' | 'momo';
    address?: Address
    status?: 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';
    created_at?: Date;
    note?: string;
    method_order?: string
}
export interface OrderItem {
    id?: string;
    order_id?: string;
    size_id_mongo: string;
    size: string;
    color: string;
    product_id_sql: string;
    product_name: string;
    quantity: number;
    price: number;
    image: string;
    flash_sale_price?: number;
}
export interface OderPayLoad {
    order: Order;
    orderItems: OrderItem[];
}


export interface IOrderItem {
    product_id_sql: string;
    size_id_mongo: string;

    product_name: string;
    image: string;
    color: string;
    size: string;

    quantity: number;
    price: number;
    flash_sale_price?: number;
}

export interface GetOrder {
    id: string;
    user_id: string;
    voucher_id?: string;
    total: number;
    discount_value: number;
    user_name_buyer?: string;
    mongo_id?: string;
    payment_method: 'cod' | 'credit_card' | 'paypal' | 'vnpay' | 'momo';
    payment_status?: string;
    address: any;
    status?: 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';
    created_at?: Date;
    items: IOrderItem[];
    method_order?: string;
    note?: string
}

export interface StatisticalOrder {
    order_pending: number;
    order_confirmed: number;
    order_completed: number;
    order_shipped: number;
    order_cancelled: number;
}
export interface RevenueOrder {
    revenue: number;
    total_order_online: number;
    total_order_offline: number;
    percentageChange: number
}
//     order_id_sql: string;
//     items: IOrderItem[];

//     created_at: Date;
//     updatedAt: Date;
// }