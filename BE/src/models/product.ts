import mongoose, { Schema, Document, Model } from 'mongoose';
import * as IProduct from '../interfaces/product'

const ProductSizeSchema = new Schema<IProduct.IProductSizePayload>({
    _id: {type: Schema.Types.ObjectId, required: true},
    size: { type: String, required: true },
});

const ProductColorSchema = new Schema<IProduct.IProductColorPayload>({
    _id: {type: Schema.Types.ObjectId, required: true},
    color: { type: String },
    is_main: { type: Boolean, default: false },
    image_main: { type: String, required: true },
    color_images: [{ type: String }],
    sizes: [ProductSizeSchema] 
});

const ProductDetailSchema = new Schema<IProduct.IProductMongo>({
    _id: { type: Schema.Types.ObjectId, required: true },
    product_id_sql: {type: String, required: true},
    description: { type: String, default: '' },
    attributes: { type: Schema.Types.Mixed, default: {} },
    colors: [ProductColorSchema],
    video:  {type: String},
    created_at: {type: Date, default: Date.now},
}, {
    timestamps: false,
    collection: 'product_details'
})

export const ProductDetailModel = mongoose.model<IProduct.IProductMongo>(
    'ProductMongoDetail', 
    ProductDetailSchema
);