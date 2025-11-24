import { IOrderDetail } from "../interfaces/order";
import mongoose, { Schema } from 'mongoose';


const OrderItemSchema = new Schema({
    product_id_sql: { type: String, required: true }, 
    size_id_mongo: { type: String, required: true },

    product_name: { type: String, required: true },
    image: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    quantity: { type: Number, required: true },

    price: { type: Number, required: true },
    flash_sale_price: { type: Number }
}, { _id: false }); 

const OrderDetailSchema = new Schema({
    order_id_sql: {
        type: String,
        required: true,
        index: true
    },
    items: [OrderItemSchema]
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false }
});

export const OrderDetail = mongoose.model<IOrderDetail>(
    'OrderDetail',
    OrderDetailSchema,
    'order_details'
);