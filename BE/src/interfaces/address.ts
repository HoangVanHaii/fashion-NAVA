export interface Address {
    name: string;
    phone: string;
    province: string; 
    district: string;
    ward: string;
    street_address: string;
}

export interface Address_Order {
    id?: string; 
    user_id: string; 
    name: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    street_address: string;
    is_default: boolean;
}