import { VerifyReturnUrl, ReturnQueryFromVNPay } from 'vnpay';
import { vnpay, buildPaymentUrl } from '../utils/vnpay';
import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment';
import { getBranchPool } from '../config/database';

export const checkPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vnpParams = req.query as unknown as ReturnQueryFromVNPay;

        const verify: VerifyReturnUrl = vnpay.verifyReturnUrl(vnpParams);
        if (!verify.isVerified) {
            // return res.status(400).json({ message: "invalid_signarute" });
            return res.redirect('http://localhost:5173/orderFailed');
        }

        const txnRef = verify.vnp_TxnRef;

        const [orderId, branch_code] = txnRef.split(' ');
        const responseCode = verify.vnp_ResponseCode;
        const dbBranch = getBranchPool(branch_code)
        if (responseCode === '00') {
            await paymentService.updatePaymentStatus(orderId, "success", dbBranch!);

            // return res.status(201).json({ message: "payment success" });
            return res.redirect(`http://localhost:5173/orderSuccess`);
        } else {
            await paymentService.updatePaymentStatus(orderId, "failed", req.dbBranch!);
            // return res.status(400).json({ message: "payment failed" });
            return res.redirect(`http://localhost:5173/orderFailed`);
        }

    } catch (error) {
        console.error("Error checking payment:", error);
        // return res.status(400).json({ message: "orderfailed" });
        return res.redirect('http://localhost:5173/orderFailed');
    }
};
export const createPaymentQR = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { order_id, amount } = req.body;

        // const paymentUrl = await buildPaymentUrl(order_id, amount);
        // return res.json({ paymentUrl });
    } catch (error) {
        console.error('Error creating payment:', error);
        next(error);
    }
};