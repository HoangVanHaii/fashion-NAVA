import * as bcrypt from 'bcrypt';
import { mysqlPool } from '../config/database';
import { sendOtp, generateOTP } from '../utils/sendOTP';
import { UserProfileModel } from '../models/user.mongo';
import { Address } from '../interfaces/address';
import * as jwtUtils from '../utils/token';
import mongoose from 'mongoose';
import { AppError } from '../utils/appError';
import cloudinary from '../config/cloudinary';
import { IKpiResponse } from '../interfaces/order';
import { getDateRange } from './order';
import { RowDataPacket, PoolConnection } from 'mysql2/promise';
import { User, UserProfile } from '../interfaces/user';

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const resendOTP = async (email: string): Promise<void> => {
    const otp = generateOTP();
    await mysqlPool.query(`DELETE FROM otp_codes WHERE email = ?`, [email]);
    await mysqlPool.query(
        `INSERT INTO otp_codes (email, otp, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
        [email, otp]
    );
    await sendOtp(email, otp);
};

const checkExistingUser = async (email: string): Promise<boolean | null> => {
    const [rows] = await mysqlPool.query<RowDataPacket[]>(
        `SELECT id, is_verified FROM users WHERE email = ?`,
        [email]
    );
    if (rows.length === 0) return null;
    return rows[0].is_verified === 1 ? true : false;
};

const insertUserSql = async (
    conn: PoolConnection,
    name: string,
    email: string,
    is_verified: number,
    role: string,
    hashedPassword: string,
    phone: string,
    dob: Date,
    gender: string,
    mongodb_id: mongoose.Types.ObjectId
): Promise<number> => {
    const [result]: any = await conn.query(
        `INSERT INTO users (name, email, password, phone, date_of_birth, gender, avatar, is_verified, status, role, mongodb_id)
         VALUES (?, ?, ?, ?, ?, ?, 'https://res.cloudinary.com/djti5v9ex/image/upload/v1780481896/user_default_kycexh.png', ?, 'active', ?, ?)`,
        [name, email, hashedPassword, phone, dob, gender, is_verified, role, mongodb_id.toString()]
    );
    return result.insertId as number;
};

const saveOtpCode = async (conn: PoolConnection, email: string, otp: string): Promise<void> => {
    await conn.query(`DELETE FROM otp_codes WHERE email = ?`, [email]);
    await conn.query(
        `INSERT INTO otp_codes (email, otp, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
        [email, otp]
    );
};

const insertAddress = async (
    conn: PoolConnection,
    userId: number,
    name: string,
    phone: string,
    address: Address
): Promise<void> => {
    await conn.query(
        `INSERT INTO addresses (user_id, name, phone, is_default, address)
         VALUES (?, ?, ?, 1, ?)`,
        [userId, name, phone, address.street_address ?? JSON.stringify(address)]
    );
};

const createMongoProfile = async (
    userId: number,
    bio: any,
    mongodb_id: mongoose.Types.ObjectId,
    preferences: any
) => {
    return await UserProfileModel.create({
        _id: mongodb_id,
        user_id_sql: userId.toString(),
        bio,
        preferences,
        last_active: new Date(),
    });
};

const uploadToCloudinary = (file: any) =>
    cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        { folder: "Users" }
    );


// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export const registerUser = async (
    name: string,
    email: string,
    password: string,
    phone: string,
    date_of_birth: Date,
    gender: string,
    address: Address,
    bio: any,
    preferences: any
): Promise<void> => {
    const existingUser = await checkExistingUser(email);

    if (existingUser !== null) {
        if (existingUser) throw new AppError("Email already in use.", 409);
        return resendOTP(email);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newMongoId = new mongoose.Types.ObjectId();

    const conn = await mysqlPool.getConnection();
    await conn.beginTransaction();
    try {
        const newUserId = await insertUserSql(
            conn, name, email, 0, 'customer',
            hashedPassword, phone, date_of_birth, gender, newMongoId
        );

        const otp = generateOTP();
        await saveOtpCode(conn, email, otp);
        await insertAddress(conn, newUserId, name, phone, address);
        await createMongoProfile(newUserId, bio, newMongoId, preferences);

        await conn.commit();
        await sendOtp(email, otp);
    } catch (err) {
        await conn.rollback();
        await UserProfileModel.findByIdAndDelete(newMongoId);
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to register user", 500, false);
    } finally {
        conn.release();
    }
};

export const verifyOTP = async (email: string, otp: string): Promise<void> => {
    const conn = await mysqlPool.getConnection();
    await conn.beginTransaction();
    try {
        const [otpRows] = await conn.query<RowDataPacket[]>(
            `SELECT ID FROM otp_codes
             WHERE email = ? AND otp = ? AND expires_at > NOW()`,
            [email, otp]
        );

        if (otpRows.length === 0) {
            console.log('Verifying OTP for email:', email, 'with OTP:', otp);
            throw new AppError("Invalid or expired OTP.", 400);
        }

        const [updateResult]: any = await conn.query(
            `UPDATE users SET is_verified = 1 WHERE email = ?`,
            [email]
        );

        if (updateResult.affectedRows === 0) {
            throw new AppError("User not found for this email.", 404);
        }

        await conn.query(`DELETE FROM otp_codes WHERE email = ?`, [email]);
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to verify OTP", 500, false);
    } finally {
        conn.release();
    }
};

export const loginUser = async (email: string, password: string) => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT password, id, name, email, avatar, role, status
             FROM users
             WHERE email = ? AND is_verified = 1`,
            [email]
        );

        if (rows.length === 0) throw new AppError("User not found", 404);
        if (rows[0].status === "banned") throw new AppError("User is banned", 403);

        const user: any = { ...rows[0] };
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new AppError("Invalid password", 401);

        delete user.password;

        const accessToken = jwtUtils.accessToken(user.id, user.email, user.role);
        const refreshToken = jwtUtils.refreshToken(user.id, user.email, user.role);

        return { user, accessToken, refreshToken };
    } catch (err: any) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to login user", 500, false);
    }
};

export const registerAccount = async (
    name: string,
    email: string,
    password: string,
    phone: string,
    date_of_birth: Date,
    gender: string,
    address: Address,
    bio: any,
    preferences: any,
    role: string
): Promise<void> => {
    const existingUser = await checkExistingUser(email);
    if (existingUser) throw new AppError("User already exists", 409);

    const newMongoId = new mongoose.Types.ObjectId();
    const hashedPassword = await bcrypt.hash(password, 10);

    const conn = await mysqlPool.getConnection();
    await conn.beginTransaction();
    try {
        const newUserId = await insertUserSql(
            conn, name, email, 1, role,
            hashedPassword, phone, date_of_birth, gender, newMongoId
        );
        await insertAddress(conn, newUserId, name, phone, address);
        await createMongoProfile(newUserId, bio, newMongoId, preferences);
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        await UserProfileModel.findByIdAndDelete(newMongoId);
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to register account", 500, false);
    } finally {
        conn.release();
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// USER QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export const getAllUsers = async (): Promise<any[]> => {
    try {
        const [sqlUsers] = await mysqlPool.query<RowDataPacket[]>(`SELECT * FROM users`);
        if (sqlUsers.length === 0) return [];

        const listId = sqlUsers.map(u => u.mongodb_id).filter(Boolean);
        const mongoProfiles = await UserProfileModel.find({ _id: { $in: listId } }).lean();

        const profileMap: Record<string, any> = {};
        mongoProfiles.forEach((p: any) => { profileMap[String(p._id)] = p; });

        return sqlUsers.map(user => ({
            ...user,
            profile: user.mongodb_id ? (profileMap[String(user.mongodb_id)] ?? {}) : {},
        }));
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Error in getAllUser:", err);
        throw new AppError("Failed to get all users", 500);
    }
};
export const getUserProfile = async (email: string): Promise<User> => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT u.ID AS user_id, u.name, u.email, u.phone,
                    u.date_of_birth, u.gender, u.role, u.avatar, u.mongodb_id
             FROM users u
             WHERE u.email = ?`,
            [email]
        );

        if (rows.length === 0) throw new AppError("User not found.", 404);

        // Destructure các field cần thiết để tránh kéo theo metadata của RowDataPacket
        const { user_id, name, email: userEmail, phone, date_of_birth, gender, role, avatar, mongodb_id } = rows[0];

        let mongoData: UserProfile | null = null;
        if (mongodb_id) {
            mongoData = await UserProfileModel.findById(mongodb_id).lean() as UserProfile | null;
        } else {
            mongoData = await UserProfileModel.findOne({ user_id_sql: user_id }).lean() as UserProfile | null;
        }

        return {
            user_id,
            name,
            email: userEmail,
            phone,
            date_of_birth,
            gender,
            role,
            avatar,
            mongodb_id,
            profile: mongoData ?? ({} as UserProfile),
        };
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to get user profile", 500, false);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// PROFILE UPDATE
// ─────────────────────────────────────────────────────────────────────────────

export const updateAvatar = async (email: string, avatarFile: Express.Multer.File): Promise<string> => {
    try {
        const uploadResult = await uploadToCloudinary(avatarFile);
        const avatarUrl = uploadResult.secure_url;
        await mysqlPool.query(
            `UPDATE users SET avatar = ? WHERE email = ?`,
            [avatarUrl, email]
        );
        return avatarUrl;
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to update avatar", 500, false);
    }
};

export const updateUserProfile = async (
    email: string,
    name?: string,
    phone?: string,
    date_of_birth?: Date,
    gender?: string,
    bio?: string,
    preferences?: any
): Promise<void> => {
    try {
        const fieldsToUpdate: string[] = [];
        const values: any[] = [];

        if (name !== undefined) { fieldsToUpdate.push("name = ?"); values.push(name); }
        if (phone !== undefined) { fieldsToUpdate.push("phone = ?"); values.push(phone); }
        if (date_of_birth !== undefined) { fieldsToUpdate.push("date_of_birth = ?"); values.push(date_of_birth); }
        if (gender !== undefined) { fieldsToUpdate.push("gender = ?"); values.push(gender); }

        if (fieldsToUpdate.length > 0) {
            values.push(email);
            await mysqlPool.query(
                `UPDATE users SET ${fieldsToUpdate.join(", ")} WHERE email = ?`,
                values
            );
        }

        const [userRows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT id, mongodb_id FROM users WHERE email = ?`,
            [email]
        );

        if (userRows.length === 0) throw new AppError("User not found.", 404);

        const { id: userIdSql, mongodb_id } = userRows[0];

        const updateMongo: any = {};
        if (bio !== undefined) updateMongo.bio = bio;
        if (preferences !== undefined) updateMongo.preferences = preferences;

        if (mongodb_id) {
            if (Object.keys(updateMongo).length > 0) {
                await UserProfileModel.findByIdAndUpdate(mongodb_id, updateMongo);
            }
        } else {
            const newMongoId = new mongoose.Types.ObjectId();
            await UserProfileModel.create({
                _id: newMongoId,
                user_id_sql: userIdSql.toString(),
                bio: bio ?? "",
                preferences: preferences ?? {},
                last_active: new Date(),
            });
            await mysqlPool.query(
                `UPDATE users SET mongodb_id = ? WHERE email = ?`,
                [newMongoId.toString(), email]
            );
        }
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to update profile", 500, false);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

export const forgotPasswordSendOTP = async (email: string): Promise<void> => {
    const [rows] = await mysqlPool.query<RowDataPacket[]>(
        `SELECT id FROM users WHERE email = ?`,
        [email]
    );
    if (rows.length === 0) throw new AppError("User not found.", 404);
    return resendOTP(email);
};

export const forgotPasswordVerifyOTP = async (email: string, otp: string): Promise<void> => {
    const conn = await mysqlPool.getConnection();
    await conn.beginTransaction();
    try {
        const [otpRows] = await conn.query<RowDataPacket[]>(
            `SELECT ID FROM otp_codes
             WHERE email = ? AND otp = ? AND expires_at > NOW()`,
            [email, otp]
        );
        if (otpRows.length === 0) throw new AppError("Invalid or expired OTP.", 400);

        await conn.query(`DELETE FROM otp_codes WHERE email = ?`, [email]);
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to verify OTP", 500, false);
    } finally {
        conn.release();
    }
};

export const forgotPasswordReset = async (email: string, newPassword: string): Promise<void> => {
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await mysqlPool.query(
            `UPDATE users SET password = ? WHERE email = ?`,
            [hashedPassword, email]
        );
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to reset password", 500, false);
    }
};

export const changePassword = async (email: string, oldPassword: string, newPassword: string): Promise<void> => {
    try {
        const [rows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT password FROM users WHERE email = ?`,
            [email]
        );
        if (rows.length === 0) throw new AppError("User not found", 404);

        const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
        if (!isMatch) throw new AppError("Incorrect current password", 401);

        const hashed = await bcrypt.hash(newPassword, 10);
        await mysqlPool.query(
            `UPDATE users SET password = ? WHERE email = ?`,
            [hashed, email]
        );
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to change password", 500, false);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// ROLE / STATUS
// ─────────────────────────────────────────────────────────────────────────────

export const changeUserRole = async (email: string, newRole: string): Promise<void> => {
    try {
        await mysqlPool.query(
            `UPDATE users SET role = ? WHERE email = ?`,
            [newRole, email]
        );
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to change user role", 500, false);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// KPI / STATISTICS
// ─────────────────────────────────────────────────────────────────────────────

export const getTotalUserComparisonService = async (type: string): Promise<IKpiResponse> => {
    try {
        const { currentStart, currentEnd, previousStart, previousEnd } = getDateRange(type);
        const isAllTime = type.toLowerCase() === 'từ trước tới nay';

        const [currentRows] = await mysqlPool.query<RowDataPacket[]>(
            `SELECT COUNT(ID) AS total
             FROM users
             WHERE is_verified = 1
               AND created_at >= ${currentStart} AND created_at < ${currentEnd}`
        );
        const currentTotal = currentRows[0]?.total || 0;

        let previousTotal = 0;
        if (!isAllTime) {
            const [prevRows] = await mysqlPool.query<RowDataPacket[]>(
                `SELECT COUNT(ID) AS previous_total
                 FROM users
                 WHERE is_verified = 1
                   AND created_at >= ${previousStart} AND created_at < ${previousEnd}`
            );
            previousTotal = prevRows[0]?.previous_total || 0;
        }

        return { total: currentTotal, previousTotal };
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("getTotalUserComparisonService Error:", err);
        throw new AppError("Failed to get user comparison data", 500);
    }
};