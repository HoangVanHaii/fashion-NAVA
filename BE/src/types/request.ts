import { ConnectionPool } from 'mssql';
import "express-serve-static-core";

export interface UserJwtPayload {
    id: string;
    role: "customer" | "employee" | "admin";
    email: string;
    branch_code: 'HN' | 'DN' | 'HCM' | 'CENTRAL';
    branch_id: string;
}

declare module "express-serve-static-core" {
    interface Request {
        user?: UserJwtPayload;
        dbBranch?: ConnectionPool;
    }
}