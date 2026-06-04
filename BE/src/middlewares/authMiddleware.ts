import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserJwtPayload } from "../types/request";
import { AppError } from "../utils/appError";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('CRITICAL: JWT_SECRET is not defined in .env file.');
        return next(new AppError('Internal server configuration error', 500));
    }

    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new AppError("Token is required", 401));
    }

    const token = authHeader.split(" ")[1];

    try {
        const decodedPayload = jwt.verify(token, secret) as UserJwtPayload;

        if (!decodedPayload.role) {
            return next(new AppError("Invalid token payload: missing 'role'", 401));
        }

        req.user = decodedPayload;
        next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            return next(new AppError("Token expired", 401));
        }
        return next(new AppError("Invalid token", 401));
    }
};

export const isEmployee = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== "employee") {
        return next(new AppError("Forbidden: employees only", 403));
    }
    next();
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== "admin") {
        return next(new AppError("Forbidden: admins only", 403));
    }
    next();
};

export const adminOrEmployee = (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (role !== "admin" && role !== "employee") {
        return next(new AppError("Forbidden: admins or employees only", 403));
    }
    next();
};