import api from "./api"; 
import type { ICartItem } from "../interfaces/cart";

const CART_BASE_URL = "/cart"; 

export const addToCart = async (payload: ICartItem) => {
    const res = await api.post(CART_BASE_URL, payload);
    return res.data; 
};

export const getCartItems = async () => {
    const res = await api.get(CART_BASE_URL);
    return res.data;
};

export const updateCartItemQuantity = async (cartItem_mongo_id: string, quantity: number) => {
    const res = await api.put(`${CART_BASE_URL}/updateItemQuantity/${cartItem_mongo_id}`, {
        newQuantity: quantity
    });
    return res.data;
};

export const updateCartItemVariant = async (cartItem_mongo_id: string, new_size_id_mongo: string) => {
    const res = await api.put(`${CART_BASE_URL}/updateItem/${cartItem_mongo_id}`, {
        size_id: new_size_id_mongo 
    });
    return res.data;
};

export const removeCartItem = async (cartItem_mongo_id: string) => {
    const res = await api.delete(`${CART_BASE_URL}/removeItem/${cartItem_mongo_id}`);
    return res.data;
};

export const clearCart = async () => {
    const res = await api.delete(`${CART_BASE_URL}/clearCart`);
    return res.data;
};