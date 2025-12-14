import { defineStore } from "pinia";
import { ref } from "vue";
import { createOrder } from "../services/order"; 
import type { CreateOrderPayload } from "../interfaces/order";

export const useOrderStore = defineStore('order', () => {
    const loading = ref(false);
    const error = ref<string | null>(null);

    // --- ACTION DUY NHẤT: TẠO ĐƠN HÀNG ---
    const createOrderAction = async (payload: CreateOrderPayload) => {
        loading.value = true;
        error.value = null;
        try {
            const data = await createOrder(payload);
            
            return { 
                success: true, 
                data: data, 
                message: "Tạo đơn hàng thành công" 
            };

        } catch (err: any) {
            console.error("Create Order Error:", err);
            const msg = err.response?.data?.message || "Đặt hàng thất bại";
            error.value = msg;
            return { success: false, message: msg };
        } finally {
            loading.value = false;
        }
    };

    return { 
        loading, 
        error, 
        createOrderAction 
    };
});