import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProfileMongo extends Document {
    user_id_sql: string;
    bio?: string;
    preferences?: string[];
    notification_settings?: any;
    last_active?: Date;
    createdAt: Date;
    updatedAt: Date;
    [key: string]: any; 
}

const UserProfileSchema: Schema = new Schema({
    user_id_sql: { type: String, required: true, unique: true },
    bio: { type: String, default: '' },
    preferences: { type: [String], default: [] },

    notification_settings: { type: Schema.Types.Mixed, default: {} },

    last_active: { type: Date, default: Date.now },
}, {
    timestamps: true,
    collection: 'user_profile',
    
    strict: false
});

export const UserProfileModel = mongoose.model<IUserProfileMongo>('UserProfile', UserProfileSchema);