import jwt from "jsonwebtoken";

export const accessToken = (id: Number, email: string, role: string, branch_code: string, branch_id: string) => {
    const payload = { id, email, role, branch_code, branch_id };
    return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "1h" });
}

export const refreshToken = (id: Number, email: string, role: string, branch_code: string, branch_id: string) => {
    const payload = { id, email, role, branch_code, branch_id };
    return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "7d" });
}