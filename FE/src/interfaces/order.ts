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

export interface Order {
    id?: string;
    user_id: string;
    voucher_id?: string | null;
    total: number;
    payment_method: 'cod' | 'vnpay' | 'momo' | 'credit_card' | 'paypal';
    address: OrderAddress;
    status?: 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';
    note?: string;
    created_at?: string;
}


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
}