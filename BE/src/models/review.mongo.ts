import mongoose, { Schema, Document, Types } from "mongoose";

export interface IChildReview {
  comment?: string;
  user_id: string;
  images?: { secure_url: string; public_id: string }[];
  videos?: { secure_url: string; public_id: string }[];
  createdAt?: Date;
}

export interface IReviewDetail extends Document {
  _id: mongoose.Types.ObjectId;
  review_id_sql: string; 
  rating?: number;
  comment?: string;
  images?: { secure_url: string; public_id: string }[];
  videos?: { secure_url: string; public_id: string }[];
  child_reviews: Types.DocumentArray<IChildReview>;
}
const ChildReviewSchema = new mongoose.Schema({
  comment: { type: String },
  user_id: { type: String, required: true },
  images: [
    {
      secure_url: String,
      public_id: String,
    }
  ],
  videos: [
    {
      secure_url: String,
      public_id: String,
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

const ReviewDetailSchema: Schema = new Schema(
  {
     _id: { type: Schema.Types.ObjectId, required: true },
    review_id_sql: { type: String, required: true },
    rating: { type: Number, default: null },
    comment: { type: String, default: null },
    images: [
      {
        secure_url: { type: String, required: true },
        public_id: { type: String, required: true }
      }
    ],
    videos: [
      {
        secure_url: { type: String, required: true },
        public_id: { type: String, required: true }
      }
    ],
    child_reviews: [ChildReviewSchema]
  },
  { 
    timestamps: true,
    collection: 'reviews_detail' 
  },
);

export default mongoose.model<IReviewDetail>("ReviewMongo", ReviewDetailSchema);
