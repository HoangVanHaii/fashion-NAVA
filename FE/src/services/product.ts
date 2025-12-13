import api from "./api";
import type { ProductSize } from "../interfaces/product";
import { useAuthStore } from "@/stores/auth";

export const getProductIdBySize = async (sizeId: number) => {
  const res = await api.get(`/product/id-by-size/${sizeId}`);
  return res.data;
};

export const getProductSizesBySizeId = async (
  size_id: number
): Promise<ProductSize> => {
  const res = await api.get(`/product/size-detail/${size_id}`);
  const product_size = res.data;
  return product_size;
};

export const searchByCategoryGender = async (gender: string) => {
    const authStore = useAuthStore();
    const endpoint = authStore.isLogin
        ? `/product/category/gender?gender=${gender}`
        : `/product/public/category/gender?gender=${gender}`;

    const response = await api.get(endpoint);
  return response.data;
};
export const getProductById = async (id: number) => {
  const response = await api.get(`/product/${id}`);
  return response.data;
};
export const getProductByCategory = async (categoryName: string) => {
  const response = await api.get(
    `/product/searchByCategory?categoryNames=${categoryName}`
  );
  return response.data;
};
export const getProductBestSeller = async (top: number) => {
  const authStore = useAuthStore();
  const endpoint = authStore.isLogin
    ? `/product/best-seller?top=${top}`
    : `/product/public/best-seller?top=${top}`;

  const response = await api.get(endpoint);
  return response.data;
};
export const getProductLatest = async (top: number) => {
  const authStore = useAuthStore();
  const endpoint = authStore.isLogin
    ? `/product/new?top=${top}`
    : `/product/public/new?top=${top}`;

  const result = await api.get(endpoint);
  return result.data;
};
export const getProductByName = async (name: string) => {
  const result = await api.get(`/product/searchByName?name=${name}`);
  return result.data;
};
export const getProductByShop = async (id: number) => {
  const result = await api.get(`/product/searchByShop?shop_id=${id}`);
  return result.data;
};
export const getAllProductActive = async () => {
  const result = await api.get(`/product/actives`);
  return result.data;
};
