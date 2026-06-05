import { RowDataPacket } from "mysql2";
import { Address_Order } from "../interfaces/address";
import { AppError } from "../utils/appError";
import { mysqlPool } from "../config/database";

export const addAddress = async (address: Address_Order, addressDetail: string): Promise<void> => {
    const connection = await mysqlPool.getConnection();
    try {
        await connection.beginTransaction();

        if (address.is_default) {
            await connection.query(
                `UPDATE addresses SET is_default = 0 WHERE user_id = ?`,
                [address.user_id]
            );
        }

        await connection.query(
            `INSERT INTO addresses (user_id, name, address, phone, province, district, ward, street_address, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                address.user_id,
                address.name,
                addressDetail,
                address.phone,
                address.province,
                address.district,
                address.ward,
                address.street_address,
                address.is_default ? 1 : 0
            ]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        console.log(error);
        if (error instanceof AppError) throw error;
        throw new AppError("Failed to add address", 500, false);
    } finally {
        connection.release();
    }
};

export const getAddressesByUser = async (userId: string): Promise<Address_Order[]> => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT id, user_id, name, phone, province, district, ward, street_address, is_default
             FROM addresses
             WHERE user_id = ?
             ORDER BY is_default DESC, name ASC`,
            [userId]
        );
        return rows as Address_Order[];
    } catch (error) {
        console.log(error);
        throw new AppError("Failed to get addresses", 500, false);
    }
};

export const getAddressById = async (userId: number, addressId: number): Promise<Address_Order | null> => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT id, user_id, name, phone, province, district, ward, street_address, is_default
             FROM addresses
             WHERE id = ? AND user_id = ?`,
            [addressId, userId]
        );

        if (rows.length === 0) {
            return null;
        }
        return rows[0] as Address_Order;
    } catch (error) {
        throw new AppError("Failed to get address", 500, false);
    }
};

export const updateAddress = async (address: Address_Order): Promise<void> => {
    const connection = await mysqlPool.getConnection();
    try {
        await connection.beginTransaction();

        if (address.is_default) {
            await connection.query(
                `UPDATE addresses SET is_default = 0 WHERE user_id = ?`,
                [address.user_id]
            );
        }

        await connection.query(
            `UPDATE addresses
             SET name = ?, 
                 phone = ?, 
                 province = ?, 
                 district = ?, 
                 ward = ?, 
                 street_address = ?, 
                 is_default = ?
             WHERE id = ? AND user_id = ?`,
            [
                address.name,
                address.phone,
                address.province,
                address.district,
                address.ward,
                address.street_address,
                address.is_default ? 1 : 0,
                address.id,
                address.user_id
            ]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        if (error instanceof AppError) throw error;
        throw new AppError("Failed to update address", 500, false);
    } finally {
        connection.release();
    }
};

export const deleteAddress = async (userId: number, addressId: number, is_default: boolean): Promise<void> => {
    const connection = await mysqlPool.getConnection();
    try {
        await connection.beginTransaction();

        // Xóa address
        await connection.query(
            `DELETE FROM addresses WHERE id = ? AND user_id = ?`,
            [addressId, userId]
        );

        // Nếu xóa cái mặc định -> set 1 cái khác làm mặc định
        if (is_default) {
            await connection.query(
                `UPDATE addresses
                 SET is_default = 1
                 WHERE user_id = ?
                 ORDER BY id ASC
                 LIMIT 1`,
                [userId]
            );
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw new AppError("Failed to delete address", 500, false);
    } finally {
        connection.release();
    }
};