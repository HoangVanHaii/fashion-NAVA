import { UserVoucherDetail, Voucher } from "../interfaces/voucher";
import { AppError } from "../utils/appError";
import { mysqlPool } from "../config/database"; // Điều chỉnh đường dẫn cấu hình
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";

export const createVoucher = async (voucher: Voucher) => {
    try {
        // Bỏ 'id' vì MySQL tự tăng (AUTO_INCREMENT)
        await mysqlPool.query(
            `INSERT INTO vouchers (code, description, discount_type, discount_value, max_discount, min_order_value, quantity, start_date, end_date, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                voucher.code,
                voucher.description,
                voucher.discount_type,
                voucher.discount_value,
                voucher.max_discount,
                voucher.min_order_value,
                voucher.quantity,
                voucher.start_date,
                voucher.end_date,
                voucher.created_by
            ]
        );
    } catch (error) {
        console.error(error);
        throw new AppError('Failed to create voucher', 500, false);
    }
};

export const updateVoucher = async (voucher: Voucher) => {
    try {
        let updates: string[] = [];
        let values: any[] = [];

        Object.entries(voucher).forEach(([key, value]) => {
            if (key !== "id" && key !== "ID" && value !== undefined) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        });

        if (updates.length === 0) {
            throw new AppError("No fields to update", 400);
        }

        // Đẩy ID vào cuối mảng cho mệnh đề WHERE
        values.push(voucher.id || (voucher as any).ID);

        const query = `
            UPDATE vouchers
            SET ${updates.join(", ")}
            WHERE ID = ?
        `;
        await mysqlPool.query(query, values);
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError('Failed to update voucher', 500, false);
    }
};

export const getVoucherById = async (id: number): Promise<Voucher | null> => {
    try {
        const query = `SELECT * FROM vouchers WHERE ID = ?`;
        const [rows] = await mysqlPool.query<RowDataPacket[]>(query, [id]);

        if (rows.length === 0) {
            return null;
        }
        return rows[0] as Voucher;
    } catch (error) {
        throw new AppError('Failed to fetch voucher by id', 500, false);
    }
};

export const getTopVouchers = async (top: number): Promise<Voucher[]> => {
    try {
        // Thay thế TOP bằng LIMIT và GETDATE bằng NOW
        const query = `
            SELECT * FROM vouchers 
            WHERE quantity > 0 
              AND end_date > NOW() 
            ORDER BY discount_value DESC 
            LIMIT ?
        `;
        const [rows] = await mysqlPool.query<RowDataPacket[]>(query, [Number(top)]);
        return rows as Voucher[];
    } catch (error) {
        console.error("GetTopVouchers Error:", error);
        throw new AppError('Failed to fetch vouchers', 500, false);
    }
};

export const getAllVouchers = async (): Promise<Voucher[]> => {
    try {
        const query = `
            SELECT
                ID as id,
                code,
                description,
                discount_type,
                discount_value,
                min_order_value,
                max_discount,
                quantity,
                used,
                start_date,
                end_date,
                created_by
            FROM vouchers
        `;

        const [rows] = await mysqlPool.query<RowDataPacket[]>(query);
        return rows as Voucher[];
    } catch (error) {
        throw new AppError('Failed to fetch vouchers', 500, false);
    }
};

export const getVoucherCodeById = async (id: number): Promise<string | null> => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(`SELECT code FROM vouchers WHERE ID = ?`, [id]);

        if (rows.length === 0) {
            return null;
        }
        return rows[0].code;
    } catch (error) {
        console.error("GetVoucherCodeById Error:", error);
        throw new AppError('Failed to fetch voucher code', 500, false);
    }
};

export const getVoucherByCode = async (code: string): Promise<Voucher | null> => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(`SELECT * FROM vouchers WHERE code = ?`, [code]);

        if (rows.length === 0) {
            return null;
        }
        return rows[0] as Voucher;
    } catch (error) {
        console.error("GetVoucherByCode Error:", error);
        throw new AppError('Failed to fetch voucher by code', 500, false);
    }
};

export const claimVoucherByCode = async (userId: number, code: string): Promise<void> => {
    const connection = await mysqlPool.getConnection();

    try {
        await connection.beginTransaction();

        // Tìm voucher theo code và khóa dòng bằng FOR UPDATE
        const [voucherRows] = await connection.query<RowDataPacket[]>(
            `SELECT ID FROM vouchers
             WHERE code = ?
               AND start_date <= NOW() 
               AND end_date >= NOW() 
               AND quantity > 0
             FOR UPDATE`,
            [code]
        );

        if (voucherRows.length === 0) {
            throw new AppError("Voucher is invalid or expired", 400);
        }

        const voucherId = voucherRows[0].ID;

        // Check user đã claim chưa
        const [existRows] = await connection.query<RowDataPacket[]>(
            `SELECT ID FROM user_vouchers WHERE user_id = ? AND voucher_id = ?`,
            [userId, voucherId]
        );

        if (existRows.length > 0) {
            throw new AppError("You already claimed this voucher", 400);
        }

        // Claim voucher (Không insert ID vì AUTO_INCREMENT)
        await connection.query(
            `INSERT INTO user_vouchers (user_id, voucher_id, used_date)
             VALUES (?, ?, NULL)`,
            [userId, voucherId]
        );

        // Giảm số lượng voucher
        await connection.query(
            `UPDATE vouchers SET quantity = quantity - 1 WHERE ID = ?`,
            [voucherId]
        );

        await connection.commit();
    } catch (error: any) {
        await connection.rollback();
        console.error(error);
        if (error instanceof AppError) throw error;
        throw new AppError("Failed to claim voucher", 500, false);
    } finally {
        connection.release();
    }
};

export const getUserVouchers = async (userId: number): Promise<UserVoucherDetail[]> => {
    try {
        const query = `
            SELECT 
                uv.ID as id, 
                v.ID as voucher_id, 
                v.code, 
                v.description, 
                v.discount_type,  
                v.discount_value,
                v.min_order_value,
                v.max_discount, 
                v.start_date, 
                v.end_date, 
                uv.used_date
            FROM user_vouchers uv
            INNER JOIN vouchers v ON uv.voucher_id = v.ID
            WHERE uv.user_id = ?
        `;
        const [rows] = await mysqlPool.query<RowDataPacket[]>(query, [userId]);

        return rows as UserVoucherDetail[];
    } catch (error: any) {
        throw new AppError("Failed to fetch user vouchers", 500, false);
    }
};

export const validateVoucher = async (code: string, orderTotal: number): Promise<{ discount: number, voucher_id: number }> => {
    try {
        const query = `SELECT * FROM vouchers WHERE code = ?`;
        const [rows] = await mysqlPool.query<RowDataPacket[]>(query, [code]);

        if (rows.length === 0) {
            throw new AppError("Voucher not found", 404);
        }

        const voucher = rows[0];

        // Do server MySQL thường lưu thời gian UTC, có thể cần cộng giờ nếu server node chạy múi giờ khác. 
        // Tuy nhiên, nếu bạn đã đồng bộ múi giờ giữa node và mysql, bạn có thể so sánh trực tiếp.
        const now = new Date();
        now.setHours(now.getHours() + 7); // Phụ thuộc vào config múi giờ của bạn

        const startDate = new Date(voucher.start_date);
        const endDate = new Date(voucher.end_date);

        if (now < startDate) throw new AppError("Voucher is not valid at this time", 400);
        if (now > endDate) throw new AppError("Voucher has expired", 400);

        const quantity = Number(voucher.quantity) || 0;
        const used = Number(voucher.used) || 0;
        const minOrder = Number(voucher.min_order_value) || 0;

        if (quantity <= used) {
            throw new AppError("Voucher is no longer available", 400);
        }

        if (orderTotal < minOrder) {
            throw new AppError(`Order total must be at least ${minOrder} to use this voucher`, 400);
        }

        let discount = 0;
        const discountVal = Number(voucher.discount_value) || 0;
        const maxDiscount = Number(voucher.max_discount) || 0;

        if (voucher.discount_type === "PERCENT") {
            discount = (orderTotal * discountVal) / 100;
            if (maxDiscount > 0 && discount > maxDiscount) {
                discount = maxDiscount;
            }
        } else if (voucher.discount_type === "FIXED") {
            discount = discountVal;
        }

        const updateQuery = `
            UPDATE vouchers
            SET used = used + 1
            WHERE ID = ?
        `;
        await mysqlPool.query(updateQuery, [voucher.ID]);

        return {
            discount: Math.floor(discount),
            voucher_id: voucher.ID
        };

    } catch (error: any) {
        if (error instanceof AppError) {
            throw error;
        }
        console.error(error);
        throw new AppError('Failed to validate voucher', 500, false);
    }
};