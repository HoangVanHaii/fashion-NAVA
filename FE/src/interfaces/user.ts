    
export interface User {
    id: string; // Map từ ID
    name: string;
    email: string;
    phone: string;
    date_of_birth?: string;
    gender: "male" | "female" | "other";
    avatar: string;
    role: "customer" | "employee" | "admin";
    status: "active" | "banned";
    is_verified: boolean;
    created_at: string;
    branch?: string; // Thêm trường chi nhánh
    preferences: UserPreferences;
    
    city_code?: number | null;
    city_name?: string;
    district_code?: number | null;
    district_name?: string;
    ward_code?: number | null;
    ward_name?: string;
    address?: string;
}
export interface UserPreferences {
    [key: string]: any;
}
  
export interface CreateAccountPayload {
    name: string;
    email: string;
    password: string;
    phone: string;
    date_of_birth: string; // ISO string: "YYYY-MM-DD"
    gender: "male" | "female" | "other";
    province: string;
    district: string;
    ward: string;
    street_address?: string;
    bio?: string;
    preferences?: any;
    role: "customer" | "employee" | "admin";
}
