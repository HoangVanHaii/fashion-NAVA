import ReviewMongo, { IReviewDetail } from "../models/review.mongo";
import { ConnectionPool, Request, Transaction } from "mssql";
import mongoose, { Mongoose, Types } from "mongoose";
import { getBranchPool } from "../config/database";
import { IChildReview, ProductStat, ReviewDTO } from "../interfaces/review";
import { v2 as cloudinary } from "cloudinary";
import { AppError } from '../utils/appError'; 
import { OrderDetail as OrderDetailMongo } from "../models/order.mongo";
import { ProductDetailModel as ProductDetailMongo } from "../models/product";

export const createReview = async (data: ReviewDTO,branch_code:string) => {
    const pool: ConnectionPool | null= getBranchPool(branch_code);
    if (!pool) throw new AppError("SQL pool cannot connect", 503); 

    const transaction = pool.transaction();
    try {
        await transaction.begin(); 
        await transaction
            .request()
            .input("ID", data.sql_id)
            .input("order_item_id", data.order_item_id)
            .input("user_id", data.user_id)
            .input("mongodb_id", data.mongodb_id.toHexString())
            .input("rating", data.rating)
            .query(`
                INSERT INTO reviews (ID, order_item_id, user_id, mongodb_id,rating)
                VALUES (@ID, @order_item_id, @user_id, @mongodb_id,@rating)
            `);

        await ReviewMongo.create({
            _id: data.mongodb_id,
            review_id_sql: data.sql_id,
            rating: data.rating,
            comment: data.comment,
            images: data.images,
            videos: data.videos
        });

        await transaction.commit();
    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackErr) {
            console.error("Rollback SQL thất bại:", rollbackErr);
        }
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to create review", 500,false); 
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
        throw new AppError("Failed to add child review", 500,false);
    }
};

export const updateReview = async (newData:ReviewDTO,branch_code:string) =>{
    const review = await ReviewMongo.findById(newData.mongodb_id);
    if (!review) throw new AppError("Review not found", 404); 

    try {
        if (newData.images && review.images && newData.images.length > 0) {
            for (const img of review.images) {
                await cloudinary.uploader.destroy(img.public_id, { resource_type: "image" });
            }
        }

        if (newData.videos && review.videos &&newData.videos.length > 0) {
            for (const vid of review.videos) {
                await cloudinary.uploader.destroy(vid.public_id, { resource_type: "video" });
            }
        }
        const updateFields: any = {};
        if(newData.rating!==undefined){
            updateFields.rating  = newData.rating;
            const pool = getBranchPool(branch_code); 
            if (pool) {
                await pool.request()
                    .input('rating', newData.rating)
                    .input('mongo_id', newData.mongodb_id.toString())
                    .query(`UPDATE reviews SET rating = @rating WHERE mongodb_id = @mongo_id`);
            }
        }

        if(newData.comment!==undefined){
            updateFields.comment = newData.comment;
        }

        if (newData.images!==undefined && newData.images.length > 0) {
            updateFields.images= newData.images;
        }

        if (newData.videos!==undefined && newData.videos.length > 0) {
            updateFields.videos = newData.videos;
        }

        return await ReviewMongo.findOneAndUpdate(
            { _id: newData.mongodb_id},
            { $set: updateFields },
            { new: true }
        );
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to update review", 500,false);
    }
}

export const updateChildReview = async (parent_id:string, child_id:string, newData:IChildReview,user_id:string) =>{
    const parent = await ReviewMongo.findById(parent_id);
    if (!parent) throw new AppError("Parent review not found", 404); 

    const child = parent.child_reviews.id(child_id) 
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

        if (newData.videos && child.videos &&newData.videos.length > 0) {
            for (const vid of child.videos) {
                await cloudinary.uploader.destroy(vid.public_id, { resource_type: "video" });
            }
        }
        const updateFields: any = {};
        if(newData.comment){
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
        throw new AppError("Failed to update child review", 500,false);
    }
}

export const deleteReview = async (review_id_sql: string, mongodb_id: string, branch_code: string,user_id:string) => {
    const pool: ConnectionPool | null = getBranchPool(branch_code || "central");
    if (!pool) throw new AppError("SQL pool cannot connect", 503); 

    const review = await ReviewMongo.findById(mongodb_id);
    if (!review) throw new AppError("Review not found", 404); 
    
    try {
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
        const transaction = pool.transaction();

        try {
            await transaction.begin();

            await transaction.request()
                .input("ID", review_id_sql)
                .input("user_id",user_id)
                .query(`
                    DELETE FROM reviews WHERE ID = @ID AND user_id = @user_id
                `);

            await transaction.commit();
        } catch (error) {
            await transaction.rollback(); 
            throw error; 
        }

        return true;
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to delete review", 500,false);
    }
};


export const deleteChildReview = async (parent_id: string, child_id: string,user_id:string) => {
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

        const updatedParent= await ReviewMongo.findByIdAndUpdate(
            parent_id,
            { $pull: { child_reviews: { _id: child_id } } },
            { new: true }
        );
        return updatedParent;
    } catch (error) {
        if (error instanceof AppError) throw error;
        console.error(error);
        throw new AppError("Failed to delete child review", 500,false);
    }
};
// export const getReviewsByProductId = async (product_id: string,user_id:string,branch_code:string) => {
//     const pool = getBranchPool(branch_code); 
//     if (!pool) throw new AppError("SQL pool cannot connect", 503);
    
//     try {
//         const sqlResult = await pool.request()
//         .input("ProductID", product_id)
//         .query(`
//             SELECT 
//                 r.ID AS review_id_sql,
//                 r.mongodb_id,
//                 r.user_id,
//                 r.created_at,
//                 oi.ID AS order_item_id,
//                 u.name AS user_name,
//                 u.avatar AS user_avatar
//             FROM reviews r
//             JOIN order_items oi ON r.order_item_id = oi.ID
//             JOIN users u ON r.user_id = u.ID
//             WHERE oi.product_id = @ProductID
//             ORDER BY r.created_at DESC
//         `);

//         const rows = sqlResult.recordset;
//         const mongoIDs = rows.map(r => r.mongodb_id);
//         const mongoReviews = await ReviewMongo.find({_id: { $in: mongoIDs }}).lean();
//         const merge = rows.map(r=>({
//             review_id_sql:r.review_id_sql,
//             user:{
//                 id: r.user_id,
//                 name: r.user_name,
//                 avatar: r.user_avatar
//             },
//             created_at: r.created_at,
//             ...mongoReviews.find(m=>m._id.toString()===r.mongodb_id)|| {}
//         }));

//         const parentReviews = merge.filter(r => r.rating !== undefined && r.rating !== null);
//         const total_reviews = parentReviews.length;
//         const average_rating = total_reviews > 0
//             ? parentReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / total_reviews
//             : 0;

//         const mergeSorted = merge.sort((a, b) => {
//             if (a.user.id === user_id) return -1;
//             if (b.user.id === user_id) return 1;
//             return 0;
//         });

//         return {
//             total_reviews,
//             average_rating,
//             reviews: mergeSorted
//         };

//     } catch (error) {
//         if (error instanceof AppError) throw error;
//         console.error(error);
//         throw new AppError("Failed to get reviews", 500,false); 
//     }
// }
// Import Pool và các Model cần thiết
// import { getBranchPool } from "../config/database";
// ...

export const getReviewsByProductId = async (product_id: string, user_id: string, branch_code: string) => {
    const sqlQuery = `
        SELECT 
            r.ID AS review_id_sql,
            r.mongodb_id,
            r.user_id,
            r.created_at,
            r.rating,
            oi.ID AS order_item_id,
            u.name AS user_name,
            u.avatar AS user_avatar
        FROM reviews r
        JOIN order_items oi ON r.order_item_id = oi.ID
        JOIN users u ON r.user_id = u.ID
        WHERE oi.product_id = @ProductID
        ORDER BY r.created_at DESC
    `;

    let rows: any[] = [];
    try {
        let pool;
        if (branch_code === 'CENTRAL') {
            const branches = ['HN', 'HCM', 'DN'];
            const promises = branches.map(async (branch) => {
                const p = getBranchPool(branch);
                if (!p) return [];
                try {
                    const result = await p.request()
                        .input("ProductID", product_id)
                        .query(sqlQuery);
                    return result.recordset;
                } catch (e) {
                    console.error(`Error fetching reviews from ${branch}:`, e);
                    return [];
                }
            });
            const results = await Promise.all(promises);
            rows = results.flat();
        } else {
            pool = getBranchPool(branch_code);
            if (!pool) throw new AppError("SQL pool cannot connect", 503);
            const result = await pool.request()
                .input("ProductID", product_id)
                .query(sqlQuery);
            rows = result.recordset;
        }

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
            
            const fetchUsers = async (pPool: any) => {
                 const req = pPool.request();
                 const params = idList.map((id, idx) => {
                     req.input(`u${idx}`, id);
                     return `@u${idx}`;
                 });
                 if (params.length === 0) return [];
                 const query = `SELECT ID, name, avatar FROM users WHERE ID IN (${params.join(',')})`;
                 const res = await req.query(query);
                 return res.recordset;
            };

            let userRows: any[] = [];
            
            if (branch_code === 'CENTRAL') {
                 const branches = ['HN', 'HCM', 'DN'];
                 const uPromises = branches.map(async (b) => {
                     const p = getBranchPool(b);
                     if(!p) return [];
                     return await fetchUsers(p).catch(() => []);
                 });
                 const uResults = await Promise.all(uPromises);
                 userRows = uResults.flat();
            } else {
                 const p = getBranchPool(branch_code);
                 if(p) userRows = await fetchUsers(p);
            }

            userRows.forEach(u => {
                childUsersMap.set(u.ID, { name: u.name, avatar: u.avatar });
            });
        }

        const merge = rows.map(r => {
            const mReview: any = mongoReviews.find((m: any) => m._id.toString() === r.mongodb_id) || {};
            
            let processedChildReviews: any[] = [];
            
            if (mReview.child_reviews && Array.isArray(mReview.child_reviews)) {
                processedChildReviews = mReview.child_reviews.map((child: any) => {
                    const userInfo = childUsersMap.get(child.user_id);
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
            if (a.user.id === user_id) return -1;
            if (b.user.id === user_id) return 1;
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
}

const getImageUrlFromMongo = (mongoDetail: any): string => {
    if (mongoDetail && mongoDetail.colors && mongoDetail.colors.length > 0) {
        return mongoDetail.colors[0].image_main; 
    }
    return 'default-product.png'; 
};

export const getAllProductStats = async (branch_code: string): Promise<ProductStat[]> => {
    try {
        const pool = getBranchPool(branch_code);
        if (!pool) throw new AppError("SQL pool cannot connect", 503);

        // BƯỚC 1: Query SQL (Giữ nguyên)
        const query = `
            SELECT 
                p.id as product_id,
                p.name as product_name,
                COUNT(r.ID) as total_reviews,
                ISNULL(CAST(AVG(CAST(r.rating AS FLOAT)) AS DECIMAL(10, 1)), 0) as avg_star,
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

        const sqlResult = await pool.request().query(query);
        const stats = sqlResult.recordset as ProductStat[];

        // BƯỚC 2: LẤY ẢNH TỪ MONGO (SỬA ĐOẠN NÀY)
        
        // --- [FIX]: Chuyển sang chữ thường giống hệt hàm Central ---
        const productIds = stats.map(s => String(s.product_id).toLowerCase());
        
        const mongoDetails = await ProductDetailMongo.find(
            { product_id_sql: { $in: productIds } }
        ).select('product_id_sql colors').lean();

        // [DEBUG LOG] Giờ bạn sẽ thấy số lượng tìm thấy > 0
        console.log(`[DEBUG] SQL trả về: ${stats.length} sp. Mongo tìm thấy: ${mongoDetails.length} sp.`);

        // BƯỚC 3: GỘP DỮ LIỆU
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
        throw new AppError("Failed to get reviews", 500, false); 
    }
}

export const getAllProductStatsCentral = async (): Promise<ProductStat[]> => { // <-- Ép kiểu trả về
    try {
        const branches = ['HN', 'HCM', 'DN'];

        const query = `
            SELECT 
                p.id as product_id,
                p.name as product_name,
                COUNT(r.ID) as total_reviews,
                ISNULL(SUM(CAST(r.rating AS BIGINT)), 0) as sum_rating, 
                SUM(CASE WHEN r.rating = 5 THEN 1 ELSE 0 END) as total_5_star,
                SUM(CASE WHEN r.rating = 4 THEN 1 ELSE 0 END) as total_4_star,
                SUM(CASE WHEN r.rating = 3 THEN 1 ELSE 0 END) as total_3_star,
                SUM(CASE WHEN r.rating = 2 THEN 1 ELSE 0 END) as total_2_star,
                SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END) as total_1_star
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN reviews r ON oi.ID = r.order_item_id
            GROUP BY p.id, p.name 
        `;
        
        const runQueryForBranch = async (branch: string): Promise<ProductStat[]> => { // <-- Ép kiểu trả về
            const pool = getBranchPool(branch);
            if (!pool) return []; 
            try {
                const result = await pool.request().query(query);
                return result.recordset as ProductStat[]; 
            } catch (e) {
                console.error(`Error branch ${branch}`, e);
                return [];
            }
        };

        const results = await Promise.all(branches.map(item=>runQueryForBranch(item)))

        // FIX LỖI TYPESCRIPT: Flat mảng 2 chiều và ép kiểu
        const allRecords = (results as ProductStat[][]).flat(); 

        const mergedMap = allRecords.reduce((acc, item) => {
            const id = item.product_id;

            if (!acc[id]) {
                acc[id] = { ...item }; 
            } else {
                acc[id].total_reviews += item.total_reviews;
                acc[id].sum_rating    += item.sum_rating; 
                
                acc[id].total_5_star  += item.total_5_star;
                acc[id].total_4_star  += item.total_4_star;
                acc[id].total_3_star  += item.total_3_star;
                acc[id].total_2_star  += item.total_2_star;
                acc[id].total_1_star  += item.total_1_star;
            }
            return acc;
        }, {} as Record<string, any>); 

        
        const mergedStats = Object.values(mergedMap) 
            .map((p: any) => ({
                ...p,
                avg_star: p.total_reviews === 0 ? 0 : Number((p.sum_rating / p.total_reviews).toFixed(1)),
            })).sort((a: any, b: any) => b.total_reviews - a.total_reviews) as ProductStat[];

        // BƯỚC 4: LẤY ẢNH TỪ MONGO CHO KẾT QUẢ GỘP CUỐI CÙNG
        // Chuyển sang chữ thường để khớp với dữ liệu trong MongoDB
        const centralProductIds = mergedStats.map(s => String(s.product_id).toLowerCase());
        
        const mongoDetails = await ProductDetailMongo.find(
            { product_id_sql: { $in: centralProductIds } }
        ).select('product_id_sql colors').lean();

        const finalCentralStats = mergedStats.map(sqlRow => {
            const mongoDetail = mongoDetails.find(m => 
                String(m.product_id_sql).toLowerCase() === String(sqlRow.product_id).toLowerCase()
            );
            
            return {
                ...sqlRow,
                product_image: getImageUrlFromMongo(mongoDetail), // Thêm đường dẫn ảnh
            } as ProductStat; // Ép kiểu kết quả gộp
        });

        return finalCentralStats; 
        
    } catch (error) {
        console.error("getAllProductStatsCentral Error:", error);
        throw new AppError("Failed to get reviews", 500, false);
    }
};

export const getTopDiscussedReviewsByProduct = async (product_id: string, branch_code: string) => {
    const pool = getBranchPool(branch_code);
    if (!pool) throw new AppError("Database connection failed", 500);

    const sqlList = await pool.request()
        .input('productId', product_id)
        .query(`
            SELECT r.mongodb_id 
            FROM reviews r
            JOIN order_items oi ON r.order_item_id = oi.ID
            WHERE oi.product_id = @productId 
            AND r.mongodb_id IS NOT NULL
        `);

    const productMongoIds = sqlList.recordset
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

    const detailResult = await pool.request().query(`
        SELECT 
            r.ID as review_id_sql, -- Đặt alias cho khớp frontend
            r.rating,
            r.created_at,
            u.name as user_name,
            u.avatar as user_avatar
        FROM reviews r
        JOIN users u ON r.user_id = u.ID
        WHERE r.ID IN ('${topSqlIds.join("','")}')
    `);

    const sqlDetails = detailResult.recordset;
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
};

export const getReviewsByOrderItemIdOfMe = async (order_item_id: string, user_id: string, branch_code: string) => {
    const pool = getBranchPool(branch_code);
    if (!pool) throw new AppError("SQL pool cannot connect", 503);

    try {
        const sqlResult = await pool.request()
            .input("OrderItemID", order_item_id)
            .input("UserID", user_id)
            .query(`
                SELECT 
                    r.ID AS review_id_sql,
                    r.mongodb_id,
                    r.created_at,
                    r.rating,
                    r.order_item_id
                FROM reviews r
                WHERE r.order_item_id = @OrderItemID 
                  AND r.user_id = @UserID
            `);

        const row = sqlResult.recordset[0];

        if (!row) {
            return []; 
        }

        const [mongoReview, mongoOrder] = await Promise.all([
            ReviewMongo.findById(row.mongodb_id).select("-child_reviews").lean(),
            
            OrderDetailMongo.findOne({ order_id_sql: row.order_id }).lean()
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