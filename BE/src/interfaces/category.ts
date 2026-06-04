export interface Category {
    category_id?: number;       
    category_name: string;     
    description?: string;       
    status?: "active" | "inactive"; 
    gender: "Nam" | "Nữ" | "Khác"
  }
  