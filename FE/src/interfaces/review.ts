export interface CreateReviewPayload {
    order_item_id: string;
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
    sql_id: string;
    review_id_sql: string;
    order_item_id: string;
    user_id: string;
    rating: number;
    comment: string;
    images: ReviewImage[];
    videos: ReviewImage[]; 
    createdAt: string;
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