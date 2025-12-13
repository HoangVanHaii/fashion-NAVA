import api from "./api";

export const getFavouriteOfme = async () => {
    const response = await api.get('/favourite/detail');
    return response.data;
};
export const createFavourite = async (product_id: string) => {
    const response = await api.post('/favourite/', {
        product_id
    });
    return response.data;
};
export const deleteFavouriteOfme = async (product_id: string) => {
    const response = await api.delete(`/favourite/${product_id}`);
    return response.data;
};
