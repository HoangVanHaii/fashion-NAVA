import { defineStore } from "pinia";
import { ref, computed } from "vue";
import * as IProduct from "../../interfaces/product";
import {
  getProductForAdmin,
  updateProductColor,
  updateProductInfo,
  deleteBranchInnventory,
  updateProductStatus,
  addProduct,
  addProductColor,
  deleteProductColor,
  updateStatusAll,
  updateStockAll,
  updateProductVideo,
} from "../../services/admin/product";
export const useProductAdminStore = defineStore("product-admin", () => {
  const loading = ref<boolean>(true);
  const listProduct = ref<IProduct.IProductMongoDetail[]>([]);
  const success = ref<boolean>(false);
  const getAllProductPayloadStore = async () => {
    loading.value = true;
    try {
      const result = await getProductForAdmin();
      listProduct.value = result.products;
      console.log(listProduct.value);
      return result as IProduct.IProductMongoDetail[];
    } catch (err) {
      console.log(err);
    } finally {
      loading.value = false;
    }
  };
  const addProductStore = async (formData: FormData) => {
    try {
      loading.value = true;
      await addProduct(formData);
    } catch (error) {
      console.log(error);
    } finally {
      loading.value = false;
    }
  };
  const addProductColorStore = async (
    product_id_sql: string,
    formData: FormData
  ) => {
    try {
      loading.value = true;
      success.value = false;
      await addProductColor(product_id_sql, formData);
      success.value = true;
    } catch (error) {
      success.value = false;
      console.log(error);
    } finally {
      loading.value = false;
    }
  };
  const updateProductInfoStore = async (
    id: string,
    name: string,
    description: string,
    brand_id: string,
    category_id: string,
    attributes: any
  ) => {
    try {
        loading.value = true;
        success.value = false;
      await updateProductInfo(
        id,
        name,
        description,
        brand_id,
        category_id,
        attributes
        );
        success.value = true;
    } catch (error) {
        success.value = false;
      console.log(error);
    } finally {
      loading.value = false;
    }
  };
  const deleteBranchInnventoryStore = async (
    branch_inventory: IProduct.deleteInventory
  ) => {
    try {
      success.value = false;
      loading.value = true;
      await deleteBranchInnventory(branch_inventory);
      success.value = true;
    } catch (error) {
      success.value = false;
      console.log(error);
    } finally {
      loading.value = false;
    }
  };
  const deleteProductColorStore = async (
    product_id_sql: string,
    color_id_mongo: string
  ) => {
    try {
      success.value = false;
      loading.value = true;
      await deleteProductColor(product_id_sql, color_id_mongo);
      success.value = true;
    } catch (error) {
      success.value = false;
      console.log(error);
    } finally {
      loading.value = false;
    }
  };
  const updateProductColorStore = async (formData: FormData) => {
    try {
      success.value = false;
      loading.value = true;
      await updateProductColor(formData);
      success.value = true;
    } catch (error) {
      success.value = false;
      console.log(error);
    } finally {
      loading.value = false;
    }
  };
  const updateProductVideoStore = async (formData: FormData) => {
    try {
      success.value = false;
      loading.value = true;
      await updateProductVideo(formData);
      success.value = true;
    } catch (error) {
      success.value = false;
      console.log(error);
    } finally {
      loading.value = false;
    }
  };
  const updateStatusAllStore = async (status: string) => {
    try {
      success.value = false;
      loading.value = true;
      await updateStatusAll(status);
      success.value = true;
    } catch (error) {
      success.value = false;
      console.log(error);
    } finally {
      loading.value = false;
    }
  };
  const updateStockAllStore = async (stock: number) => {
    try {
      success.value = false;
      loading.value = true;
      await updateStockAll(stock);
      success.value = true;
    } catch (error) {
      success.value = false;
      console.log(error);
    } finally {
      loading.value = false;
    }
  };
  const updateProductStatusStore = async (
    product_id: string,
    status: string
  ) => {
    try {
      success.value = false;
      loading.value = true;
      await updateProductStatus(product_id, status);
      success.value = true;
    } catch (error) {
      success.value = false;
      console.log(error);
    } finally {
      loading.value = false;
    }
  };
  return {
    getAllProductPayloadStore,
    addProductStore,
    deleteProductColorStore,
    addProductColorStore,
    updateStockAllStore,
    updateStatusAllStore,
    updateProductInfoStore,
    deleteBranchInnventoryStore,
    updateProductColorStore,
    updateProductVideoStore,
    updateProductStatusStore,
    listProduct,
    loading,
    success,
  };
});
