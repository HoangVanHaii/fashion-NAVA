import jwt from "jsonwebtoken";

export const accessToken = (id: Number, email: string, role: string) => {
    const payload = { id, email, role };
    return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "1h" });
}

export const refreshToken = (id: Number, email: string, role: string) => {
    const payload = { id, email, role };
    return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "7d" });
}