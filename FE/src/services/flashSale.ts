import { useAuthStore } from "@/stores/auth";
import api from "./api";
import type { FlashSaleItem } from "@/interfaces/flashSale";

export const getFlashSale = async () => {
    const authStore = useAuthStore();
    const endpoint = authStore.isLogin
        ? `/flashSale/public/flash-sale-home`
        : `/flashSale/public/flash-sale-home`;

    const result = await api.get(endpoint);
    return result.data;
}
export const getTotalSoldFlashSaleById = async (id: number) => {
    const result = await api.get(`/flashSale/totalSold/${id}`);
    return result.data;
}
export const createFlashSale = async (title: string, start_date: Date, end_date: Date) => {
    const result = await api.post(`/flashSale/`,{
        title: title,
        startDate: start_date,
        endDate: end_date
    });
    return result.data;
}
export const addFlashSaleItem = async (id: number, items: FlashSaleItem[]) => {
    const result = await api.post(`/flashSale/item/${id}`,{
        items
    });
    return result.data;
}
export const changeStatus = async (id: number) => {
    const result = await api.put(`/flashSale/${id}`);
    return result.data;
}
export const getFlashSaleActive = async () => {
    const result = await api.get(`/flashSale/flash-sale-active`);
    return result.data;
}
export const getProductNotSale = async () => {
    const result = await api.get(`/flashSale/productNotSale`);
    return result.data;
}

export const getProductActiveByFlashSaleId = async (flash_id: number) => {
    const result = await api.get(`/flashSale/productActive/${flash_id}`);
    return result.data;
}
export const getProductActiveByFlashSaleIdBranch = async (flash_id: number) => {
    const result = await api.get(`/flashSale/branch/productActive/${flash_id}`);
    return result.data;
}
export const getFlashSaleNotIn = async (excludeId: string) => {
    const authStore = useAuthStore();
    const endpoint = authStore.isLogin
        ? `/flashSale/public/active-not-in?excludeIds=${excludeId}`
        : `/flashSale/public/active-not-in?excludeIds=${excludeId}`;
    const result = await api.get(endpoint);
    return result.data;
}