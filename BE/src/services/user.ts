import { ConnectionPool, Request, Transaction } from 'mssql';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { dbPools, getBranchPool } from '../config/database';
import { sendOtp, generateOTP } from '../utils/sendOTP';
import { UserProfileModel } from '../models/user.mongo';
import { Address } from '../interfaces/address';
import *as jwtUtils from '../utils/token'
import mongoose from 'mongoose';
import { AppError } from '../utils/appError';
import cloudinary from '../config/cloudinary';

const resendOTP = async (email: string, pool: ConnectionPool) => {
    const otp = generateOTP();

    const request = pool.request();
    request.input('email', email);
    request.input('otp', otp);

    await request.query('DELETE FROM otp_codes WHERE email = @email');
    await request.query('INSERT INTO otp_codes (email, otp, expires_at) VALUES (@email, @otp, DATEADD(MINUTE, 5, GETDATE()))');

    await sendOtp(email, otp);
};
const checkExistingUser = async (pool: ConnectionPool, email: string) => {
    const req = dbPools.central.request();
    req.input("email", email);
    const exist_directory = await req.query('SELECT email from user_directory where email = @email');
    if (exist_directory.recordset.length > 0) {
        const result = await pool.request().input('email', email).query(
            "SELECT is_verified FROM users WHERE email = @email"
        );
        if (result.recordset.length > 0) return result.recordset[0].is_verified
        return exist_directory.recordset[0].email;
    }
    return null;

};
const getBranchId = async (pool: ConnectionPool, branch_code: string) => {
    const req = pool.request();
    req.input("branch_code", branch_code);

    const result = await req.query(
        "SELECT id FROM branches WHERE branch_code = @branch_code"
    );

    if (!result.recordset[0]) throw new AppError("Branch not found", 404);

    return result.recordset[0].id;
};
const insertUserSql = async (request: Request, userId: string, name: string, email: string, is_verified : number,role: string, hashedPassword: string, phone: string, dob: Date, gender: string, branchId: string, mongodb_id: mongoose.Types.ObjectId) => {
    request.input("id", userId);
    request.input("name", name);
    request.input("email", email);  
    request.input("is_verified", is_verified);
    request.input("role", role);
    request.input("password", hashedPassword);
    request.input("phone", phone);
    request.input("date_of_birth", dob);
    request.input("gender", gender);
    request.input("branch_id", branchId);
    request.input('mongodb_id', mongodb_id)

    await request.query(`
        INSERT INTO users (ID, name, email, password, phone, date_of_birth, gender, avatar, is_verified, status, role, mongodb_id, branch_id)
        VALUES (@id, @name, @email, @password, @phone, @date_of_birth, @gender, 'default-avatar.png', @is_verified, 'active', @role, @mongodb_id, @branch_id)
    `);
};
const saveOtpCode = async (request: Request, email: string, otp: string) => {
    request.input("email_user", email);
    request.input("otp", otp);

    await request.query("DELETE FROM otp_codes WHERE email = @email");
    await request.query(`
        INSERT INTO otp_codes (email, otp, expires_at)
        VALUES (@email_user, @otp, DATEADD(MINUTE, 5, GETDATE()))
    `);
};
const insertAddress = async (request: Request, userId: string, name: string, phone: string, address: Address) => {
    request.input("shipping_user_id", userId);
    request.input("shipping_name", name);
    request.input("shipping_phone", phone);
    request.input("province", address.province);
    request.input("district", address.district);
    request.input("ward", address.ward);
    request.input("street_address", address.street_address);

    await request.query(`
        INSERT INTO addresses (user_id, name, phone, is_default, province, district, ward, street_address)
        VALUES (@shipping_user_id, @shipping_name, @shipping_phone, 1, @province, @district, @ward, @street_address)
    `);
};

const createMongoProfile = async (userId: string, bio: any, mongodb_id: mongoose.Types.ObjectId, preferences: any) => {
    return await UserProfileModel.create({
        _id: mongodb_id,
        user_id_sql: userId,
        bio: bio,
        preferences: preferences,
        last_active: new Date()
    });
};
const insertUserDirectory = async (email: string, branchCode: string) => {
    const centralPool = dbPools.central;
    if (!centralPool) throw new AppError("Mất kết nối tới Central Database.", 503);

    const req = centralPool.request();
    req.input("email", email);
    req.input("branchCode", branchCode);

    await req.query(`
        IF EXISTS (SELECT email FROM user_directory WHERE email = @email)
            UPDATE user_directory SET branch_code = @branchCode WHERE email = @email
        ELSE
            INSERT INTO user_directory (email, branch_code) VALUES (@email, @branchCode)
    `);
};

export const registerUser = async (name: string, email: string, password: string, phone: string, date_of_birth: Date, gender: string, address: Address, branch_code: string, bio: any, preferences: any) => {
    const pool = getBranchPool(branch_code);
    if (!pool) throw new AppError(`${branch_code} database pool is not connected.`, 503);

    const existingUser = await checkExistingUser(pool, email);
    if (existingUser != null) {
        if (existingUser) throw new AppError("Email already in use.", 409);
        return resendOTP(email, pool);
    }

    const branchId = await getBranchId(pool, branch_code);

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserId = uuidv4();
    const newMongoId = new mongoose.Types.ObjectId();

    const transaction = pool.transaction();
    console.log('service');
    try {
        await transaction.begin();
        const req = transaction.request();

        await insertUserSql(
            req, newUserId, name, email, 0, 'customer', hashedPassword,
            phone, date_of_birth, gender, branchId, newMongoId
        );

        const otp = generateOTP();
        await saveOtpCode(req, email, otp);
        await insertAddress(req, newUserId, name, phone, address);

        await createMongoProfile(newUserId, bio, newMongoId, preferences);

        await insertUserDirectory(email, branch_code);
        await transaction.commit();
        await sendOtp(email, otp);

    } catch (err) {
        console.log(1);

        await transaction.rollback();
        await UserProfileModel.findByIdAndDelete(newMongoId);
        
        if (err instanceof AppError) throw err;
        console.error(err);

        throw new AppError("Failed to loginUser", 500, false);
    }
};

export const verifyOTP = async (email: string, otp: string) => {

    const centralPool = dbPools.central;
    if (!centralPool) throw new AppError("Mất kết nối tới Central Database.", 503);

    const directoryResult = await centralPool.request()
        .input("email", email)
        .query("SELECT branch_code FROM user_directory WHERE email = @email");

    if (directoryResult.recordset.length === 0) {
        throw new AppError("User not found (Directory)", 404);
    }
    const targetBranchCode = directoryResult.recordset[0].branch_code;
    const pool: ConnectionPool | null = getBranchPool(targetBranchCode);

    if (!pool) throw new AppError(`${targetBranchCode} database pool is not connected.`, 503);
    const transaction: Transaction = pool.transaction();
    try {
        await transaction.begin();
        const tranRequest: Request = transaction.request();
        tranRequest.input('email', email);
        tranRequest.input('otp', otp);
        const otpResult = await tranRequest.query(`
            SELECT ID FROM otp_codes 
            WHERE email = @email AND otp = @otp AND expires_at > GETDATE()
        `);
            
        if (otpResult.recordset.length === 0) {
            console.log('Verifying OTP for email:', email, 'with OTP:', otp);
            throw new AppError("Invalid or expired OTP.", 400);
        }

        const updateUserResult = await tranRequest.query(`
            UPDATE users SET is_verified = 1 WHERE email = @email
        `);

        if (updateUserResult.rowsAffected[0] === 0) {
            throw new AppError("User not found for this email.", 404);
        }

        await tranRequest.query('DELETE FROM otp_codes WHERE email = @email');
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        if (err instanceof AppError) throw err;
        console.error(err);

        throw new AppError("Failed to loginUser", 500, false);
    }
};

export const loginUser = async (email: string, password: string) => {
    try {
        const centralPool = dbPools.central;
        if (!centralPool) throw new AppError("Mất kết nối tới Central Database.", 503);

        const directoryResult = await centralPool.request()
            .input("email", email)
            .query("SELECT branch_code FROM user_directory WHERE email = @email");

        if (directoryResult.recordset.length === 0) {
            throw new AppError("User not found (Directory)", 404);
        }

        const targetBranchCode = directoryResult.recordset[0].branch_code;
        const pool = getBranchPool(targetBranchCode) || dbPools.central;

        const result = await pool.request().input("email", email)
            .query(`SELECT u.password, u.id, u.name, u.email, u.avatar, u.role, u.branch_id
                FROM users u
                WHERE email = @email AND is_verified = 1`);
        if (result.recordset.length === 0) {
            throw new AppError("User not found", 404);
        }
        if (result.recordset[0].status === "banned") {
            throw new AppError("User is banned", 403);
        }
        const user = result.recordset[0];
        const isMatch = await bcrypt.compare(
            password,
            result.recordset[0].password
        );
        if (!isMatch) {
            throw new AppError("Invalid password", 401);
        }
        delete user.password;
        const branch = await pool.request().input('branch_id', user.branch_id).query(`SELECT branch_code from branches where id = @branch_id`);
        user.branch_code = branch.recordset[0].branch_code;
        const accessToken = jwtUtils.accessToken(user.id, user.email, user.role, branch.recordset[0].branch_code,user.branch_id);
        const refreshToken = jwtUtils.refreshToken(user.id, user.email, user.role, branch.recordset[0].branch_code, user.branch_id);

        return {
            user,
            accessToken,
            refreshToken,
        };
    } catch (err: any) {
        if (err instanceof AppError) throw err;
        console.error(err);

        throw new AppError("Failed to loginUser", 500, false);
    }
};

export const getUserProfile = async (email: string) => {
    try {
        const centralPool = dbPools.central;
        if (!centralPool) throw new AppError("Mất kết nối Central DB.", 503);

        const directoryResult = await centralPool.request()
            .input("email", email)
            .query("SELECT branch_code FROM user_directory WHERE email = @email");

        if (directoryResult.recordset.length === 0) {
            throw new AppError("User not found in directory.", 404);
        }

        const branchCode = directoryResult.recordset[0].branch_code;
        const branchPool = getBranchPool(branchCode);

        if (!branchPool) throw new AppError(`Chi nhánh ${branchCode} đang bảo trì.`, 503);

        const sqlResult = await branchPool.request()
            .input("email", email)
            .query(`
            SELECT 
                u.ID as user_id, u.name, u.email, u.phone, u.date_of_birth, u.gender, u.role, u.avatar, u.mongodb_id
            FROM users u
            WHERE u.email = @email
        `);

        if (sqlResult.recordset.length === 0) throw new AppError("User data not found in Branch SQL.", 404);

        const sqlData = sqlResult.recordset[0];

        let mongoData = null;
        if (sqlData.mongodb_id) {
            mongoData = await UserProfileModel.findById(sqlData.mongodb_id).lean();
        } else {
            mongoData = await UserProfileModel.findOne({ user_id_sql: sqlData.user_id }).lean();
        }

        return {
            ...sqlData,
            profile: mongoData || {},
            branch: branchCode
        };
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);

        throw new AppError("Failed to loginUser", 500, false);
    }
};

const uploadToCloudinary = (file: any) => {
    return cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        { folder: "Users" }
    )
}

export const updateAvatar = async (email: string, avatarUrl: Express.Multer.File) : Promise<string> => {
    const centralPool = dbPools.central;
    if (!centralPool) throw new AppError("Mất kết nối tới Central Database.", 503);

    const directoryResult = await centralPool.request()
        .input("email", email)
        .query("SELECT branch_code FROM user_directory WHERE email = @email");
    
    if (directoryResult.recordset.length === 0) {
        throw new AppError("User not found in directory.", 404);
    }
    const branch_code = directoryResult.recordset[0].branch_code;
    const pool = getBranchPool(branch_code);
    if (!pool) throw new AppError(`${branch_code} database pool is not connected.`, 503);
    try {
        const uploadResult = await uploadToCloudinary(avatarUrl);
        const avatarUrlStr = uploadResult.secure_url;
        await pool.request()
            .input("email", email)   

            .input("avatar", avatarUrlStr)
            .query(`
                UPDATE users
                SET avatar = @avatar
                WHERE email = @email
            `);
        return avatarUrlStr;
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to update avatar", 500, false);
    }
};
export const upadteUserProfile = async (email: string, name?: string, phone?: string, date_of_birth?: Date, gender?: string, bio?: string, preferences?: any) => {
    const centralPool = dbPools.central;
    if (!centralPool) throw new AppError("Mất kết nối tới Central Database.", 503);

    const directoryResult = await centralPool.request()
        .input("email", email)
        .query("SELECT branch_code FROM user_directory WHERE email = @email");

    if (directoryResult.recordset.length === 0) {
        throw new AppError("User not found in directory.", 404);
    }

    const branch_code = directoryResult.recordset[0].branch_code;
    const pool = getBranchPool(branch_code);

    if (!pool) throw new AppError(`${branch_code} database pool is not connected.`, 503);

    try {
        const fieldsToUpdate: string[] = [];

        if (name !== undefined) fieldsToUpdate.push("name = @name");
        if (phone !== undefined) fieldsToUpdate.push("phone = @phone");
        if (date_of_birth !== undefined) fieldsToUpdate.push("date_of_birth = @date_of_birth");
        if (gender !== undefined) fieldsToUpdate.push("gender = @gender");

        if (fieldsToUpdate.length > 0) {
            const sqlQuery = `
                UPDATE users
                SET ${fieldsToUpdate.join(", ")}
                WHERE email = @email
            `;

            const req = pool.request().input("email", email);

            if (name !== undefined) req.input("name", name);
            if (phone !== undefined) req.input("phone", phone);
            if (date_of_birth !== undefined) req.input("date_of_birth", date_of_birth);
            if (gender !== undefined) req.input("gender", gender);

            await req.query(sqlQuery);
        }

        const userResult = await pool.request()
            .input("email", email)
            .query(`SELECT id, mongodb_id FROM users WHERE email = @email`);

        if (userResult.recordset.length === 0) {
            throw new AppError("User data not found in Branch SQL.", 404);
        }

        const { id: userIdSql, mongodb_id } = userResult.recordset[0];

        const updateMongo: any = {};
        if (bio !== undefined) updateMongo.bio = bio;
        if (preferences !== undefined) updateMongo.preferences = preferences;

        if (mongodb_id) {
            if (Object.keys(updateMongo).length > 0) {
                await UserProfileModel.findByIdAndUpdate(mongodb_id, updateMongo);
            }
        } else {
            const newMongoId = new mongoose.Types.ObjectId().toString();

            await UserProfileModel.create({
                _id: newMongoId,
                user_id_sql: userIdSql,
                bio: bio ?? "",
                preferences: preferences ?? {},
                last_active: new Date()
            });

            await pool.request()
                .input("email", email)
                .input("mongodb_id", newMongoId)
                .query(`
                    UPDATE users
                    SET mongodb_id = @mongodb_id
                    WHERE email = @email
                `);
        }

    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to update profile", 500, false);
    }
};
export const forgotPasswordSendOTP = async (email: string) => {
    const centralPool = dbPools.central;
    if (!centralPool) throw new AppError("Mất kết nối tới Central Database.", 503); 
    const directoryResult = await centralPool.request()
        .input("email", email)
        .query("SELECT branch_code FROM user_directory WHERE email = @email");
    if (directoryResult.recordset.length === 0) {
        throw new AppError("User not found in directory.", 404);
    }   
    const branch_code = directoryResult.recordset[0].branch_code;
    const pool = getBranchPool(branch_code);
    if (!pool) throw new AppError(`${branch_code} database pool is not connected.`, 503);
    return resendOTP(email, pool);
}
export const forgotPasswordVerifyOTP = async (email: string, otp: string) => {
    const centralPool = dbPools.central;
    if (!centralPool) throw new AppError("Mất kết nối tới Central Database.", 503); 
    const directoryResult = await centralPool.request()
        .input("email", email)
        .query("SELECT branch_code FROM user_directory WHERE email = @email");  
    if (directoryResult.recordset.length === 0) {
        throw new AppError("User not found in directory.", 404);
    }
    const branch_code = directoryResult.recordset[0].branch_code;
    const pool = getBranchPool(branch_code);
    if (!pool) throw new AppError(`${branch_code} database pool is not connected.`, 503);
    const transaction: Transaction = pool.transaction();    
    try {
        await transaction.begin();
        const tranRequest: Request = transaction.request();
        tranRequest.input('email', email);
        tranRequest.input('otp', otp);
        const otpResult = await tranRequest.query(`
            SELECT ID FROM otp_codes 
            WHERE email = @email AND otp = @otp AND expires_at > GETDATE()
        `); 
        if (otpResult.recordset.length === 0) {
            throw new AppError("Invalid or expired OTP.", 400);
        }
        await tranRequest.query('DELETE FROM otp_codes WHERE email = @email');
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        if (err instanceof AppError) throw err; 
        console.error(err);
        throw new AppError("Failed to verify OTP", 500, false);
    }
};
export const forgotPasswordReset = async (email: string, newPassword: string) => {
    const centralPool = dbPools.central;
    if (!centralPool) throw new AppError("Mất kết nối tới Central Database.", 503);
    const directoryResult = await centralPool.request()
        .input("email", email)
        .query("SELECT branch_code FROM user_directory WHERE email = @email");
    if (directoryResult.recordset.length === 0) {
        throw new AppError("User not found in directory.", 404);
    }
    const branch_code = directoryResult.recordset[0].branch_code;
    const pool = getBranchPool(branch_code);


    if (!pool) throw new AppError(`${branch_code} database pool is not connected.`, 503);
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.request()
            .input("email", email)
            .input("password", hashedPassword)
            .query(`
                UPDATE users
                SET password = @password
                WHERE email = @email
            `);
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to reset password", 500, false);
    }   
};
export const changeUserRole = async (email: string, newRole: string) => {
    const centralPool = dbPools.central;
    if (!centralPool) throw new AppError("Mất kết nối tới Central Database.", 503);
    const directoryResult = await centralPool.request()
        .input("email", email)
        .query("SELECT branch_code FROM user_directory WHERE email = @email");
    if (directoryResult.recordset.length === 0) {
        throw new AppError("User not found in directory.", 404);
    }   
    const branch_code = directoryResult.recordset[0].branch_code;
    const pool = getBranchPool(branch_code);
    if (!pool) throw new AppError(`${branch_code} database pool is not connected.`, 503);
    try {
        await pool.request()

            .input("email", email)
            .input("role", newRole)
            .query(`       
                UPDATE users
                SET role = @role
                WHERE email = @email
            `);
    } catch (err) {
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to change user role", 500, false);
    }
};
export const registerEmployee = async (name: string, email: string, password: string, phone: string, date_of_birth: Date, gender: string, address: Address, branch_code: string, bio: any, preferences: any, role: string) => {
    const pool = getBranchPool(branch_code);
    if (!pool) throw new AppError(`${branch_code} database pool is not connected.`, 503);
    const existingUser = await checkExistingUser(pool, email);
    if (existingUser != null) {
        // update role if user exists
        if (existingUser) {
            await pool.request()
                .input("email", email)
                .input("role", role)
                .query(`
                    UPDATE users
                    SET role = @role, is_verified = 1
                    WHERE email = @email
                `);
            return;
        }  
    }
    const branchId = await getBranchId(pool, branch_code);
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserId = uuidv4();
    const newMongoId = new mongoose.Types.ObjectId();
    const transaction = pool.transaction();
    try {
        await transaction.begin();
        const req = transaction.request();
        await insertUserSql(
            req, newUserId, name, email, 1, role,hashedPassword,
            phone, date_of_birth, gender, branchId, newMongoId
        );
        
        await insertAddress(req, newUserId, name, phone, address);
        await createMongoProfile(newUserId, bio, newMongoId, preferences);
        await insertUserDirectory(email, branch_code);
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        await UserProfileModel.findByIdAndDelete(newMongoId);
        if (err instanceof AppError) throw err;
        console.error(err);
        throw new AppError("Failed to register employee", 500, false);
    }   
};