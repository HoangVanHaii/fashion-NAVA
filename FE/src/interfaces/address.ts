export interface Address {
    id?: string;
    name: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    street_address: string;
    is_default?: boolean;
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