import { RowDataPacket } from "mysql2";
import { Category } from "../interfaces/category";
import { AppError } from "../utils/appError";
import { mysqlPool } from "../config/database"; // Điều chỉnh lại đường dẫn nếu cần

export const addCategory = async (category: Category): Promise<void> => {
    try {
        await mysqlPool.query(
            `INSERT INTO categories (category_name, description, status, gender)
             VALUES (?, ?, ?, ?)`,
            [
                category.category_name,
                category.description || null,
                category.status || "active",
                category.gender
            ]
        );
    } catch (error) {
        console.error("Failed to add category", error);
        throw new AppError("Failed to add category", 500, false);
    }
};

export const getAllActiveCategories = async (): Promise<Category[]> => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT category_id, category_name, description, status, gender
             FROM categories
             WHERE status = 'active'`
        );
        return rows as Category[];
    } catch (error) {
        throw new AppError("Failed to get active categories", 500, false);
    }
};

export const getCategoryNamByGender = async (gender: string) => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT category_id, category_name
             FROM categories 
             WHERE gender = ?`,
            [gender]
        );

        return rows;
    } catch (error) {
        console.error("Failed to fetching category name", error);
        throw new AppError('Failed to fetching category name', 500, false);
    }
};

export const getAllInactiveCategories = async (): Promise<Category[]> => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT category_id, category_name, description, status, gender
             FROM categories
             WHERE status = 'inactive'`
        );
        return rows as Category[];
    } catch (error) {
        throw new AppError("Failed to get inactive categories", 500, false);
    }
};

export const getCategoryById = async (id: number): Promise<Category | null> => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT category_id, category_name, description, status, gender
             FROM categories
             WHERE category_id = ?`,
            [id]
        );

        if (rows.length === 0) return null;
        return rows[0] as Category;
    } catch (error) {
        throw new AppError("Failed to get category by id", 500, false);
    }
};

export const updateCategory = async (category: Category): Promise<void> => {
    try {
        let updates: string[] = [];
        let values: any[] = [];

        Object.entries(category).forEach(([key, value]) => {
            if (key !== "category_id" && value !== undefined && value !== null && value !== "") {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        });

        if (updates.length === 0) return;

        // Thêm id vào mảng values để phục vụ cho mệnh đề WHERE
        values.push(category.category_id);

        const query = `
            UPDATE categories
            SET ${updates.join(", ")}
            WHERE category_id = ?
        `;

        await mysqlPool.query(query, values);
    } catch (error) {
        throw new AppError("Failed to update category", 500, false);
    }
};

export const deleteCategory = async (id: number): Promise<void> => {
    try {
        await mysqlPool.query(
            `UPDATE categories
             SET status = 'inactive'
             WHERE category_id = ?`,
            [id]
        );
    } catch (error) {
        throw new AppError("Failed to soft delete category", 500, false);
    }
};