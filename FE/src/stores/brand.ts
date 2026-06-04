import { ref } from 'vue';
import { defineStore } from "pinia";
import { getBrandDetail, getAllBrand, getAllBrandPublic, getBrandDetailPublic } from '@/services/brand';
export const useBrandStore = defineStore('brand', () => {
    const loading = ref<boolean>(false);
    const getAllBrandStore = async () => {
        loading.value = true;
        try {
            const token = localStorage.getItem('accessToken');
            if (token) {
                const res = await getAllBrand();
                return res.brands;
            } else {
                const res = await getAllBrandPublic();
                return res.brands;
            }
        } catch (error) {
            console.error(error);
        } finally {
            loading.value = false;
        }
    }
    const getBrandDetailStore = async (brand_id: number) => {
        loading.value = true;
        try {
            const token = localStorage.getItem('accessToken'); 
            if (token) {
                const res = await getBrandDetail(brand_id);
                return res.data;
            } else {
                const res = await getBrandDetailPublic(brand_id);
                return res.data;
            }
            
        } catch (error) {
            console.error(error);
        } finally {
            loading.value = false;
        }
    }
        return { getBrandDetailStore, getAllBrandStore, loading};
})
