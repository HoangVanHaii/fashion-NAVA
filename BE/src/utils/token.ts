import jwt from "jsonwebtoken";

export const accessToken = (id: Number, email: string, role: string, branch_code: string) => {
    const payload = { id, email, role, branch_code };
    return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "1h" });
}

export const refreshToken = (id: Number, email: string, role: string, branch_code: string) => {
    const payload = { id, email, role, branch_code };
    return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "7d" });
}