import nodemailer from "nodemailer";
import { AppError } from "./appError";
export const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
export const sendOtp = async (email: string, otp: string): Promise<boolean> => {
    try {
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Mã OTP xác thực",
            text: `Mã OTP của bạn là: ${otp}. Mã này sẽ hết hạn sau 5 phút.`,
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (err: any) {
        throw new AppError("Failed to sendOtp", 500, false);
    }
};