import api from "./api"; // Axios instance của bạn
import type { CreateOrderPayload } from "../interfaces/order";

export const createOrder = async (payload: CreateOrderPayload) => {
    const response = await api.post("/order/createOrder", payload);
    return response.data;
}
export const getOrderOfMe = async () => {
    const response = await api.get('/order/me');
    return response.data;
};