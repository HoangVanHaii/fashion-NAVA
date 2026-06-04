import { AppError } from "../utils/appError";
import { mysqlPool } from "../config/database"; 

export const updatePaymentStatus = async (orderId: string | number, status: string): Promise<void> => {
    try {
        const query = `UPDATE payments SET status = ? WHERE order_id = ?`;

        await mysqlPool.query(query, [status, orderId]);
    } catch (error) {
        console.error(error);
        throw new AppError('Failed to update payment status', 500, false);
    }
};