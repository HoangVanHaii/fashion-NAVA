import { dbPools } from "../config/database";
import { AppError } from "../utils/appError";

export const validateVoucher = async (code: string, orderTotal: number, shop_id?: number): Promise<number> => {
    try {
        const pool = dbPools.central;
        const query = `SELECT * FROM vouchers WHERE code = @code`;
        const result = await pool
            .request()
            .input("code", code)
            .query(query);

        if (result.recordset.length === 0) {
            throw new AppError("Voucher not found", 404);
        }

        const voucher = result.recordset[0];
        const now = new Date();

        const startDate = new Date(voucher.start_date);
        const endDate = new Date(voucher.end_date);

        if (startDate.getTime() > now.getTime() || endDate.getTime() < now.getTime()) {
            throw new AppError("Voucher is not valid at this time", 400);
        }
        if (voucher.quantity <= voucher.used) {
            throw new AppError("Voucher is no longer available", 400);
        }
        if (orderTotal < voucher.min_order_value) {
            throw new AppError(`Order total must be at least ${voucher.min_order_value} to use this voucher`, 400);
        }
        if (voucher.scope == "SHOP" && voucher.shop_id !== shop_id) {
            throw new AppError("Voucher is not valid for this shop", 400);
        }

        let discount = 0;
        if (voucher.discount_type === "PERCENT") {
            discount = (orderTotal * voucher.discount_value) / 100;
            if (voucher.max_discount && discount > voucher.max_discount) {
                discount = voucher.max_discount;
            }
        } else if (voucher.discount_type === "FIXED") {
            discount = voucher.discount_value;
        }

        return discount;
    } catch (error: any) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError('Failed to validate voucher', 500, false);
    }
};