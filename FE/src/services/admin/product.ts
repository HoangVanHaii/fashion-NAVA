import api from ".././api";
import * as IProduct from "../../interfaces/product";
export const getProductForAdmin = async () => {
  const response = await api.get(`/product`);
  return response.data;
};

export const addProduct = async (formData: FormData) => {
  const response = await api.post("/admin/product", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
export const addProductColor = async (
  product_id_sql: number,
  formData: FormData
) => {
  const response = await api.post(
    `/admin/product/add-color/${product_id_sql}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};
export const updateProductStatus = async (id: number, status: string) => {
  const response = await api.put(`/admin/product/status/${id}`, {
    status: status,
  });
  return response.data;
};
export const updateProductInfo = async (
  id: number,
  name: string,
  description: string,
  brand_id: string,
  category_id: string,
  attributes: any
) => {
  const response = await api.put(`/admin/product/info/${id}`, {
    name,
    description,
    brand_id,
    category_id,
    attributes,
  });
  return response.data;
};

export const updateProductColor = async (formData: FormData) => {
  const response = await api.put(`/admin/product/color-size`, formData);
  return response.data;
};
export const updateProductVideo = async (formData: FormData) => {
    const response = await api.put(`/admin/product/video`, formData);
    return response.data;
  };
export const deleteBranchInnventory = async (
  branch_inventory: IProduct.deleteInventory
) => {
  const response = await api.delete(`/admin/product/delete`, {
    data: {
      branch_inventory,
    },
  });
  return response.data;
};
export const deleteProductColor = async (
  product_id_sql: number,
  color_id_mongo: string
) => {
  const response = await api.delete(`/admin/product/delete/color`, {
    data: {
      product_id_sql,
      color_id_mongo,
    },
  });
  return response.data;
};
export const updateStatusAll = async (status: string) => {
  const response = await api.put(`/admin/product/status/all`, {
    data: {
      status,
    },
  });
  return response.data;
};
export const updateStockAll = async (stock: number) => {
  const response = await api.put(`/admin/product/stock/all`, {
    data: {
      stock,
    },
  });
  return response.data;
};
