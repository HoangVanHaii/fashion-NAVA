import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError && err.isOperational) {
        return res.status(err.status).json({
            success: false,
            message: err.message
        });
    }

    return res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
}