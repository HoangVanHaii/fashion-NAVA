import { defineStore } from "pinia";
import {
    searchByCategoryId,
    getProductById,
    getCategoryNameById,
    getBrandNameById,
    getProductByBrandId,
    getRatingOfbrand,
        
    getProductByCategory,
    searchByCategoryGender,
    getProductByName,
  getProductBestSeller,
  getProductBestSellerForAdmin,
    getProductLatest,
    getAllProduct
} from '@/services/product';

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
  const getAllProductStore = async () => {
    try {
      loading.value = true;

      const res = await getAllProduct();
      console.log("Fetched all products:", res.products);
      return res.products as IProductMongoDetail[];
    } catch (error) {
      loading.value = false;
      console.log("Failed to fetch product", error);
    } finally {
      loading.value = false;
    }
  }
    const searchByCategoryIdStore = async (catId: string) => {
        loading.value = true;
        try {
            const res = await searchByCategoryId(catId);
            return res.products as IProductMongoDetail[];
        } catch (error) {
            loading.value = false;
            console.error("Failed to fetch product:", error);
            return []
        } finally {
            loading.value = false;
        }
    }
    const getCategoryNameStore = async (catId: string) => {
        // loading.value = true;
        try {
            const res = await getCategoryNameById(catId);
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
    //-//
    const getProductBestSellerStore = async (top: number) => {
    try {
      const result = await getProductBestSeller(top || 20);
      // const result = await getAllProduct();
      return result.products as IProductMongoDetail[];
    } catch (err) {
      console.log(err);
      return [];
    }
    };
  const getProductBestSellerForAdminStore = async (top: number, branch_code: string) => {
    loading.value = true;
    try {
      const result = await getProductBestSellerForAdmin(top || 20, branch_code);
      return result.data as IProductMongoDetail[];
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      loading.value = false;
    }
  };
  const getProductLatestStore = async (top: number) => {
    try {
      const result = await getProductLatest(top || 20);
      return result.products as IProductMongoDetail[];
    } catch (err) {
      console.log(err);
      return [];
    }
  };
  const getProductByNameStore = async (name: string) => {
    try {
      const result = await getProductByName(name);
      return result as IProductMongoDetail[];
    } catch (err) {
      console.log(err);
      return [];
    }
  };
  const searchByCategoryGenderStore = async (gender: string) => {
    loading.value = true;
    try {
      const res = await searchByCategoryGender(gender);
      return res.products as IProductMongoDetail[];
    } catch (error) {
      console.error("Failed to fetch product:", error);
      return [];
    } finally {
      loading.value = false;
    }
  };

  const searchByCategoryStore = async (categoryName: string) => {
    loading.value = true;
    try {
      const res = await getProductByCategory(categoryName);
      return res as IProductMongoDetail[];
    } catch (error) {
      console.error("Failed to fetch product:", error);
      return [];
    } finally {
      loading.value = false;
    }
  };

    return { 
      searchByCategoryIdStore,
      getProductByIdStore, 
      getCategoryNameStore,
      getBrandByIdStore, 
      getProductByBrandIdStore, 
      getRatingOfbrandStore,
      
      getProductByNameStore,
      searchByCategoryStore,
      searchByCategoryGenderStore,
      getProductBestSellerStore,
      getProductBestSellerForAdminStore,
      getProductLatestStore,
      getAllProductStore,
      loading
    };
})
