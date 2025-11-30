import mongoose, { Schema, Document } from "mongoose";
import {ICartItem} from "../interfaces/cart"

export interface ICart  extends Document {
    _id: mongoose.Types.ObjectId;
    cart_id_sql: string;   
    user_id_sql: string;  
    items: ICartItem[];
}

const CartItemSchema = new Schema<ICartItem>({
    product_id_sql: { type: String, required: true },
    size_id_mongo: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1, min: 1 }
});


const CartSchema = new Schema<ICart>({
    _id: { type: Schema.Types.ObjectId, required: true },
    cart_id_sql: { type: String, required: true, unique: true },
    user_id_sql: { type: String, required: true, unique: true },
    items: { type: [CartItemSchema], default: [] },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default mongoose.model<ICart>("Cart_Item", CartSchema);