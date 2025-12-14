import api from './api';
import type { Voucher } from '../interfaces/voucher';

export const getUserVouchers = async () => {
    const res = await api.get('/voucher/user/'); 
    return res.data; 
};

export const claimVoucherByCode = async (code: string) => {
    const res = await api.post('/voucher/user/claim/code', { code });
    return res.data; 
};