import type { IProductColorResponse, IProductMongoDetail, IProductSizeResponse } from "@/interfaces/product";

export const formatPrice = (value: number) => {
    return value.toLocaleString("vi-VN") + "đ";
}

export const formatDateTime = (isoString: any): string =>{
    const date = new Date(isoString);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // tháng bắt đầu từ 0
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}
export const formatDate = (isoString: any): string => {
    const date = new Date(isoString);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // tháng bắt đầu từ 0
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}
export const getMaxProductPrice = (product: any): number | null => {
    const prices = product?.colors
        ?.flatMap((c: any) => c.sizes || [])
        .map((s: any) => s.price)
        .filter((p: any): p is number => typeof p === 'number');

    return prices?.length ? Math.max(...prices) : null;
}
export const getMinProductPrice = (product: any): number | null => {
    const prices = product?.colors
        ?.flatMap((c: any) => c.sizes || [])
        .map((s: any) => s.sale_price ?? s.price)
        .filter((p: any): p is number => typeof p === 'number');
    return prices?.length ? Math.min(...prices) : null;
}
export const getMainProductImage = (product: IProductMongoDetail): string => {
    if (!product?.colors?.length) return "";
  
    const mainColor = product.colors.find((c: IProductColorResponse) => c.is_main === true);
  
    return mainColor?.image_main || product.colors[0]?.image_main || "";
  };

export const checkProductSale = (product: IProductMongoDetail): boolean => {
    if (!product?.colors) return false;
  
    return product.colors.some((color: IProductColorResponse) =>
      color.sizes?.some((size: IProductSizeResponse) =>
        typeof size.sale_price === 'number' && size.sale_price < (size.price ?? 0)
      )
    );
  };
  