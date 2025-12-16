import { ConnectionPool } from "mssql";
import { AppError } from "../utils/appError"
export const updatePaymentStatus = async (orderId: string, status: string, dbBranch: ConnectionPool): Promise<void> => {
    try {
        const pool = dbBranch;
        const query = `UPDATE payments SET status = @status WHERE order_id = '${orderId.toUpperCase()}'`;
        await pool.request()
            .input('status', status)
            .query(query);
    } catch (error) {
        console.log(error);
        throw new AppError('Failed to update payment status', 500, false);
    }
}
