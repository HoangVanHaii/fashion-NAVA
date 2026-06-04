import { ref } from 'vue';
import { defineStore } from "pinia";
import { createAccount, getAllUserForAdmin, getTotalUserComparisonForAdmin } from '@/services/admin/user';
import type { CreateAccountPayload } from '@/interfaces/user';
export const useUserAdminStore = defineStore('admin-user', () => {
    const loading = ref<boolean>(false);
    const success = ref<boolean>(false);
    const getAllUserForAdminStore = async () => {
        loading.value = true;
        try {
            const res = await getAllUserForAdmin();
            return res.users;
        } catch (error) {
            console.error(error);
        } finally {
            loading.value = false;
        }
    }
    const createAccountStore = async (account: CreateAccountPayload)=>{
        loading.value = true;
        try {
            const res = await createAccount(account);
            success.value = true;
            return res.users;
        } catch (error) {
            success.value = false;
            console.error(error);
        } finally {
            loading.value = false;
        }
    }

    const getTotalUserComparisonForAdminStore = async (type: string) => {
        loading.value = true;
        try {
            const result = await getTotalUserComparisonForAdmin(type);
            return result.results;
        } catch (err: any) {
            console.error(err);
            return { total: 0, changePercent: 0 }; // Return default if error
        } finally {
            loading.value = false;
        }
    }

        return { getAllUserForAdminStore, createAccountStore, getTotalUserComparisonForAdminStore, success, loading};
})
