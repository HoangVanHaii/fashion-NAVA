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

export const searchByCategoryId = async (cat_id: string) => {
    const authStore = useAuthStore();

    const endpoint = authStore.isLogin
        ? `/product/category/${cat_id}`
        : `/product/public/category/${cat_id}`;

    const response = await api.get(endpoint);
    return response.data;
};
export const searchByCategoryGender = async (gender: string) => {
    const authStore = useAuthStore();
    const endpoint = authStore.isLogin
        ? `/product/category/gender?gender=${gender}`
        : `/product/public/category/gender?gender=${gender}`;

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

export const getAllProduct = async () => {
    const authStore = useAuthStore();

    const endpoint = authStore.isLogin
        ? `/product/`
        : `/product/public/`;

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
export const getProductBestSellerForAdmin = async (top: number, branch_code: string) => {
    const response = await api.get(`admin/product/best-seller`, {
        params: {
            top: top,
            branch: branch_code // Truyền branch code (HN, DN, HCM, CT)
        }
    });
    return response.data;
};
export const getProductLatest = async (top: number) => {
  const authStore = useAuthStore();
  const endpoint = authStore.isLogin
    ? `/product/public/new?top=${top}`
    : `/product/public/new?top=${top}`;

  const result = await api.get(endpoint);
  return result.data;
};
export const getProductByName = async (name: string) => {
  const result = await api.get(`/product/searchByName?name=${name}`);
  return result.data;
};



