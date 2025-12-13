import { ConnectionPool, pool } from "mssql";
import { BrandRatingResult, IBrandCreate, IBrandResponse, IBrandUpdate } from "../interfaces/brand";
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
        // if (role === 'customer') {
        //     req.input("status", 'active')
        //     query += ' AND status = @status'
        // }
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

export const getBrandAverageRating = async (brandId: string, dbBranch: ConnectionPool): Promise<BrandRatingResult> => {
    try {
        const query = `
            SELECT 
                CAST(AVG(r.rating * 1.0) AS DECIMAL(3, 2)) AS average_rating,
                COUNT(r.ID) AS total_reviews
            FROM reviews r
            INNER JOIN order_items oi ON r.order_item_id = oi.ID 
            INNER JOIN products p ON oi.product_id = p.id
            INNER JOIN brands b ON p.brand_id = b.ID
            WHERE b.ID = @brandId;
        `;

        const result = await dbBranch.request()
            .input('brandId', brandId) 
            .query(query);

        const data = result.recordset[0];

        if (data.total_reviews === 0 || data.average_rating === null) {
            return {
                average_rating: 0,
                total_reviews: 0
            };
        }

        return {
            average_rating: parseFloat(data.average_rating),
            total_reviews: data.total_reviews as number
        };

    } catch (error) {
        console.error("Error in getBrandAverageRating:", error);
        throw new AppError("Failed to get brand rating data", 500);
    }
};
