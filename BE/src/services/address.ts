import { getBranchPool } from "../config/database";
import { Address_Order } from "../interfaces/address";
import { AppError } from "../utils/appError";
import { ConnectionPool, Transaction } from "mssql";
import { v4 as uuidv4 } from "uuid";

export const addAddress = async (address: Address_Order, branch_code: string): Promise<void> => {
    try {
        const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500);

        const transaction = new Transaction(pool);
        await transaction.begin();

        try {
            if (address.is_default) {
                await transaction.request()
                    .input("user_id", address.user_id)
                    .query(`
                        UPDATE addresses
                        SET is_default = 0
                        WHERE user_id = @user_id
                    `);
            }
            
            const newId = uuidv4();

            await transaction.request()
                .input("id", newId)
                .input("user_id", address.user_id)
                .input("name", address.name)
                .input("phone", address.phone)
                .input("province", address.province)
                .input("district", address.district)
                .input("ward", address.ward)
                .input("street_address", address.street_address)
                .input("is_default", address.is_default)
                .query(`
                    INSERT INTO addresses (ID, user_id, name, phone, province, district, ward, street_address, is_default)
                    VALUES (@id, @user_id, @name, @phone, @province, @district, @ward, @street_address, @is_default)
                `);

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (error) {
        console.log(error);
        if (error instanceof AppError) throw error;
        throw new AppError("Failed to add address", 500, false);
    }
};

export const getAddressesByUser = async (userId: string, branch_code: string): Promise<Address_Order[]> => {
    try {
        const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500);

        const result = await pool.request()
            .input("user_id", userId)
            .query(`
                SELECT id, user_id, name, phone, province, district, ward, street_address, is_default
                FROM addresses
                WHERE user_id = @user_id
                ORDER BY is_default DESC, name ASC
            `);
        return result.recordset;
    } catch (error) {
        throw new AppError("Failed to get addresses", 500, false);
    }
};

export const getAddressById = async (userId: string, addressId: string, branch_code: string): Promise<Address_Order | null> => {
    try {
        const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500);

        const result = await pool.request()
            .input("user_id", userId)
            .input("id", addressId)
            .query(`
                SELECT id, user_id, name, phone, province, district, ward, street_address, is_default
                FROM addresses
                WHERE id = @id AND user_id = @user_id
            `);

        if (result.recordset.length === 0) {
            return null;
        }
        return result.recordset[0];
    } catch (error) {
        throw new AppError("Failed to get address", 500, false);
    }
};

export const updateAddress = async (address: Address_Order, branch_code: string): Promise<void> => {
    try {
        const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500);

        const transaction = new Transaction(pool);
        await transaction.begin();

        try {
            // Nếu set default mới, reset các cái cũ
            if (address.is_default) {
                await transaction.request()
                    .input("user_id", address.user_id)
                    .query(`
                        UPDATE addresses
                        SET is_default = 0
                        WHERE user_id = @user_id
                    `);
            }

            // Update thông tin
            await transaction.request()
                .input("id", address.id)
                .input("user_id", address.user_id)
                .input("name", address.name)
                .input("phone", address.phone)
                .input("province", address.province)
                .input("district", address.district)
                .input("ward", address.ward)
                .input("street_address", address.street_address)
                .input("is_default", address.is_default)
                .query(`
                    UPDATE addresses
                    SET name = @name,
                        phone = @phone,
                        province = @province,
                        district = @district,
                        ward = @ward,
                        street_address = @street_address,
                        is_default = @is_default
                    WHERE id = @id AND user_id = @user_id
                `);

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError("Failed to update address", 500, false);
    }
};

export const deleteAddress = async (userId: string, addressId: string, is_default: boolean, branch_code: string): Promise<void> => {
    try {
        const pool: ConnectionPool | null = getBranchPool(branch_code);
        if (!pool) throw new AppError("Database connection failed", 500);

        const transaction = new Transaction(pool);
        await transaction.begin();

        try {
            // Xóa address
            await transaction.request()
                .input("user_id", userId)
                .input("id", addressId)
                .query(`
                    DELETE FROM addresses
                    WHERE id = @id AND user_id = @user_id
                `);

            // Nếu xóa cái mặc định -> set 1 cái khác (bất kỳ) làm mặc định để không bị mất default
            if (is_default) {
                await transaction.request()
                    .input("user_id", userId)
                    .query(`
                        UPDATE addresses
                        SET is_default = 1
                        WHERE id = (
                            SELECT TOP 1 id FROM addresses
                            WHERE user_id = @user_id
                            ORDER BY id ASC
                        )
                    `);
            }
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        throw new AppError("Failed to delete address", 500, false);
    }
};