import type { CreateAccountPayload } from "@/interfaces/user";
import api from ".././api";

export const registerEmployee = async (formData: any) => {
    const response = await api.post('/admin/user/register-employee', formData);
    return response.data;
};

export const changeRole = async (email: string, role: string) => {
    const response = await api.put('/admin/user/change-role', {
        email: email,
        role: role
    });
    return response.data;
};


export const getAllUserForAdmin = async () => {
    const response = await api.get('/admin/user');
    return response.data;
};
export const createAccount = async (account: CreateAccountPayload) => {
    const response = await api.post('/admin/create-user', {
        ...account
    });
    return response.data;
};


export const getTotalUserComparisonForAdmin = async (type: string) => {
    const response = await api.get(`/admin/user/total/daily-comparison/${type}`);
    return response.data;
};