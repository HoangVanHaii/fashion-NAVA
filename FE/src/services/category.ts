import { useAuthStore } from "@/stores/auth";
import api from "./api";

export const getCategoryName = async (gender: string) => {
    const authStore = useAuthStore();
    const endpoint = authStore.isLogin
        ? `/category/categoryName?gender=${gender}`
        : `/category/public/categoryName?gender=${gender}`;
    const response = await api.get(endpoint);
    return response.data;
};
export const getActiveCategory = async () => {
    const response = await api.get(`/category/active`);
    return response.data;
};
export const getActiveCategoryDetail = async (category_id: string) => {
    const response = await api.get(`/category/active/${category_id}`);
    return response.data;
};
///public

export const getActiveCategoryPublic = async () => {
    const response = await api.get(`/category/public/active`);
    return response.data;
};
export const getActiveCategoryDetailPublic = async (category_id: string) => {
    const response = await api.get(`/category/public/active/${category_id}`);
    return response.data;
};
