import { Request, Response,NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuidv4 } from "uuid";
import mongoose, { Types } from "mongoose";
import { IChildReview, ReviewDTO } from "../interfaces/review";
import * as reviewService from "../services/review";

export const createReviewController = async (req: Request, res: Response,next: NextFunction) => {
  const uploadedFiles = req.files as Express.Multer.File[];

  try {
    const files = (uploadedFiles || []).map(file => ({
      secure_url: (file as any).path, 
      public_id: (file as any).filename, 
      mimetype: (file as any).mimetype
    }));

    const images = files.filter(f => f.mimetype.startsWith('image'));
    const videos = files.filter(f => f.mimetype.startsWith('video'));

 
    const cleanImages = images.map(({ secure_url, public_id }) => ({ secure_url, public_id }));
    const cleanVideos = videos.map(({ secure_url, public_id }) => ({ secure_url, public_id }));

    const sql_id = uuidv4();
    const mongodb_id = new mongoose.Types.ObjectId();

    const reviewData: ReviewDTO = {
      sql_id,
      mongodb_id,
      order_item_id: req.body.order_item_id,
      user_id: req.user?.id||"",
      rating: req.body.rating ? Number(req.body.rating) : undefined,
      comment: req.body.comment,
      images: cleanImages,
      videos: cleanVideos
    };
    const branch_code = req.user!.branch_code || "CENTRAL";
    await reviewService.createReview(reviewData,branch_code);
    
    return res.status(201).json({
      success: true,
      message: "Review created successfully",
    });
  } catch (error) {
    console.error(error);

    for (const file of uploadedFiles) {
      if ((file as any).filename) {
        try {
          const type = (file as any).mimetype.startsWith('image') ? 'image' : 'video';
          await cloudinary.uploader.destroy((file as any).filename, { resource_type: type });
        } catch (err) {
          console.error("Delete file Cloudinary failed:", (file as any).filename, err);
        }
      }
    }
    next(error);
  }
};


export const addChildReviewController = async (req: Request, res: Response,next: NextFunction) => {
  const uploadedFiles = req.files as Express.Multer.File[];
  const user_id = req.user?.id;
  const { comment } = req.body; 
  const { parent_id } = req.params;    
  if (!parent_id || !user_id) {
    return res.status(400).json({ message: "parent_id add user_id not null" });
  }

  try {
    const files = (uploadedFiles || []).map(file => ({
      secure_url: (file as any).path,
      public_id: (file as any).filename,
      mimetype: (file as any).mimetype
    }));

    const images = files.filter(f => f.mimetype.startsWith('image'));
    const videos = files.filter(f => f.mimetype.startsWith('video'));

    const cleanImages = images.map(({ secure_url, public_id }) => ({ secure_url, public_id }));
    const cleanVideos = videos.map(({ secure_url, public_id }) => ({ secure_url, public_id }));

    const childReview = {
      user_id,
      comment,
      images: cleanImages,
      videos: cleanVideos,
      createdAt: new Date()
    };

    const updatedReview = await reviewService.addChildReview(parent_id, childReview);

    return res.status(200).json({
      success: true,
      message: "Child review added successfully",
      review: updatedReview
    });
  } catch (error) {
    console.error(error);


    for (const file of uploadedFiles) {
      if ((file as any).filename) {
        try {
          const type = (file as any).mimetype.startsWith('image') ? 'image' : 'video';
          await cloudinary.uploader.destroy((file as any).filename, { resource_type: type });
        } catch (err) {
          console.error("Delete file Cloudinary failed:", (file as any).filename, err);
        }
      }
    }
    next(error);
  }
};

export const updateReviewController = async (req: Request, res: Response,next: NextFunction) =>{
  const { review_id } = req.params;
  const { comment,rating,order_item_id,sql_id } = req.body;
  const user_id= req.user!.id;
  const uploadedFiles = req.files as Express.Multer.File[];
  try {
      const files = (uploadedFiles || []).map(file => ({
        secure_url: (file as any).path,
        public_id: (file as any).filename,
        mimetype: file.mimetype
      }));

      const images = files.filter(f=>f.mimetype.startsWith("image")).map(({ secure_url, public_id }) => ({ secure_url, public_id }));
      const videos = files.filter(f=>f.mimetype.startsWith("video")).map(({ secure_url, public_id }) => ({ secure_url, public_id }));

      const updateData: ReviewDTO = {
        sql_id,     
        mongodb_id:new Types.ObjectId(review_id),  
        order_item_id,
        user_id,
        rating: rating ? rating : undefined,
        comment: comment ? comment : undefined,
        images: images.length > 0 ? images : undefined,
        videos: videos.length > 0 ? videos : undefined,
      };

      const updatedReview = await reviewService.updateReview(updateData);
      return res.status(200).json({
        success: true,
        message: "Child review updated successfully",
        review: updatedReview
      });
  } catch (error) {
    for (const file of uploadedFiles) {
      if ((file as any).filename) {
        try {
          const type = (file as any).mimetype.startsWith('image') ? 'image' : 'video';
          await cloudinary.uploader.destroy((file as any).filename, { resource_type: type });
        } catch (err) {
          console.error("Delete file Cloudinary failed:", (file as any).filename, err);
        }
      }
    }

    next(error);
  }
}

export const updateChildReviewController = async (req: Request, res: Response,next: NextFunction) =>{
  const { parent_id } = req.params;
  const { comment,child_id } = req.body;
  const uploadedFiles = req.files as Express.Multer.File[];
  const user_id=req.user!.id;
  try {
      const files = (uploadedFiles || []).map(file => ({
        secure_url: (file as any).path,
        public_id: (file as any).filename,
        mimetype: file.mimetype
      }));

      const images = files.filter(f=>f.mimetype.startsWith("image")).map(({ secure_url, public_id }) => ({ secure_url, public_id }));
      const videos = files.filter(f=>f.mimetype.startsWith("video")).map(({ secure_url, public_id }) => ({ secure_url, public_id }));

      const updateData: IChildReview = {};
      if (comment) updateData.comment = comment;
      if (images.length > 0) updateData.images = images;
      if (videos.length > 0) updateData.videos = videos;

      const updatedReview = await reviewService.updateChildReview(parent_id,child_id,updateData,user_id);
      return res.status(200).json({
        success: true,
        message: "Child review updated successfully",
        review: updatedReview
      });
  } catch (error) {
    for (const file of uploadedFiles) {
      if ((file as any).filename) {
        try {
          const type = (file as any).mimetype.startsWith('image') ? 'image' : 'video';
          await cloudinary.uploader.destroy((file as any).filename, { resource_type: type });
        } catch (err) {
          console.error("Delete file Cloudinary failed:", (file as any).filename, err);
        }
      }
    }

    next(error);
  }
}

export const deleteReviewController = async (req: Request, res: Response,next: NextFunction) => {
  const { review_id_sql,mongodb_id} = req.params;
  const brand_code="HN"
  const user_id=req.user!.id
  try {
    await reviewService.deleteReview(review_id_sql,mongodb_id,brand_code,user_id);
    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error: any) {
    console.error(error);
    next(error);
  }
};

export const deleteChildReviewController = async (req: Request, res: Response,next: NextFunction) => {
  const { parent_id,child_id } = req.params;
  const user_id=req.user!.id
  try {
    const updatedParent = await reviewService.deleteChildReview(parent_id, child_id,user_id);
    return res.status(200).json({
      success: true,
      message: "Child review deleted successfully",
      review: updatedParent
    });
  } catch (error: any) {
    console.error(error);
    next(error);
  }
};


export const getReviewsByProductId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const product_id = req.params.product_id;
        const user_id= req.user!.id;
        const reviews = await reviewService.getReviewsByProductId(product_id,user_id);
        res.status(200).json({
            success: true,
            message: "Reviews fetched successfully",
            data: reviews
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
}