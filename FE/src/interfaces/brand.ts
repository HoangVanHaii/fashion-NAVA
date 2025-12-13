export interface IBrandCreate {
    name: string;
    description: string;
    logo: string | File;
    status?: string;
}

export interface IBrandUpdate {
    brand_id: string;
    name?: string;
    description?: string | null;
    status?: string;
}

export interface IBrandResponse {
    brand_id: string;
    name: string;
    description: string | null;
    logo: string;
    status: string;
    created_at: Date;
}
