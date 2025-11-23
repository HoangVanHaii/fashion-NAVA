// src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserJwtPayload } from "../types/request";
import { AppError } from "../utils/appError";
// Đã sửa lỗi gõ nhầm 'databasel' -> 'database'
import { dbPools, getBranchPool } from '../config/database'; 

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // --- PHẦN 1: XÁC THỰC TOKEN ---
    
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('CRITICAL: JWT_SECRET is not defined in .env file.');
        throw new AppError('Internal server configuration error', 500);
    }

    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError("Token is required", 401);
    }

    const token = authHeader.split(" ")[1];
    let decodedPayload: UserJwtPayload;

    try {
        decodedPayload = jwt.verify(token, secret) as UserJwtPayload;
        
        if (!decodedPayload.branch_code || !decodedPayload.role) {
            throw new AppError("Invalid token payload: missing 'branch_code' or 'role'", 401);
        }

        req.user = decodedPayload;

    } catch (err: any) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new AppError("Token expired", 401);
        }
        throw new AppError("Invalid token", 401);
    }

    // --- PHẦN 2: GÁN KẾT NỐI CSDL ---

    // const branchCode = 'DN'
    const branchCode = decodedPayload.branch_code;

    // 2. Gán kết nối Chi nhánh
    const branchPool = getBranchPool(branchCode);
    
    if (!branchPool) {
        // Nếu token có branch_code không hợp lệ (ví dụ 'CENTRAL' hoặc 'ABC')
        console.warn(`[Auth Middleware] Connection failed for invalid branch: ${branchCode}.`);
        // THROW
        throw new AppError(
            `Service for region ${branchCode} is currently unavailable or invalid.`, 
            503
        );
    }

    req.dbBranch = branchPool;
    
    next();
};

/**
 * Middleware kiểm tra role 'employee' (Async)
 */
export const isemployee = async (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    
    if (role !== "employee") {
        // THROW
        throw new AppError('Forbidden: employees only', 403);
    }
    next();
}

/**
 * Middleware kiểm tra role 'admin' hoặc 'employee' (Async)
 */
export const adminOremployee = async (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    
    if (role !== "admin" && role !== "employee") {
        // THROW
        throw new AppError('Forbidden: Admins or employees only', 403);
    }
    next();
}