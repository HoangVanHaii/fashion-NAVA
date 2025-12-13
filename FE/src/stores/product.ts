import { defineStore } from "pinia";
import { getProductByCategory, searchByCategoryGender, getProductByName, getProductById, getProductBestSeller, getProductLatest, getAllProductActive, getProductIdBySize, getCategoryNameById, getBrandNameById, getProductByBrandId, getRatingOfbrand } from '../services/product'
import { ref } from "vue";
import type { IProductMongoDetail } from "../interfaces/product";
import type { Category } from "@/interfaces/category";
import type { BrandRatingResult, IBrandResponse } from "@/interfaces/brand";
export const useProductStore = defineStore('product', () => {
    const loading = ref<boolean>(true);

    const getProductByIdStore = async (id: string) => {
        try {
            loading.value = true;

            const res = await getProductById(id);

            return res.data as IProductMongoDetail;
        } catch (error) {
            loading.value = false;
            console.log("Failed to fetch product", error);
        } finally {
            loading.value = false;
        }
    }
    const searchByCategoryGenderStore = async (genderId: string) => {
        loading.value = true;
        try {
            const res = await searchByCategoryGender(genderId);
            return res.products as IProductMongoDetail[];
        } catch (error) {
            loading.value = false;
            console.error("Failed to fetch product:", error);
            return []
        } finally {
            loading.value = false;
        }
    }
    const getCategoryNameStore = async (genderId: string) => {
        // loading.value = true;
        try {
            const res = await getCategoryNameById(genderId);
            return res.data as Category;
        } catch (error) {
            loading.value = false;
            console.error("Failed to fetch product:", error);
        } finally {
            loading.value = false;
        }
    }
    const getBrandByIdStore = async (brand_id: string) => {
        // loading.value = true;
        try {
            const res = await getBrandNameById(brand_id);
            return res.data as IBrandResponse;
        } catch (error) {
            loading.value = false;
            console.error("Failed to fetch product:", error);
        } finally {
            loading.value = false;
        }
    }
    const getProductByBrandIdStore = async (brand_id: string) => {
        // loading.value = true;
        try {
            const res = await getProductByBrandId(brand_id);
            return res.data as IProductMongoDetail[];
        } catch (error) {
            loading.value = false;
            console.error("Failed to fetch product:", error);
        } finally {
            loading.value = false;
        }
    }
    const getRatingOfbrandStore = async (brand_id: string) => {
        // loading.value = true;
        try {
            const res = await getRatingOfbrand(brand_id);
            return res.data as BrandRatingResult;
        } catch (error) {
            loading.value = false;
            console.error("Failed to fetch product:", error);
        } finally {
            loading.value = false;
        }
    }
    // const searchByCategoryStore = async (categoryName: string) => {
    //     loading.value = true;
    //     try {
    //         const res = await getProductByCategory(categoryName);
    //         return res as ProductSummary[];
    //     } catch (error) {
    //         console.error("Failed to fetch product:", error);
    //         return []
    //     } finally {
    //         loading.value = false;
    //     }
        
    // }
    // const getProductIdBySizeStore = async(size_id:number)=>{
    //      try {
    //         const res = await getProductIdBySize(size_id);
    //         return res.product_id;
    //     } catch (error) {
    //         console.log("Failed to get productId",error);
    //     }
    // }

    // const getProductBestSellerStore = async () => {
    //     try {
    //         const result = await getProductBestSeller(20);
    //         return result as ProductSummary[];
    //     } catch (err) {
    //         console.log(err);
    //         return [];
    //     }
    // }
    // const getProductLatestStore = async () => {
    //     try {
    //         const result = await getProductLatest(20);
    //         return result as ProductSummary[];
    //     } catch (err) {
    //         console.log(err);
    //         return [];
    //     }
    // }
    // const getProductByNameStore = async (name: string) => {
    //     try {
    //         const result = await getProductByName(name);
    //         return result as ProductSummary[];
    //     } catch (err) {
    //         console.log(err);
    //         return [];
    //     }
    // }
    // const getProductByShopStore = async (id: number) => {
    //     try {
    //         const result = await getProductByShop(id);
    //         return result
    //     } catch (err) {
    //         console.log(err);
    //     }
    // }
    // const getAllProductActiveStore = async () => {
    //     try {
    //         const result = await getAllProductActive();
    //         return result;
    //     } catch (err) {
    //         console.log(err);
    //     }
    // }


    return { searchByCategoryGenderStore, getProductByIdStore, getCategoryNameStore, getBrandByIdStore, getProductByBrandIdStore, getRatingOfbrandStore, loading};
})
