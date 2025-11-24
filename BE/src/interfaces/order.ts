import { Document } from 'mongoose';
import { Address } from './address';

export interface Order {
    id?: string;
    user_id: string;
    voucher_id?: string;
    discount_value?: number;
    total: number;
    payment_method: 'cod' | 'credit_card' | 'paypal' | 'vnpay' | 'momo';
    address: Address
    status?: 'pending' | 'confirm' | 'shipped' | 'completed' | 'cancelled';
    created_at?: Date;
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

export interface IOrderDetail extends Document {
    order_id_sql: string;
    items: IOrderItem[];
    
    created_at: Date;
    updatedAt: Date;
}

export interface GetOrder {
    id: string;
    user_id: string;
    voucher_id?: string;
    total: number;
    mongo_id?: string;
    payment_method: 'cod' | 'credit_card' | 'paypal' | 'vnpay' | 'momo';
    address: Address;
    status?: 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';
    created_at?: Date;
    items: IOrderItem[];

}

export interface StatisticalOrder {
    order_pending: number;
    order_confirmed: number;
    order_completed: number;
    order_shipped: number;
    order_cancelled: number;
    product_banned: number;

    revenue: number;
    total_order: number;
}
//     order_id_sql: string;
//     items: IOrderItem[];

//     created_at: Date;
//     updatedAt: Date;
// }