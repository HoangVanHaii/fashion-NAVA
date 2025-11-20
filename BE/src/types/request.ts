// src/types/user.types.ts

import { ConnectionPool } from 'mssql';
import "express-serve-static-core";

export interface UserJwtPayload {
    id: number;
    role: "customer" | "employee" | "admin";
    email: string;
    branch_code: 'HN' | 'DN' | 'HCM' | 'CENTRAL';
}

declare module "express-serve-static-core" {
  interface Request {
    user?: UserJwtPayload;
    dbBranch?: ConnectionPool;
  }
}