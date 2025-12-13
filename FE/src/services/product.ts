import type { IProductMongoDetail } from "@/interfaces/product";
import api from "./api";
import { useAuthStore } from "@/stores/auth";

export const getProductById = async (id: string) => {
    const authStore = useAuthStore();

    const endpoint = authStore.isLogin
        ? `/product/${id}`
        : `/product/public/${id}`;

    const response = await api.get(endpoint);
    return response.data;
}

export const searchByCategoryGender = async (genderId: string) => {
    const authStore = useAuthStore();

    const endpoint = authStore.isLogin
        ? `/product/category/${genderId}`
        : `/product/public/category/${genderId}`;

    const response = await api.get(endpoint);
    return response.data;
};
export const getCategoryNameById = async (id: string) => {
    const authStore = useAuthStore();

    const endpoint = authStore.isLogin
        ? `/category/${id}`
        : `/category/public/${id}`;

    const response = await api.get(endpoint);
    return response.data;
}
export const getRatingOfbrand = async (id: string) => {
    const authStore = useAuthStore();

    const endpoint = authStore.isLogin
        ? `/brand/rating/${id}`
        : `/brand/public/rating/${id}`;

    const response = await api.get(endpoint);
    return response.data;
}
export const getBrandNameById = async (id: string) => {
    const authStore = useAuthStore();

    const endpoint = authStore.isLogin
        ? `/brand/detail/${id}`
        : `/brand/public/detail/${id}`;

    const response = await api.get(endpoint);
    return response.data;
}
export const getProductByBrandId = async (id: string) => {
    const authStore = useAuthStore();

    const endpoint = authStore.isLogin
        ? `/product/brand/${id}`
        : `/product/public/brand/${id}`;

    const response = await api.get(endpoint);
    return response.data;
}


export const getProductIdBySize = async (sizeId: string) =>{
    const res = await api.get(`/product/id-by-size/${sizeId}`);
    return res.data;
}

export const getProductSizesBySizeId = async (size_id: string): Promise<IProductMongoDetail> =>{
    const res = await api.get(`/product/size-detail/${size_id}`);
    const product_size = res.data;
    return product_size;
}
export const getProductByCategory = async (categoryName: string) => {
    const response = await api.get(`/product/searchByCategory?categoryNames=${categoryName}`);
    return response.data;
}
export const getProductBestSeller = async (id: string) => {
    const result = await api.get(`/product/best-sellers?limit=${id}`);
    return result.data;
}
export const getProductLatest = async (id: string) => {
    const result = await api.get(`/product/latest?limit=${id}`);
    return result.data;
}
export const getProductByName = async (name: string) => {
    const result = await api.get(`/product/searchByName?name=${name}`);
    return result.data;
}
export const getAllProductActive = async () => {
    const result = await api.get(`/product/actives`);
    return result.data;
}

//
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



