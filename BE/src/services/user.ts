import { ConnectionPool, Request, Transaction } from 'mssql';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { dbPools } from '../config/databasel';
import { sendOtp, generateOTP } from '../utils/sendOTP';
import { UserProfileModel } from '../models/user.mongo';

const OTP_EXPIRATION_MINUTES = 10;

const resendOTP = async (email: string, pool: ConnectionPool) => {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

    const request = pool.request();
    request.input('email', email);
    request.input('otp', otp);
    request.input('expiresAt', expiresAt);

    await request.query('DELETE FROM otp_codes WHERE email = @email');
    await request.query('INSERT INTO otp_codes (email, otp, expires_at) VALUES (@email, @otp, @expiresAt)');

    await sendOtp(email, otp);
};

export const registerUser = async (name: string, email: string, password: string, phone: string, date_of_birth: Date, gender: string) => {
    const pool: ConnectionPool | null = dbPools.central;
    if (!pool) throw new Error('Central database pool is not connected.');

    const userCheckRequest = pool.request();
    userCheckRequest.input('email', email);
    const userResult = await userCheckRequest.query('SELECT ID, is_verified FROM users WHERE email = @email');

    if (userResult.recordset.length > 0) {
        if (userResult.recordset[0].is_verified) {
            throw new Error('Email already in use.');
        }
        return resendOTP(email, pool);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newSqlUserId = uuidv4(); 

    const transaction: Transaction = pool.transaction();
    let mongoProfile = null;

    try {
        await transaction.begin();
        const tranRequest: Request = transaction.request();

        tranRequest.input('id', newSqlUserId);
        tranRequest.input('name', name);
        tranRequest.input('email', email);
        tranRequest.input('password', hashedPassword);
        tranRequest.input('phone', phone);
        tranRequest.input('branch_id', '73F306BD-316A-462F-B646-6DF61FE5CAA0');
        tranRequest.input('date_of_birth', date_of_birth);
        tranRequest.input('gender', gender);

        await tranRequest.query(`
            INSERT INTO users (ID, name, email, password, phone, date_of_birth, gender, avatar, is_verified, status, role, mongodb_id, branch_id)
            VALUES (@id, @name, @email, @password, @phone, @date_of_birth, @gender, 'default-avatar.png', 0, 'active', 'customer', NULL, @branch_id)
        `);

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);
        tranRequest.input('otp', otp);
        tranRequest.input('expiresAt', expiresAt);

        await tranRequest.query('DELETE FROM otp_codes WHERE email = @email');
        await tranRequest.query('INSERT INTO otp_codes (email, otp, expires_at) VALUES (@email, @otp, @expiresAt)');


        try {
            mongoProfile = await UserProfileModel.create({
                user_id_sql: newSqlUserId,
                bio: 'hoangvan',
                last_active: new Date()
            });
        } catch (mongoErr) {
            throw new Error('Failed to create MongoDB profile: ' + (mongoErr as Error).message);
        }


        const mongoIdString = mongoProfile._id.toString();
        tranRequest.input('mongoId', mongoIdString);

        await tranRequest.query(`
            UPDATE users 
            SET mongodb_id = @mongoId 
            WHERE ID = @id
        `);


        await transaction.commit();

        await sendOtp(email, otp);

    } catch (err) {
        await transaction.rollback();

        if (mongoProfile && mongoProfile._id) {
            await UserProfileModel.findByIdAndDelete(mongoProfile._id);
            console.log('♻️  Cleaned up MongoDB profile due to transaction failure.');
        }

        throw err;
    }
};

// Hàm verifyOTP giữ nguyên, không thay đổi logic
export const verifyOTP = async (email: string, otp: string) => {
    const pool: ConnectionPool | null = dbPools.central;
    if (!pool) throw new Error('Central database pool is not connected.');

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
            throw new Error('Invalid or expired OTP.');
        }

        const updateUserResult = await tranRequest.query(`
            UPDATE users SET is_verified = 1 WHERE email = @email
        `);

        if (updateUserResult.rowsAffected[0] === 0) {
            throw new Error('User not found for this email.');
        }

        await tranRequest.query('DELETE FROM otp_codes WHERE email = @email');
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};