export interface IBrandCreate {
    name: string;
    description: string;
    logo: string;
    status?: string;
}

export interface IBrandUpdate {
    brand_id: number;
    name?: string;
    description?: string | null;
    status?: string;
}

export interface IBrandResponse {
    brand_id: number;
    name: string;
    description: string | null;
    logo: string;
    status: string;
    created_at: Date;
}
export interface BrandRatingResult {
    average_rating: number;
    total_reviews: number;
}
