export interface Address {
    name: string;
    phone: string;
    province: string; 
    district: string;
    ward: string;
    street_address: string;
}

export interface Address_Order {
    id?: number; 
    user_id: number; 
    name: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    street_address: string;
    is_default: boolean;
}