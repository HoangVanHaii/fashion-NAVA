export interface User {
    user_id: string;
    name: string;
    email: string;
    phone: string;
    date_of_birth: Date;
    gender: "male" | "female" | "other";
    role: string;
    avatar: string;
    mongodb_id: string;
    branch: string;
    profile: UserProfile;
}

export interface UserProfile {
    _id: string;
    user_id_sql: string;
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
