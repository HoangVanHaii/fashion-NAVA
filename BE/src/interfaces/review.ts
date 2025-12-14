import { Types } from "mongoose";
export interface IReviewSQL {
  ID: string;            
  order_item_id: string;
  user_id: string;
  created_at?: Date;
  mongodb_id?: string;     
}

export interface FileData {
  secure_url: string;
  public_id: string;
}

export interface ReviewDTO {
  sql_id: string;            
  mongodb_id: Types.ObjectId;   
//   branch_code: string;
  order_item_id: string;
  user_id: string;
  rating?: number;
  comment?: string;
  created_at?:Date;
  images?: FileData[];
  videos?: FileData[];
}

export interface IChildReview {
  comment?: string;
  user_id?: string;
  images?: { secure_url: string; public_id: string }[];
  videos?: { secure_url: string; public_id: string }[];
  createdAt?: Date;
}

export interface ProductStat {
    product_id: string;
    product_name: string;
    total_reviews: number;
    avg_star: number;
    sum_rating?: number;      
    product_image: string;   
    total_5_star: number;
    total_4_star: number;
    total_3_star: number;
    total_2_star: number;
    total_1_star: number;
}