import { RowDataPacket } from "mysql2";
import { BrandRatingResult, IBrandCreate, IBrandResponse, IBrandUpdate } from "../interfaces/brand";
import { AppError } from "../utils/appError";
import cloudinary from "../config/cloudinary";
import { mysqlPool } from "../config/database"; 

const uploadToCloudinary = (file: any) => {
    return cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        { folder: "Brands" }
    );
};

export const addBrand = async (brand: IBrandCreate): Promise<void> => {
    try {
        const logoFile = await uploadToCloudinary(brand.logo);
        await mysqlPool.query(
            `INSERT INTO brands (name, description, status, logo)
             VALUES (?, ?, ?, ?)`,
            [
                brand.name,
                brand.description || null,
                brand.status || "active",
                logoFile.secure_url
            ]
        );
    } catch (error) {
        console.error("Failed to add brand", error);
        throw new AppError("Failed to add brand", 500, false);
    }
};

export const changeLogo = async (id: string, logo: Express.Multer.File) => {
    try {
        const logoFile = await uploadToCloudinary(logo);

        const [rows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT ID FROM brands WHERE ID = ?`,
            [id]
        );

        if (rows.length === 0) {
            throw new AppError("Brand not found", 404);
        }

        await mysqlPool.query(
            `UPDATE brands SET logo = ? WHERE ID = ?`,
            [logoFile.secure_url, id]
        );
        return logoFile.secure_url;

    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("Failed to change logo", error);
        throw new AppError("Failed to change logo", 500, false);
    }
};

export const getAllBrands = async (role: string): Promise<IBrandResponse[]> => {
    try {
        let query = `SELECT ID as brand_id, name, description, logo, status, created_at FROM brands`;
        const params: any[] = [];

        if (role === 'customer') {
            query += ` WHERE status = ?`;
            params.push('active');
        }

        const [rows] = await mysqlPool.query<RowDataPacket[]>(query, params);
        return rows as IBrandResponse[];
    } catch (error) {
        throw new AppError("Failed to get active brands", 500, false);
    }
};

export const getBrandById = async (id: string, role: string): Promise<IBrandResponse | null> => {
    try {
        const query = `SELECT ID as brand_id, name, description, logo, status, created_at FROM brands WHERE ID = ?`;

        const [rows] = await mysqlPool.query<RowDataPacket[]>(query, [id]);

        if (rows.length === 0) return null;
        return rows[0] as IBrandResponse;
    } catch (error) {
        console.error("Failed to get brand by id", error);
        throw new AppError("Failed to get brand by id", 500, false);
    }
};

export const updateBrand = async (brand: IBrandUpdate): Promise<void> => {
    try {
        let updates: string[] = [];
        let values: any[] = [];

        Object.entries(brand).forEach(([key, value]) => {
            if (key !== "brand_id" && value !== undefined && value !== null && value !== "") {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        });

        if (updates.length === 0) return;

        // Thêm ID vào cuối mảng values cho mệnh đề WHERE
        values.push(brand.brand_id);

        const query = `
            UPDATE brands
            SET ${updates.join(", ")}
            WHERE ID = ?
        `;

        await mysqlPool.query(query, values);
    } catch (error) {
        console.error("Failed to update brand", error);
        throw new AppError("Failed to update brand", 500, false);
    }
};

export const deleteBrand = async (id: string): Promise<void> => {
    try {
        await mysqlPool.query(
            `UPDATE brands
             SET status = 'banned'
             WHERE ID = ?`,
            [id]
        );
    } catch (error) {
        throw new AppError("Failed to soft delete brand", 500, false);
    }
};

export const getBrandAverageRating = async (brandId: string): Promise<BrandRatingResult> => {
    try {
        // Trong MySQL, hàm AVG tự động xử lý trả về số thập phân nên không cần ép kiểu * 1.0 như SQL Server
        const query = `
            SELECT 
                CAST(AVG(r.rating) AS DECIMAL(3, 2)) AS average_rating,
                COUNT(r.ID) AS total_reviews
            FROM reviews r
            INNER JOIN order_items oi ON r.order_item_id = oi.ID 
            INNER JOIN products p ON oi.product_id = p.id
            INNER JOIN brands b ON p.brand_id = b.ID
            WHERE b.ID = ?;
        `;

        const [rows] = await mysqlPool.query<RowDataPacket[]>(query, [brandId]);
        const data = rows[0];

        if (data.total_reviews === 0 || data.average_rating === null) {
            return {
                average_rating: 0,
                total_reviews: 0
            };
        }

        return {
            average_rating: parseFloat(data.average_rating),
            total_reviews: Number(data.total_reviews)
        };

    } catch (error) {
        console.error("Error in getBrandAverageRating:", error);
        throw new AppError("Failed to get brand rating data", 500);
    }
};