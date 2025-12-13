import api from "./api";

export const getOrderOfMe = async () => {
    const response = await api.get('/order/me');
    return response.data;
};