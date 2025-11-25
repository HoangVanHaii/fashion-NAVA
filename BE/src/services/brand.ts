import { ConnectionPool, pool } from "mssql";
import { IBrandCreate, IBrandResponse, IBrandUpdate } from "../interfaces/brand";
import { AppError } from "../utils/appError";
import cloudinary from "../config/cloudinary";

export const addBrand = async (pool: ConnectionPool, brand: IBrandCreate): Promise<void> => {
    try {
        const logoFile = await uploadToCloudinary(brand.logo);
        await pool.request()
            .input("name", brand.name)
            .input("description", brand.description || null)
            .input("status", brand.status || "active")
            .input("logo", logoFile.secure_url)
            .query(`
                INSERT INTO brands (name, description, status, logo)
                VALUES (@name, @description, @status, @logo)
            `);
    } catch (error) {
        console.error("Failed to add brand", error);
        throw new AppError("Failed to add brand", 500, false);
    }
};

const uploadToCloudinary = (file: any) => {
    return cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        {folder: "Brands"}
    )
}

export const changeLogo = async (pool: ConnectionPool, id: string, logo: Express.Multer.File) => {
    try {
        const logoFile = await uploadToCloudinary(logo);

        const checkBrand = await pool.request()
            .input("id", id)
            .query(`SELECT ID FROM brands WHERE ID = @id`)
        if (checkBrand.recordset.length === 0) {
            throw new AppError("Brand not found", 404);
        }

        const result = await pool.request()
            .input("logo", logoFile.secure_url)
            .input("id", id)
            .query(`UPDATE brands SET logo = @logo WHERE ID = @id`)
        return logoFile.secure_url;

    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Failed to change logo", error);
        throw new AppError("Failed to change logo", 500, false);
    }
}

export const getAllBrands = async (pool: ConnectionPool, role: string): Promise<IBrandResponse[]> => {
    try {
        let query = `
                SELECT ID as brand_id, name, description, logo, status, created_at
                FROM brands`
        const req = pool.request()
        
        if (role === 'customer') {
            req.input("status", 'active')
            query += ' WHERE status = @status'
        }
        const result = await req.query(query);

        return result.recordset;
    } catch (error) {
        throw new AppError("Failed to get active brands", 500, false);
    }
};

export const getBrandById = async (pool: ConnectionPool, id: string, role: string): Promise<IBrandResponse | null> => {
    try {
        let query = `
                SELECT ID as brand_id, name, description, logo, status, created_at
                FROM brands
                WHERE ID = @id`;
        const req = pool.request()
            .input("id", id)
        if (role === 'customer') {
            req.input("status", 'active')
            query += ' AND status = @status'
        }
        const result = await req.query(query);

        if (result.recordset.length === 0) return null;
        return result.recordset[0];
    } catch (error) {
        console.error("Failed to get brand by id", error);
        throw new AppError("Failed to get brand by id", 500, false);
    }
};

export const updateBrand = async (pool: ConnectionPool, brand: IBrandUpdate): Promise<void> => {
    try {
        let updates: string[] = [];
        let request = pool.request();

        Object.entries(brand).forEach(([key, value]) => {
            if (key !== "brand_id" && value !== undefined && value !== null && value !== "") {
                updates.push(`${key} = @${key}`);
                request.input(key, value);
            }
        });

        if (updates.length === 0) return;

        request.input("ID", brand.brand_id);

        const query = `
            UPDATE brands
            SET ${updates.join(", ")}
            WHERE ID = @ID
        `;

        await request.query(query);
    } catch (error) {
        console.error("Failed to update brand", error);
        throw new AppError("Failed to update brand", 500, false);
    }
};

export const deleteBrand = async (pool: ConnectionPool, id: string): Promise<void> => {
    try {
        await pool.request()
            .input("id", id)
            .query(`
                UPDATE brands
                SET status = 'banned'
                WHERE ID = @id
        `);
    } catch (error) {
        throw new AppError("Failed to soft delete brand", 500, false);
    }
};
