import mysql, { Pool } from 'mysql2/promise';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const env = process.env;

// Khởi tạo Pool kết nối cho MySQL
export const mysqlPool: Pool = mysql.createPool({
    host: env.MYSQL_HOST as string,
    user: env.MYSQL_USER as string,
    password: env.MYSQL_PASSWORD as string,
    database: env.MYSQL_DATABASE as string,
    port: parseInt(env.MYSQL_PORT as string),
    waitForConnections: true,
    connectionLimit: 10,     
    queueLimit: 0
});

export const connectDatabases = async (): Promise<void> => {
    console.log('Connecting databases...');
    try {
        if (!env.MONGO_URL) {
            throw new Error('MONGO_URL is not defined in environment variables');
        }
        await mongoose.connect(env.MONGO_URL);
        console.log('MongoDB connected.');

        const connection = await mysqlPool.getConnection();
        console.log('MySQL connected.');
        connection.release(); 
    } catch (err) {
        console.error('❌ FATAL DB CONNECTION ERROR:', err);
        process.exit(1); 
    }
};