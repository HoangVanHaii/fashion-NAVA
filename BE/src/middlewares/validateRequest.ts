import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const cleanedErrors = errors.array().map((err: any) => ({
            type: err.type,
            msg: err.msg,
            path: err.param, // err.param có trong runtime
            value: err.value?.filename || err.value?.toString?.() || undefined
        }));
        return res.status(400).json({ errors: cleanedErrors });
    }

    next();
};
