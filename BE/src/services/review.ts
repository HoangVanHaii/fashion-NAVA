import ReviewMongo, { IReviewDetail } from "../models/review.mongo";
import mongoose, { Types } from "mongoose";
import { IChildReview, ProductStat, ReviewDTO } from "../interfaces/review";
import { v2 as cloudinary } from "cloudinary";
import { AppError } from '../utils/appError';
import { OrderDetail as OrderDetailMongo } from "../models/order.mongo";
import { ProductDetailModel as ProductDetailMongo } from "../models/product";
import { mysqlPool } from "../config/database"; // Điều chỉnh lại đường dẫn cấu hình
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";

export const createReview = async (data: ReviewDTO) => {
    const connection = await mysqlPool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query<ResultSetHeader>(`
            INSERT INTO reviews (order_item_id, user_id, mongodb_id, rating)
            VALUES (?, ?, ?, ?)
        `, [
            data.order_item_id,
            data.user_id,
            data.mongodb_id.toHexString(),
            data.rating
        ]);

        const review_id_sql = result.insertId;

        await ReviewMongo.create({
            _id: data.mongodb_id,
            review_id_sql: review_id_sql,
            rating: data.rating,
            comment: data.comment,
            images: data.images,
            videos: data.videos
        });

        await connection.commit();
        return review_id_sql;
    } catch (error) {
        await connection.rollback();
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to create review", 500, false);
    } finally {
        connection.release();
    }
};

export const addChildReview = async (parent_id: string, childReview: IChildReview) => {
    try {
        const updated = await ReviewMongo.findByIdAndUpdate(
            parent_id,
            { $push: { child_reviews: childReview } },
            { new: true }
        );
        return updated;
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to add child review", 500, false);
    }
};

export const updateReview = async (newData: ReviewDTO) => {
    const review = await ReviewMongo.findById(newData.mongodb_id);
    if (!review) throw new AppError("Review not found", 404);

    try {
        if (newData.images && review.images && newData.images.length > 0) {
            for (const img of review.images) {
                await cloudinary.uploader.destroy(img.public_id, { resource_type: "image" });
            }
        }

        if (newData.videos && review.videos && newData.videos.length > 0) {
            for (const vid of review.videos) {
                await cloudinary.uploader.destroy(vid.public_id, { resource_type: "video" });
            }
        }

        const updateFields: any = {};

        if (newData.rating !== undefined) {
            updateFields.rating = newData.rating;
            await mysqlPool.query(
                `UPDATE reviews SET rating = ? WHERE mongodb_id = ?`,
                [newData.rating, newData.mongodb_id.toString()]
            );
        }

        if (newData.comment !== undefined) {
            updateFields.comment = newData.comment;
        }

        if (newData.images !== undefined && newData.images.length > 0) {
            updateFields.images = newData.images;
        }

        if (newData.videos !== undefined && newData.videos.length > 0) {
            updateFields.videos = newData.videos;
        }

        return await ReviewMongo.findOneAndUpdate(
            { _id: newData.mongodb_id },
            { $set: updateFields },
            { new: true }
        );
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to update review", 500, false);
    }
};

export const updateChildReview = async (parent_id: string, child_id: string, newData: IChildReview, user_id: string) => {
    const parent = await ReviewMongo.findById(parent_id);
    if (!parent) throw new AppError("Parent review not found", 404);

    const child = parent.child_reviews.id(child_id);
    if (!child) throw new AppError("Child review not found", 404);

    if (child.user_id.toString() !== user_id.toString()) {
        throw new AppError("Only the user who created this child review is allowed to update it.", 403);
    }

    try {
        if (newData.images && child.images && newData.images.length > 0) {
            for (const img of child.images) {
                await cloudinary.uploader.destroy(img.public_id, { resource_type: "image" });
            }
        }

        if (newData.videos && child.videos && newData.videos.length > 0) {
            for (const vid of child.videos) {
                await cloudinary.uploader.destroy(vid.public_id, { resource_type: "video" });
            }
        }

        const updateFields: any = {};
        if (newData.comment) {
            updateFields["child_reviews.$.comment"] = newData.comment;
        }

        if (newData.images && newData.images.length > 0) {
            updateFields["child_reviews.$.images"] = newData.images;
        }

        if (newData.videos && newData.videos.length > 0) {
            updateFields["child_reviews.$.videos"] = newData.videos;
        }

        return await ReviewMongo.findOneAndUpdate(
            { _id: parent_id, "child_reviews._id": child_id },
            { $set: updateFields },
            { new: true }
        );
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to update child review", 500, false);
    }
};

export const deleteReview = async (review_id_sql: number, mongodb_id: string, user_id: number) => {
    const review = await ReviewMongo.findById(mongodb_id);
    if (!review) throw new AppError("Review not found", 404);

    const connection = await mysqlPool.getConnection();
    try {
        await connection.beginTransaction();

        for (const img of review.images || []) {
            await cloudinary.uploader.destroy(img.public_id, { resource_type: "image" });
        }
        for (const vid of review.videos || []) {
            await cloudinary.uploader.destroy(vid.public_id, { resource_type: "video" });
        }

        for (const child of review.child_reviews || []) {
            for (const img of child.images || []) {
                await cloudinary.uploader.destroy(img.public_id, { resource_type: "image" });
            }
            for (const vid of child.videos || []) {
                await cloudinary.uploader.destroy(vid.public_id, { resource_type: "video" });
            }
        }

        await ReviewMongo.findByIdAndDelete(mongodb_id);

        await connection.query(
            `DELETE FROM reviews WHERE ID = ? AND user_id = ?`,
            [review_id_sql, user_id]
        );

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to delete review", 500, false);
    } finally {
        connection.release();
    }
};

export const deleteChildReview = async (parent_id: string, child_id: string, user_id: number) => {
    const parent = await ReviewMongo.findById(parent_id);
    if (!parent) throw new AppError("Parent review not found", 404);

    const child = parent.child_reviews.id(child_id);
    if (!child) throw new AppError("Child review not found", 404);

    if (child.user_id.toString() !== user_id.toString()) {
        throw new AppError("Only the user who created this child review is allowed to update it.", 403);
    }

    try {
        for (const img of child.images || []) {
            await cloudinary.uploader.destroy(img.public_id, { resource_type: "image" });
        }
        for (const vid of child.videos || []) {
            await cloudinary.uploader.destroy(vid.public_id, { resource_type: "video" });
        }

        const updatedParent = await ReviewMongo.findByIdAndUpdate(
            parent_id,
            { $pull: { child_reviews: { _id: child_id } } },
            { new: true }
        );
        return updatedParent;
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to delete child review", 500, false);
    }
};

export const getReviewsByProductId = async (product_id: number, user_id: number) => {
    const sqlQuery = `
        SELECT 
            r.ID AS review_id_sql,
            r.mongodb_id,
            r.user_id,
            r.created_at,
            oi.ID AS order_item_id,
            u.name AS user_name,
            u.avatar AS user_avatar
        FROM reviews r
        JOIN order_items oi ON r.order_item_id = oi.ID
        JOIN users u ON r.user_id = u.ID
        WHERE oi.product_id = ?
        ORDER BY r.created_at DESC
    `;

    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(sqlQuery, [product_id]);

        if (rows.length === 0) {
            return { total_reviews: 0, average_rating: 0, reviews: [] };
        }

        const mongoIDs = rows.map(r => r.mongodb_id);
        const mongoReviews: any[] = await ReviewMongo.find({ _id: { $in: mongoIDs } }).lean();

        const childUserIds = new Set<string>();
        mongoReviews.forEach((mReview: any) => {
            if (mReview.child_reviews && Array.isArray(mReview.child_reviews)) {
                mReview.child_reviews.forEach((child: any) => {
                    if (child.user_id) childUserIds.add(child.user_id);
                });
            }
        });

        let childUsersMap = new Map<string, { name: string, avatar: string }>();

        if (childUserIds.size > 0) {
            const idList = Array.from(childUserIds);

            // MySQL sử dụng cú pháp IN (?)
            const [userRows] = await mysqlPool.query<RowDataPacket[]>(
                `SELECT ID, name, avatar FROM users WHERE ID IN (?)`,
                [idList]
            );

            userRows.forEach(u => {
                childUsersMap.set(u.ID.toString(), { name: u.name, avatar: u.avatar });
            });
        }

        const merge = rows.map(r => {
            const mReview: any = mongoReviews.find((m: any) => m._id.toString() === r.mongodb_id) || {};

            let processedChildReviews: any[] = [];

            if (mReview.child_reviews && Array.isArray(mReview.child_reviews)) {
                processedChildReviews = mReview.child_reviews.map((child: any) => {
                    const userInfo = childUsersMap.get(child.user_id.toString());
                    return {
                        ...child,
                        user: {
                            id: child.user_id,
                            name: userInfo?.name || 'Unknown User',
                            avatar: userInfo?.avatar || 'default-avatar.png'
                        }
                    };
                });
            }

            return {
                review_id_sql: r.review_id_sql,
                user: {
                    id: r.user_id,
                    name: r.user_name,
                    avatar: r.user_avatar
                },
                created_at: r.created_at,
                rating: r.rating,
                ...mReview,
                child_reviews: processedChildReviews
            };
        });

        const parentReviews = merge.filter(r => r.rating !== undefined && r.rating !== null);
        const total_reviews = parentReviews.length;
        const average_rating = total_reviews > 0
            ? parseFloat((parentReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / total_reviews).toFixed(1))
            : 0;

        const mergeSorted = merge.sort((a, b) => {
            if (a.user.id.toString() === user_id) return -1;
            if (b.user.id.toString() === user_id) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        return {
            total_reviews,
            average_rating,
            reviews: mergeSorted
        };

    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to get reviews", 500, false);
    }
};

const getImageUrlFromMongo = (mongoDetail: any): string => {
    if (mongoDetail && mongoDetail.colors && mongoDetail.colors.length > 0) {
        return mongoDetail.colors[0].image_main;
    }
    return 'default-product.png';
};

export const getAllProductStats = async (): Promise<ProductStat[]> => {
    try {
        const query = `
            SELECT 
                p.id as product_id,
                p.name as product_name,
                COUNT(r.ID) as total_reviews,
                IFNULL(CAST(AVG(r.rating) AS DECIMAL(10, 1)), 0) as avg_star,
                SUM(CASE WHEN r.rating = 5 THEN 1 ELSE 0 END) as total_5_star,
                SUM(CASE WHEN r.rating = 4 THEN 1 ELSE 0 END) as total_4_star,
                SUM(CASE WHEN r.rating = 3 THEN 1 ELSE 0 END) as total_3_star,
                SUM(CASE WHEN r.rating = 2 THEN 1 ELSE 0 END) as total_2_star,
                SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END) as total_1_star
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN reviews r ON oi.ID = r.order_item_id
            GROUP BY p.id, p.name 
            ORDER BY total_reviews DESC 
        `;

        const [stats] = await mysqlPool.query<RowDataPacket[]>(query);

        const productIds = stats.map(s => String(s.product_id).toLowerCase());

        const mongoDetails = await ProductDetailMongo.find(
            { product_id_sql: { $in: productIds } }
        ).select('product_id_sql colors').lean();

        const finalStats = stats.map(sqlRow => {
            const mongoDetail = mongoDetails.find(m =>
                String(m.product_id_sql).toLowerCase() === String(sqlRow.product_id).toLowerCase()
            );

            return {
                ...sqlRow,
                product_image: getImageUrlFromMongo(mongoDetail),
            } as ProductStat;
        });

        return finalStats;

    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("getAllProductStats Error:", error);
        throw new AppError("Failed to get reviews stats", 500, false);
    }
};

export const getAllProductStatsCentral = async (): Promise<ProductStat[]> => {
    // Vì hiện tại chỉ có 1 Database duy nhất, hàm Central hoạt động hoàn toàn giống hàm thường
    return await getAllProductStats();
};

export const getTopDiscussedReviewsByProduct = async (product_id: number) => {
    try {
        const [sqlList] = await mysqlPool.query<RowDataPacket[]>(`
            SELECT r.mongodb_id 
            FROM reviews r
            JOIN order_items oi ON r.order_item_id = oi.ID
            WHERE oi.product_id = ? 
            AND r.mongodb_id IS NOT NULL
        `, [product_id]);

        const productMongoIds = sqlList
            .map(row => row.mongodb_id)
            .filter(id => Types.ObjectId.isValid(id))
            .map(id => new Types.ObjectId(id));

        if (productMongoIds.length === 0) return [];

        const topMongo = await ReviewMongo.aggregate([
            {
                $match: { _id: { $in: productMongoIds } }
            },
            {
                $project: {
                    review_id_sql: 1,
                    comment: 1,
                    images: 1,
                    child_reviews: 1,
                    createdAt: 1,
                    reply_count: { $size: { $ifNull: ["$child_reviews", []] } }
                }
            },
            { $match: { reply_count: { $gt: 0 } } },
            { $sort: { reply_count: -1 } },
            { $limit: 5 }
        ]);

        if (topMongo.length === 0) return [];

        const topSqlIds = topMongo.map(r => r.review_id_sql);

        const [sqlDetails] = await mysqlPool.query<RowDataPacket[]>(`
            SELECT 
                r.ID as review_id_sql,
                r.rating,
                r.created_at,
                u.name as user_name,
                u.avatar as user_avatar
            FROM reviews r
            JOIN users u ON r.user_id = u.ID
            WHERE r.ID IN (?)
        `, [topSqlIds]);

        const finalResult = sqlDetails.map(sqlRow => {
            const mongoRow = topMongo.find(m => m.review_id_sql === sqlRow.review_id_sql);

            return {
                review_id_sql: sqlRow.review_id_sql,
                rating: sqlRow.rating,
                created_at: sqlRow.created_at,
                user: {
                    name: sqlRow.user_name,
                    avatar: sqlRow.user_avatar
                },
                comment: mongoRow?.comment || "",
                images: mongoRow?.images || [],
                child_reviews: mongoRow?.child_reviews || [],
                reply_count: mongoRow?.reply_count || 0
            };
        });

        return finalResult.sort((a, b) => b.reply_count - a.reply_count);
    } catch (error) {
        console.error("getTopDiscussedReviewsByProduct Error:", error);
        throw new AppError("Failed to fetch discussed reviews", 500, false);
    }
};

export const getReviewsByOrderItemIdOfMe = async (order_item_id: number, user_id: number) => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(`
            SELECT 
                r.ID AS review_id_sql,
                r.mongodb_id,
                r.created_at,
                r.rating,
                r.order_item_id,
                oi.product_id,
                oi.size_id_mongo,
                oi.order_id
            FROM reviews r
            JOIN order_items oi ON r.order_item_id = oi.ID
            WHERE r.order_item_id = ? 
              AND r.user_id = ?
        `, [order_item_id, user_id]);

        const row = rows[0];

        if (!row) {
            return [];
        }

        const [mongoReview, mongoOrder] = await Promise.all([
            ReviewMongo.findById(row.mongodb_id).select("-child_reviews").lean(),
            OrderDetailMongo.findOne({ order_id_sql: row.order_id.toString() }).lean()
        ]);

        let productInfo = {
            product_name: "Sản phẩm",
            image: "https://placehold.co/150x150?text=NoImage",
            color: "",
            size: ""
        };

        if (mongoOrder && mongoOrder.items) {
            const matchedItem = mongoOrder.items.find((item: any) =>
                String(item.product_id_sql).toLowerCase() === String(row.product_id).toLowerCase() &&
                String(item.size_id_mongo) === String(row.size_id_mongo)
            );

            if (matchedItem) {
                productInfo = {
                    product_name: matchedItem.product_name,
                    image: matchedItem.image,
                    color: matchedItem.color,
                    size: matchedItem.size
                };
            }
        }

        return [{
            review_id_sql: row.review_id_sql,
            created_at: row.created_at,
            rating: row.rating,
            product_info: productInfo,
            ...(mongoReview || {})
        }];

    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error("getReviewsByOrderItemIdOfMe Error:", error);
        throw new AppError("Failed to fetch review data", 500, false);
    }
};