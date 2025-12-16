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
    order_item_id?: string;
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

// export interface Order {
//     id?: string;
//     user_id: string;
//     voucher_id?: string | null;
//     total: number;
//     payment_method: 'cod' | 'vnpay' | 'momo' | 'credit_card' | 'paypal';
//     address: OrderAddress;
//     status?: 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';
//     note?: string;
//     created_at?: string;
// }


export interface OderPayLoad {
    order: Order;
    orderItems: OrderItem[];
}

export interface OrderAddress {
    name: string;
    phone: string;
    province: string;      
    district: string;       
    ward: string;           
    street_address: string; 
    full_address?: string;  
}

export interface CreateOrderPayload {
    orderItems: {
        size_id: string; 
        quantity: number;
        price?: number; 
    }[];
    voucherCode?: string; 
    address: OrderAddress;
    methodPayment: string; 
    note?: string;
    checkout_source?: "cart" | "buy_now";
}
export interface OderPayLoad {
    order: Order;
    orderItems: OrderItem[];
}


export interface IOrderItem {
    order_item_id?: string;
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
