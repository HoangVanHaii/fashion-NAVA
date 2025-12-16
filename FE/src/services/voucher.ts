import api from './api';
import type { Voucher, VoucherAdmin } from '../interfaces/voucher';

export const getUserVouchers = async () => {
    const res = await api.get('/voucher/user/'); 
    return res.data; 
};

export const claimVoucherByCode = async (code: string) => {
    const res = await api.post('/voucher/user/claim/code', { code });
    return res.data; 
};

export const getVoucherByIdAPI = async (id:number)=>{
    const res = await api.get(`/voucher/getVoucherById/${id}`)
    const voucher = res.data;
    return voucher;
}
export const getVoucherByCodeAPI = async (code:string) =>{
    const res = await api.get(`/voucher/getVoucherByCode/${code}`)
    const voucher = res.data;
    return voucher;
}
export const getTop4Voucher = async (top: number, scope: string) => {
    const result = await api.get(`/voucher/topVoucher?top=${top}&scope=${scope}`);
    return result.data;
}
export const getAllVoucher = async () => {
    const result = await api.get(`/voucher/`);
    return result.data;
}
export const getVoucherByCode = async (code: string) => {
    const result = await api.get(`/voucher/getVoucherByCode/${code}`)
    return result.data;

}
export const getVoucherById = async (id: number) => {
    const result = await api.get(`/voucher/getVoucherById/:${id}`)
    return result.data;
}
export const getAllVoucherByShopId = async (id: number) => {
    const result = await api.get(`voucher/${id}`)
    return result.data;
}
export const createVoucher = async (voucher: VoucherAdmin) => {
    const result = await api.post(`/voucher/createVoucher`, {
        code: voucher.code,
        description: voucher.description,
        
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        
        min_order_value: voucher.min_order_value,
        max_discount: voucher.max_discount,
        
        // Frontend dùng 'quantity', nhưng Backend đợi 'usage_limit' -> Phải đổi tên ở đây
        usage_limit: voucher.quantity, 
        
        start_date: voucher.start_date,
        end_date: voucher.end_date
    })
    return result.data;
}
export const updateVoucher = async (voucher: VoucherAdmin) => {
    const result = await api.put(`/voucher/updateVoucher/${voucher.ID}`, {
        code: voucher.code,
        description: voucher.description,
        
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        
        min_order_value: voucher.min_order_value,
        max_discount: voucher.max_discount,
        
        usage_limit: voucher.quantity, 
        
        start_date: voucher.start_date,
        end_date: voucher.end_date
    })
    return result.data;
}
