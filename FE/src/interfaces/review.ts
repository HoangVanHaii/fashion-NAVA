export interface CreateReviewPayload {
    order_item_id: number;
    rating: number; 
    comment: string;
    files?: File[]; 
}

export interface ReviewImage {
    secure_url: string;
    public_id: string;
}

export interface IReview {
    _id: string; 
    sql_id: number;
    review_id_sql: number;
    order_item_id: number;
    user_id: number;
    rating: number;
    comment: string;
    images: ReviewImage[];
    videos: ReviewImage[]; 
    createdAt: string;
}

export interface ProductStat {
    product_id: number;
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