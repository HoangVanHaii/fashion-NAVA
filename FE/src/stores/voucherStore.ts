import { defineStore } from "pinia";
import { ref } from "vue";
import { getUserVouchers, claimVoucherByCode } from "../services/voucher";
import type { Voucher } from "../interfaces/voucher"; // Đảm bảo import đúng Interface bạn đã tạo

export const useVoucherStore = defineStore('voucher', () => {
    
    // State
    const myVouchers = ref<Voucher[]>([]); // Danh sách voucher của user
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Actions
    const fetchUserVouchersAction = async () => {
        loading.value = true;
        error.value = null;
        try {
            const res = await getUserVouchers();
            if (res.success) {
                myVouchers.value = res.data;
            }
        } catch (err: any) {
            console.error("Error fetching vouchers:", err);
            error.value = err.response?.data?.message || "Không thể tải danh sách voucher";
        } finally {
            loading.value = false;
        }
    };

    const claimVoucherAction = async (code: string) => {
        loading.value = true;
        error.value = null;
        try {
            const res = await claimVoucherByCode(code);
            if (res.success) {
                // Sau khi claim thành công, tải lại danh sách ngay lập tức
                await fetchUserVouchersAction();
                return { success: true, message: "Lưu mã voucher thành công!" };
            }
            throw new Error("Lưu mã thất bại.");
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || "Lỗi khi lưu mã voucher";
            error.value = msg;
            throw new Error(msg);
        } finally {
            loading.value = false;
        }
    };

    return {
        // State
        myVouchers,
        loading,
        error,
        
        // Actions
        fetchUserVouchersAction,
        claimVoucherAction
    };
});