import api from "./api"; // <--- CHỈ ĐƯỢC CÓ 1 DÒNG NÀY THÔI
import type { CreateReviewPayload } from "../interfaces/review";

// --- CÁC HÀM GET ---
export const getReviewsByProductId = async (product_id: number) => {
    const res = await api.get(`/review/product/${product_id}`);
    return res.data;
};

export const getReviewsByProductIdGuest = async (product_id: number) => {
    const res = await api.get(`/review/product/${product_id}/guest`);
    return res.data;
};

export const getReviewsByOrderItemIdOfMe = async (order_item_id: number) => {
    const response = await api.get(`/review/review_of_me/${order_item_id}`);
    return response.data;
};

export const getAllProductStats = async () => {
    const response = await api.get(`/review/stats/products/all`);
    return response.data;
};

export const getAllProductStatsCentral = async () => {
    const response = await api.get(`/review/admin/products/central`);
    return response.data;
};

export const getTopDiscussedByProduct = async (product_id: number) => {
    const response = await api.get(`/review/product/${product_id}/top-discussed`);
    return response.data;
};

// --- CÁC HÀM POST/PUT/DELETE ---

export const createReview = async (payload: CreateReviewPayload) => {
    const formData = new FormData();
    formData.append("order_item_id", String(payload.order_item_id));
    formData.append("rating", String(payload.rating));
    formData.append("comment", payload.comment);

    if (payload.files && payload.files.length > 0) {
        payload.files.forEach((file) => {
            formData.append("review_files", file);
        });
    }
    const res = await api.post("/review", formData);
    return res.data;
};

// [QUAN TRỌNG] Hàm trả lời
export const addChildReview = async (parentId: string, comment: string, files?: File[]) => {
    const formData = new FormData();
    formData.append("comment", comment);
    
    if (files && files.length > 0) {
        files.forEach((file) => {
            formData.append("review_files", file); 
        });
    }

    const res = await api.post(`/review/child/${parentId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
};

export const updateChildReview = async (parentId: string, childId: string, comment: string, files?: File[]) => {
    const formData = new FormData();
    formData.append("child_id", childId); 
    formData.append("comment", comment);

    if (files && files.length > 0) {
        files.forEach((file) => {
            formData.append("review_files", file);
        });
    }

    const res = await api.put(`/review/child/${parentId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
};

export const deleteChildReview = async (parentId: string, childId: string) => {
    const res = await api.delete(`/review/child/${parentId}/${childId}`);
    return res.data;
};

export const deleteReview = async (reviewIdSql: string, mongoId: string) => {
    const res = await api.delete(`/review/${reviewIdSql}/${mongoId}`);
    return res.data;
};