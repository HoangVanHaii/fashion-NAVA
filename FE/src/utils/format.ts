import type { IProductColorResponse, IProductMongoDetail, IProductSizeResponse } from "@/interfaces/product";

export const formatPrice = (value: number | string) => {
    // Ép kiểu về Number và loại bỏ phần thập phân
    const numericValue = Number(value);

    // Kiểm tra nếu không phải là số hợp lệ thì trả về "0đ" hoặc xử lý tùy ý
    if (isNaN(numericValue)) return "0đ";

    return numericValue.toLocaleString("vi-VN", {
        maximumFractionDigits: 0
    }) + "đ";
}
export const getImage = (path: string) => {
    // console.log(path);
    return  path;

}
export const getMinProductPrice = (product: any): number | null => {
    const prices = product?.colors
        ?.flatMap((c: any) => c.sizes || [])
        .filter((s: any) => s.stock > 0)
        .map((s: any) => Number(s.sale_price ?? s.price))
        .filter((p: number) => !isNaN(p));

    return prices?.length ? Math.min(...prices) : null;
}
export const getMaxProductPrice = (product: any): number | null => {
    const prices = product?.colors
        ?.flatMap((c: any) => c.sizes || [])
        .filter((s: any) => s.stock > 0)
        .map((s: any) => Number(s.sale_price ?? s.price))
        .filter((p: number) => !isNaN(p));

    return prices?.length ? Math.max(...prices) : null;
}
export const getTotalSold = (product: IProductMongoDetail): number => {
    let totalSold = 0

    if (!product.colors) return 0

    product.colors.forEach((color: any) => {
        if (!color.sizes) return
        color.sizes.forEach((size: any) => {
            totalSold += size.sale_sold || 0
        })
    })

    return totalSold
}
export const getMainProductImage = (product: any): string => {
    if (!product?.colors?.length) return "";

    const mainColor = product.colors.find((c: IProductColorResponse) => c.is_main === true);

    return mainColor?.image_main || product.colors[0]?.image_main || "";
};
export const getColorMain = (product: any): IProductColorResponse | null => {
    if (!product?.colors?.length) return null;
    const mainColor = product.colors.find((c: IProductColorResponse) => c.is_main === true);
    return mainColor || product.colors[0];
};
export const checkProductSale = (product: any): boolean => {
    if (!product?.colors) return false;

    return product.colors.some((color: IProductColorResponse) =>
        color.sizes?.some((size: IProductSizeResponse) =>
            typeof size.sale_price === 'number' && size.sale_price < (size.price ?? 0)
        )
    );
};
export const formatDateTime = (isoString: any): string => {
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
