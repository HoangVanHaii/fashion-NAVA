import { UserVoucherDetail, Voucher } from "../interfaces/voucher";
import { AppError } from "../utils/appError";
import { getBranchPool } from "../config/database";
import { ConnectionPool, Transaction } from "mssql";

export const createVoucher = async (voucher:Voucher,branch_code:string)=>{
    try {
        const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500);
        const result = await pool.request()
            .input("id", voucher.id)
            .input("code", voucher.code)
            .input("description", voucher.description)
            .input("discount_type", voucher.discount_type)
            .input("discount_value", voucher.discount_value)
            .input("max_discount", voucher.max_discount)
            .input("min_order_value", voucher.min_order_value)
            .input("quantity", voucher.quantity)
            .input("start_date", voucher.start_date)
            .input("end_date", voucher.end_date)
            .input("created_by", voucher.created_by)
            .query(`
                    INSERT INTO vouchers (id,code, description, discount_type, discount_value, max_discount, min_order_value, quantity, start_date, end_date,created_by)
                    VALUES (@id, @code, @description, @discount_type, @discount_value, @max_discount, @min_order_value, @quantity, @start_date, @end_date, @created_by)
                    `)
    } catch (error) {
        console.error(error);
        throw new AppError('Failed to create voucher', 500, false);
    }
}

export const updateVoucher = async (voucher: Voucher,branch_code:string) => {
	try {
		const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500);
		const request = pool.request();
		let updates: string[] = [];
		Object.entries(voucher).forEach(([key, value]) => {
			if (key !== "id" && value !== undefined) {
				updates.push(`${key} = @${key}`);
				request.input(key, value);
			}
		});
		if (updates.length === 0) {
			throw new AppError("No fields to update", 400);
		}
		request.input("id", voucher.id);
		const query = `UPDATE vouchers
					   SET ${updates.join(", ")}
					   WHERE id = @id`;
		await request.query(query);
	} catch (error) {
        if (error instanceof AppError) throw error;
        console.error(error);
		throw new AppError('Failed to update voucher', 500, false);
	}
}

export const getVoucherById = async (id: string, branch_code:string): Promise<Voucher | null> => {
	try {
		const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500);
		const query = `SELECT * FROM vouchers WHERE id = @id`;
		const result = await pool.request().input("id", id).query(query);
		if (result.recordset.length === 0) {
			return null;
		}
		return result.recordset[0] as Voucher;
	} catch (error) {
		throw new AppError('Failed to fetch voucher by id', 500, false);
	}
}

export const getTopVouchers = async (top: number, branch_code: string): Promise<Voucher[]> => {
    try {
        const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500);

        const result = await pool.request()
            .input("top", top)
            .query(`
                SELECT TOP (@top) * FROM vouchers 
                WHERE quantity > 0         
                AND end_date > GETDATE()   
                ORDER BY discount_value DESC 
            `);
            
        return result.recordset as Voucher[];
    } catch (error) {
        console.error("GetTopVouchers Error:", error); 
        throw new AppError('Failed to fetch vouchers', 500, false);
    }
}

export const getAllVouchers = async (branch_code:string): Promise<Voucher[]> => {
	try {
		const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500);
		const query = `SELECT * FROM vouchers ORDER BY start_date DESC`;
		const result = await pool.request().query(query);
		return result.recordset as Voucher[];
	} catch (error) {
		throw new AppError('Failed to fetch vouchers', 500, false);
	}
}

export const getVoucherCodeById = async (id: string, branch_code: string): Promise<string | null> => {
    try {
        const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500);

        const result = await pool.request()
            .input("id", id)
            .query(`SELECT code FROM vouchers WHERE id = @id`);

        if (result.recordset.length === 0) {
            return null;
        }
        
        return result.recordset[0].code;

    } catch (error) {
        console.error("GetVoucherCodeById Error:", error);
        throw new AppError('Failed to fetch voucher code', 500, false);
    }
}

export const getVoucherByCode = async (code: string, branch_code: string): Promise<Voucher | null> => {
    try {
        const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500);

        const result = await pool.request()
            .input("code", code)
            .query(`SELECT * FROM vouchers WHERE code = @code`);

        if (result.recordset.length === 0) {
            return null;
        }
        
        return result.recordset[0] as Voucher;

    } catch (error) {
        console.error("GetVoucherByCode Error:", error);
        throw new AppError('Failed to fetch voucher by code', 500, false);
    }
}

export const claimVoucherByCode = async (userId: string, code: string, branch_code:string): Promise<void> => {
    const pool: ConnectionPool | null = getBranchPool(branch_code);
    if (!pool) throw new AppError("Database connection failed", 500); 
    const transaction = new Transaction(pool);
    try {
        await transaction.begin();
        // Tìm voucher theo code
        const voucher = await transaction.request()
            .input("code", code)
            .query(`
            SELECT id FROM vouchers WITH (UPDLOCK, ROWLOCK)
            WHERE code = @code
            AND start_date <= GETDATE() 
            AND end_date >= GETDATE() 
            AND quantity > 0
        `);

        if (voucher.recordset.length === 0) {
            throw new AppError("Voucher is invalid or expired", 400);
        }

        const voucherId = voucher.recordset[0].id;

        // Check user đã claim chưa
        const exist = await transaction.request()
            .input("userId", userId)
            .input("voucherId", voucherId)
            .query(`
        SELECT * FROM user_vouchers
        WHERE user_id = @userId AND voucher_id = @voucherId
      `);

        if (exist.recordset.length > 0) {
            throw new AppError("You already claimed this voucher", 400);
        }

        // Claim voucher
        await transaction.request()
            .input("userId", userId)
            .input("voucherId", voucherId)
            .query(`
        INSERT INTO user_vouchers (user_id, voucher_id, used_date)
        VALUES (@userId, @voucherId, NULL)
      `);

        // Giảm số lượng voucher
        await transaction.request()
            .input("voucherId", voucherId)
            .query(`
        UPDATE vouchers SET quantity = quantity - 1
        WHERE id = @voucherId
      `);
        await transaction.commit();
    } catch (error: any) {
        if (transaction) await transaction.rollback();
        console.log(error)
        if (error instanceof AppError) throw error;
        throw new AppError("Failed to claim voucher", 500, false);
    }
};

export const getUserVouchers = async (userId: string, branch_code:string): Promise<UserVoucherDetail[]> => {
    try {
        const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500); 
  
        const result = await pool.request()
            .input("userId", userId)
            .query(`
            SELECT uv.id, v.id as voucher_id, v.code, v.description, v.discount_type,  
                    v.discount_value,v.min_order_value,v.max_discount, v.start_date, v.end_date, uv.used_date
            FROM user_vouchers uv
            INNER JOIN vouchers v ON uv.voucher_id = v.id
            WHERE uv.user_id = @userId
            `);
  
        return result.recordset as UserVoucherDetail[];
    } catch (error: any) {
        throw new AppError("Failed to fetch user vouchers", 500, false);
    }
  };

export const validateVoucher = async (code: string, orderTotal: number, shop_id?: number): Promise<number> => {
    try {
        const pool = getBranchPool('CT');
        if (!pool) throw new AppError("Database connection failed", 500); 

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
