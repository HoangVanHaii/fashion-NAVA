export interface Address {
    id?: number;
    name: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    street_address: string;
    is_default?: boolean;
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