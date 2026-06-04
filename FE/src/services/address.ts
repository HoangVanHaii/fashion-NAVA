import type { Address } from "../interfaces/address";
import api from "./api";
export const getAddressesByUser = async() =>{
    const response = await api.get('address/getAddressesByUser');
    return response.data;
}

 export const updateAddress = async (address: Address) =>{
    const response = await api.put(`address/${address.id}`,{
        name: address.name,
        phone: address.phone,
        province: address.province,
        district: address.district,
        ward: address.ward,
        street_address: address.street_address,
        is_default:address.is_default
    })
    return response.data
 }

export const addAddress = async (address: Address) => {
    const response = await api.post('address/',{
        name: address.name,
        phone: address.phone,
        province: address.province,
        district: address.district,
        ward: address.ward,
        street_address: address.street_address,
        is_default: address.is_default
    })
    return response.data
}

export const deleteAddress = async (addressId: number) => {
    const response = await api.delete(`address/${addressId}`)
    return response.data
}

