import { getFlashSale, getTotalSoldFlashSaleById, getFlashSaleNotIn, getFlashSaleActive, getProductActiveByFlashSaleId, createFlashSale, getProductNotSale, addFlashSaleItem, changeStatus, getProductActiveByFlashSaleIdBranch } from "../services/flashSale";
import { defineStore } from "pinia";
import type { FlashSale, FlashSaleItem, FlashSaleProductSold } from "../interfaces/flashSale";
import { ref } from "vue";

export const flashSaleStore = defineStore("flashSale", () => {

    const flashSales = ref<FlashSale | null>(null);
    const hotDeal1 = ref<FlashSale | null>(null);
    const hotDeal2 = ref<FlashSale | null>(null);
    const error = ref<string | null>(null);
    const loading = ref<boolean>(false);
    const totalSolds = ref<FlashSaleProductSold[]>([]);
    const listFlashSale = ref<FlashSale[]>([]);

    const getFlashSaleHome = async () => {
        flashSales.value = null;
        error.value = null;
        loading.value = true;
        try {
            const data = await getFlashSale();
            return {
                flash_sale: data.flash_sale,
                products: data.products
            };

        } catch (err) {
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    const getFlashSaleHotDeal1NotIN = async (excludeId: string) => {
        loading.value = true;
        hotDeal1.value = null;
        error.value = null;
        try {
            const data = await getFlashSaleNotIn(excludeId);
            return {
                flash_sale: data.flash_sale,
                products: data.products
            };
        } catch (err) {
            console.log(err);
        } finally {
            loading.value = false
        }
    }
    const getProductNotSaleStore = async (branch_code: string) => {
        loading.value = true;
        hotDeal1.value = null;
        error.value = null;
        try {
            const data = await getProductNotSale(branch_code);
            return data.products;
        } catch (err) {
            console.log(err);
        } finally {
            loading.value = false
        }
    }
    const getFlashSaleHotDeal2NotIN = async (excludeId: string) => {
        hotDeal2.value = null;
        error.value = null;
        loading.value = true;
        try {
            const data = await getFlashSaleNotIn(excludeId);
            return {
                flash_sale: data.flash_sale,
                products: data.products
            };
        } catch (err) {
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    const createFlashSaleStore = async (title: string, start_date: Date, end_date: Date) => {
        hotDeal2.value = null;
        error.value = null;
        loading.value = true;
        try {
            await createFlashSale(title, start_date, end_date);
        } catch (err) {
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    const changeStatusStore = async (id: string) => {
        hotDeal2.value = null;
        error.value = null;
        loading.value = true;
        try {
            await changeStatus(id)
        } catch (err) {
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    const addFlashSaleItemStore = async (id: string, items: FlashSaleItem[], branch_code: string) => {
        hotDeal2.value = null;
        error.value = null;
        loading.value = true;
        try {
            const res = await addFlashSaleItem(id, items, branch_code)
            return res
        } catch (err) {
            console.log("err",  err);
        } finally {
            loading.value = false;
        }
    }
    const getTotalSoldFlashSaleByIdStore = async (id: number) => {
        totalSolds.value = [];
        loading.value = true;
        try {
            const result = await getTotalSoldFlashSaleById(id);
            return result.data;
        } catch (err) {
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    const getFlashSaleActiveStore = async () => {
        loading.value = true;
        try {
            const result = await getFlashSaleActive();
            listFlashSale.value = result.flash_sale;
            return result.flash_sale;
        } catch (err) {
            loading.value = false;
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    const getProductActiveByFlashSaleIdStore = async (flash_id: string) => {
        loading.value = true;
        try {
            const result = await getProductActiveByFlashSaleId(flash_id);
            return result.data;
        } catch (err) {
            loading.value = false;
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    const getProductActiveByFlashSaleIdBranchStore = async (flash_id: string, branch_code: string) => {
        loading.value = true;
        try {
            const result = await getProductActiveByFlashSaleIdBranch(flash_id, branch_code);
            return result.data;
        } catch (err) {
            loading.value = false;
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    return { loading, error, createFlashSaleStore, getProductActiveByFlashSaleIdBranchStore, changeStatusStore, addFlashSaleItemStore, getProductNotSaleStore, flashSales, hotDeal1, hotDeal2, totalSolds, listFlashSale, getFlashSaleHome, getTotalSoldFlashSaleByIdStore, getFlashSaleHotDeal1NotIN, getFlashSaleHotDeal2NotIN, getFlashSaleActiveStore, getProductActiveByFlashSaleIdStore }
})



