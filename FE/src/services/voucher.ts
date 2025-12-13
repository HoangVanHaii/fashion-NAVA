import api from "./api";

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
