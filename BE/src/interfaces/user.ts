import mongoose from "mongoose";

export interface User {
    user_id: number;
    name: string;
    email: string;
    phone: string;
    date_of_birth: Date;
    gender: "male" | "female" | "other";
    role: string;
    avatar: string;
    mongodb_id: string;
    profile: UserProfile;
}

export interface UserProfile {
    _id: string | mongoose.Types.ObjectId;
    user_id_sql: number;
    bio?: string;
    preferences: {
        fb?: string;
        [key: string]: any;
    };
    last_active: string;           
    createdAt: string;
    updatedAt: string;
    __v: number;
}
