import type { Voucher, VoucherAdmin } from "../interfaces/voucher";
import { getTop4Voucher, getAllVoucher, getVoucherByCode, getAllVoucherByShopId, getVoucherById, createVoucher, updateVoucher } from "../services/voucher";
import { defineStore } from "pinia";
import { ref } from "vue";

export const voucherStore = defineStore("voucher", () => {

    const getTop4VoucherGlobal = async () => {

        try {
            const data = await getTop4Voucher(4, "global");
            return data.vouchers;
        } catch (err) {
            console.log(err);
        }
    }
    const getAllVoucherStore = async () => {
        try {
            const result = await getAllVoucher();
            return result.vouchers;
        } catch (err) {
            console.log(err);
        }
    }
    const getVoucherByCodeStore = async(code: string) => {
        try {
            const result = await getVoucherByCode(code);
            return result.voucher as Voucher;
        } catch (err) {
            console.log(err);
            return null;
        }
    }
    const getVoucherByIdStore = async(id: number) => {
        try {
            const result = await getVoucherById(id)
            return result.voucher;
        } catch (err) {
            console.log(err);
            return null;
        }
    }
    const getAllVoucherByShopIdStore = async(id: number) => {
        try {
            const result = await getAllVoucherByShopId(id)
            return result.vouchers;
        } catch (err) {
            console.log(err);
            return null;
        }
    }
    const success = ref(false);
    const createVoucherStore = async(voucher: VoucherAdmin) => {
        try {
            success.value = false;
            console.log("Chờ")
            const result = await createVoucher(voucher)
            success.value = true;
            return result.vouchers;
        } catch (err : any) {
            console.log("Failed Error", err);
            success.value = false;
            return null;
        }
    }
    const updateVoucherStore = async(voucher: VoucherAdmin) => {
        try {
            success.value = false;
            console.log("Chờ", voucher)
            const result = await updateVoucher(voucher)
            success.value = true;
            return result.vouchers;
        } catch (err : any) {
            console.log("Failed Error", err);
            success.value = false;
            return null;
        }
    }
    return { getTop4VoucherGlobal,createVoucherStore, updateVoucherStore, success, getAllVoucherByShopIdStore, getAllVoucherStore, getVoucherByCodeStore, getVoucherByIdStore}
})



