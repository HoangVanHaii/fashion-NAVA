import { ProductCode, VnpLocale, dateFormat, VNPay, HashAlgorithm, ignoreLogger } from 'vnpay';

export const vnpay = new VNPay({
    tmnCode: process.env.VNP_TMNCODE!,
    secureSecret: process.env.VNP_HASHSECRET!,
    vnpayHost: 'https://sandbox.vnpayment.vn',
    testMode: true,
    hashAlgorithm: HashAlgorithm.SHA512,
    loggerFn: ignoreLogger,
});
export const buildPaymentUrl = async (order_id: string, amount: number): Promise<string> => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await vnpay.buildPaymentUrl({
        vnp_Amount: amount,
        vnp_IpAddr: '127.0.0.1',
        vnp_TxnRef: order_id,
        vnp_OrderInfo: `Thanhtoandonhang${order_id}`,
        vnp_OrderType: ProductCode.Other,
        vnp_ReturnUrl: 'http://localhost:3000/api/payments/check-payment-vnpay',
        vnp_Locale: VnpLocale.VN,
        vnp_CreateDate: dateFormat(new Date()),
        vnp_ExpireDate: dateFormat(tomorrow),
    });
};
