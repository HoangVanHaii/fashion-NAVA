import ReviewMongo, { IReviewDetail } from "../models/review.mongo";
import { ConnectionPool } from "mssql";
import mongoose, { Mongoose } from "mongoose";
import { getBranchPool } from "../config/databasel";
import { IChildReview, IReviewSQL, ReviewDTO } from "../interfaces/review";
import { v2 as cloudinary } from "cloudinary";

export const createReview = async (data: ReviewDTO) => {
    const pool: ConnectionPool | null = getBranchPool("HN");
    if (!pool) throw new Error("SQL pool không kết nối");
    const transaction = pool.transaction();
    try {
        await transaction.begin(); 
        await pool
            .request()
            .input("ID", data.sql_id)
            .input("order_item_id", data.order_item_id)
            .input("user_id", data.user_id)
            .input("mongodb_id", data.mongodb_id.toHexString())
            .query(`
                INSERT INTO reviews (ID, order_item_id, user_id, mongodb_id)
                VALUES (@ID, @order_item_id, @user_id, @mongodb_id)
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
        throw error; 
    }
};


export const addChildReview = async (parent_id: string, childReview: IChildReview) => {
  const updated = await ReviewMongo.findByIdAndUpdate(
    parent_id,
    { $push: { child_reviews: childReview } },
    { new: true }
  );
  return updated;
};

export const updateReview = async (newData:ReviewDTO) =>{
    const review = await ReviewMongo.findById(newData.mongodb_id);
    if (!review) throw new Error("Review not found");

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
}

export const updateChildReview = async (parent_id:string, child_id:string, newData:IChildReview) =>{
    const parent = await ReviewMongo.findById(parent_id);
    if (!parent) throw new Error("Parent review not found");
    const child = parent.child_reviews.id(child_id) 
    if (!child) throw new Error("Child review not found");

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
}

export const deleteReview = async (review_id_sql: string, mongodb_id: string, branch_code: string) => {
    const pool: ConnectionPool | null = getBranchPool(branch_code || "central");
    if (!pool) throw new Error("SQL pool không kết nối");

    const review = await ReviewMongo.findById(mongodb_id);
    if (!review) throw new Error("Review not found");

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
            .query(`
                DELETE FROM reviews WHERE ID = @ID
            `);

        await transaction.commit();
    } catch (error) {
        await transaction.rollback(); 
        throw error;
    }

    return true;
};


export const deleteChildReview = async (parent_id: string, child_id: string) => {
    const parent = await ReviewMongo.findById(parent_id);
    if (!parent) throw new Error("Parent review not found");

    const child = parent.child_reviews.id(child_id);
    if (!child) throw new Error("Child review not found");

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
};
export const getReviewsByProductId = async (product_id: string,user_id:string) => {
    const pool = getBranchPool("HN"); 
    if (!pool) throw new Error("SQL pool không kết nối");
    try {
        const sqlResult = await pool.request()
        .input("ProductID", product_id)
        .query(`
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
            WHERE oi.product_id = @ProductID
            ORDER BY r.created_at DESC
        `);

        const rows = sqlResult.recordset;
        const mongoIDs = rows.map(r => r.mongodb_id);
        const mongoReviews = await ReviewMongo.find({_id: { $in: mongoIDs }}).lean();
        const merge = rows.map(r=>({
            review_id_sql:r.review_id_sql,
            user:{
                id: r.user_id,
                name: r.user_name,
                avatar: r.user_avatar
            },
            created_at: r.created_at,
            ...mongoReviews.find(m=>m._id.toString()===r.mongodb_id)|| {}
        }));

        const parentReviews = merge.filter(r => r.rating !== undefined && r.rating !== null);
        const total_reviews = parentReviews.length;
        const average_rating = total_reviews > 0
            ? parentReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / total_reviews
            : 0;

        const mergeSorted = merge.sort((a, b) => {
            if (a.user.id === user_id) return -1;
            if (b.user.id === user_id) return 1;
            return 0;
        });

        return {
            total_reviews,
            average_rating,
            reviews: mergeSorted
        };

    } catch (error) {
        console.error(error);
        throw error;
    }
}
