import { ref } from 'vue';
import { defineStore } from "pinia";
import { 
    getActiveCategory, getCategoryName, getActiveCategoryDetail, getActiveCategoryDetailPublic, getActiveCategoryPublic 
} from "../services/category";

export const useCategoryStore = defineStore('category', () => {
    const loading = ref<boolean>(false);

    const getCategoryNameStore = async (gender: string) => {
        loading.value = true;
        try {
            const res = await getCategoryName(gender);
            return res.categoryNames;
        } catch (error) {
            console.error(error);
        } finally {
            loading.value = false;
        }
    }

    const getActiveCategoryStore = async () => {
        loading.value = true;
        try {
            const token = localStorage.getItem('accessToken');
            if (token) {
                const res = await getActiveCategory();
                return res.categories;
            } else {
                const res = await getActiveCategoryPublic();
                return res.categories;
            }
        } catch (error) {
            console.error(error);
        } finally {
            loading.value = false;
        }
    }

    const getCategoryDetailStore = async (category_id: string) => {
        loading.value = true;
        try {
            const token = localStorage.getItem('accessToken');
            if (token) {
                const res = await getActiveCategoryDetail(category_id);
                return res.data;
            } else {
                const res = await getActiveCategoryDetailPublic(category_id);
                return res.data;
            }
        } catch (error) {
            console.error(error);
        } finally {
            loading.value = false;
        }
    }

    return { 
        getCategoryNameStore, 
        getActiveCategoryStore, 
        getCategoryDetailStore,
        loading
    };
})