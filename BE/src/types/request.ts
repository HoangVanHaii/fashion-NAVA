import { ConnectionPool } from 'mssql';
import "express-serve-static-core";

export interface UserJwtPayload {
    id: string;
    role: "customer" | "employee" | "admin";
    email: string;
}

declare module "express-serve-static-core" {
    interface Request {
        user?: UserJwtPayload;
    }
}