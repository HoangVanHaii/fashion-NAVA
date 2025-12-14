import api from "./api"; 
import type { CreateReviewPayload } from "../interfaces/review";

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

export const getReviewsByOrderItemIdOfMe = async (order_item_id: string) =>{
  const response = await api.get(`/review/review_of_me/${order_item_id}`);
  return response.data;
}

export const getAllProductStats = async (branchCode?: string) => {
    const response = await api.get(`/review/stats/products/all`, {
        params: {
            branch: branchCode 
        }
    });
    return response.data;
}

export const getAllProductStatsCentral = async () => {
    const response = await api.get(`/review/admin/products/central`);
    return response.data;
}

export const getTopDiscussedByProduct = async (product_id: string) => {
    const response = await api.get(`/review/product/${product_id}/top-discussed`);
    return response.data;
}

export const getReviewsByProductId = async (product_id: string, branch_code?: string) => {
    const res = await api.get(`/review/product/${product_id}`, {
        params: branch_code ? { branch: branch_code } : {} 
    });

    return res.data;
}

export const deleteChildReview = async (parentId: string, childId: string) => {
    const res = await api.delete(`/review/child/${parentId}/${childId}`);
    return res.data;
}

