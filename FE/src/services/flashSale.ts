import { useAuthStore } from "@/stores/auth";
import api from "./api";

export const getFlashSale = async () => {
    const authStore = useAuthStore();
    const endpoint = authStore.isLogin
        ? `/flashSale/flash-sale-home`
        : `/flashSale/public/flash-sale-home`;

    const result = await api.get(endpoint);
    return result.data;
}
export const getTotalSoldFlashSaleById = async (id: number) => {
    const result = await api.get(`/flashSale/totalSold/${id}`);
    return result.data;
}
export const getFlashSaleActive = async () => {
    const result = await api.get(`/flashSale/flash-sale-active`);
    console.log(result);
    return result.data;
}

export const getProductActiveByFlashSaleId = async (flash_id: string) => {
    const result = await api.get(`/flashSale/productActive/${flash_id}`);
    return result.data;
}
export const getFlashSaleNotIn = async (excludeId: string) => {
    const authStore = useAuthStore();
    const endpoint = authStore.isLogin
        ? `/flashSale/active-not-in?excludeIds=${excludeId}`
        : `/flashSale/public/active-not-in?excludeIds=${excludeId}`;
    const result = await api.get(endpoint);
    return result.data;
}