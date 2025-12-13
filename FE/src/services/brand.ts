import api from "./api";

export const getAllBrand = async () => {
    const response = await api.get(`/brand/all`);
    return response.data;
};
export const getBrandDetail = async (brand_id: string) => {
    const response = await api.get(`/brand/detail/${brand_id}`);
    return response.data;
};
//public
export const getAllBrandPublic = async () => {
    const response = await api.get(`/brand/public`);
    return response.data;
};
export const getBrandDetailPublic = async (brand_id: string) => {
    const response = await api.get(`/brand/public/detail/${brand_id}`);
    return response.data;
};

