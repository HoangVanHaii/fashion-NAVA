import { defineStore } from "pinia";
import { ref } from "vue";
import { forgotPassword, getNameById, getProfile, getShopIdByUserId, registerSendOTP, resetPassword, updateAvatarAPI, updateInfoAPI, verifyForgotPassword } from "../services/user";
import { verifyRegister, loginUser, getUserById, getShopByid, getShopName, resendOTP } from "../services/user";
import type { User } from "@/interfaces/user";
export const errorMap: Record<string, string> = {
    // Name
    "Name is required": "Vui lòng nhập họ tên",
    "Name must be a string": "Tên phải là chuỗi ký tự",
    "Name must be at most 100 characters": "Tên không được vượt quá 100 ký tự",

    // Email
    "Email is required": "Vui lòng nhập email",
    "Email must be valid": "Email không hợp lệ",

    // Password
    "Password is required": "Vui lòng nhập mật khẩu",
    "Password must be a string": "Mật khẩu phải là dạng chuỗi",
    "Password must be at least 6 characters": "Mật khẩu phải có ít nhất 6 ký tự",

    // Phone
    "Phone is required": "Vui lòng nhập số điện thoại",
    "Phone must be a valid phone number": "Số điện thoại không hợp lệ",

    // Date of Birth
    "date_of_birth is required": "Vui lòng nhập ngày sinh",
    "date_of_birth must be a valid ISO8601 date": "Ngày sinh không đúng định dạng",

    // Gender
    "Gender is required": "Vui lòng chọn giới tính",
    "Gender must be one of: male, female, other": "Giới tính không hợp lệ",

    // Province
    "Province is required": "Vui lòng nhập tỉnh/thành",
    "Province must be a string": "Tỉnh/thành phải là chuỗi",
    "Province must be at most 100 characters": "Tỉnh/thành không vượt quá 100 ký tự",

    // District
    "District is required": "Vui lòng nhập quận/huyện",
    "District must be a string": "Quận/huyện phải là chuỗi",
    "District must be at most 100 characters": "Quận/huyện không vượt quá 100 ký tự",

    // Ward
    "Ward is required": "Vui lòng nhập phường/xã",
    "Ward must be a string": "Phường/xã phải là chuỗi",
    "Ward must be at most 100 characters": "Phường/xã không vượt quá 100 ký tự",

    // Street address
    "Street address is required": "Vui lòng nhập địa chỉ",
    "Street address must be a string": "Địa chỉ phải là chuỗi",
    "Street address must be at most 200 characters": "Địa chỉ không vượt quá 200 ký tự",

    // Bio (optional)
    "Bio must be a string": "Giới thiệu phải là chuỗi ký tự",
    "Bio must be at most 500 characters": "Giới thiệu không được vượt quá 500 ký tự",
};


export const useAuthStore = defineStore('auth', () => {
    const loading = ref<boolean>(false)
    const error = ref<string | null>(null)
    const success = ref<string | null>(null)
    const OTP = ref<string | null>(null);
    const isLogin = ref<boolean>(!!localStorage.getItem('accessToken'));
    const user = ref<User | null>(null);

    const registerSendOtpStore = async (name: string, email: string, phone: string, password: string, dateOfBirth: string, province: string, district: string, ward: string, street_address: string) => {
        // console.log(1);
        try {
            loading.value = true;
            error.value = null;
            success.value = null;
            // console.log('store')
            const otp = await registerSendOTP(name, email, phone, password, dateOfBirth, province, district, ward, street_address);
            success.value = `Vui lòng xác nhận OTP đã gửi đến ${email}`;
            OTP.value = otp;

        } catch (err: any) {
            const status = err.response?.status;
            const errors = err.response?.data?.errors;
            if (status === 409) {
                error.value = `Email ${email} đã tồn tại`;
            } else if (status === 400 && Array.isArray(errors)) {
                const messages = errors.map((e: any) => e.msg);
                error.value = errorMap[messages[0]] || "Lỗi máy chủ";
            } else if (status === 409 && Array.isArray(errors)) {
                error.value = "Email đã tồn tại"
            }
            else {
                error.value = 'Lỗi máy chủ';
            }

            success.value = `Không thể gửi OTP đến email ${email}`;
        } finally {
            loading.value = false;
        }
    };

    const verifyRegisterStore = async (email: string, otp: string) => {
        try {
            loading.value = true
            error.value = null
            success.value = null

            await verifyRegister(email, otp);

            success.value = `Đăng ký thành công`
        } catch (err: any) {
            console.log(err);
            const status = err.response?.status;
            if (status == 400) {
                error.value = `OTP không hợp lệ!`;
            } else {
                error.value = 'Lỗi máy chủ'
            }
        } finally {
            loading.value = false;
        }
    }

    const loginStore = async (email: string, password: string) => {
        loading.value = true;
        error.value = null;
        success.value = null;
        isLogin.value = false;
        user.value = null;

        try {
            const data = await loginUser(email, password);

            user.value = data.data.user;
            localStorage.setItem("accessToken", data.data.accessToken);
            localStorage.setItem("refreshToken", data.data.refreshToken);
            localStorage.setItem("user_id", data.data.user.id);
            localStorage.setItem("avatar", data.data.user.avatar)
            isLogin.value = true;

            success.value = "Đăng nhập thành công";
        } catch (err: any) {
            const status = err.response?.status || 500;
            switch (status) {
                case 400:
                    error.value = "Dữ liệu không hợp lệ!";
                    break;
                case 404:
                    error.value = "Email không tồn tại!";
                    break;
                case 403:
                    error.value = "Tài khoản đã bị khóa!";
                    break;
                case 401:
                    error.value = "Sai mật khẩu!"
                    break;
                default:
                    error.value = "Lỗi máy chủ!"
                    break;
            }
            console.log(err)
        }
        finally {
            loading.value = false;
        }
    };
    const getShopNameStore = async (product_id: number) => {
        try {
            const shopName = await getShopName(product_id);
            console.log(shopName.data.shoName);
            return shopName.data.shopName;
        } catch (error) {
            console.log(`Failed to fetch product shop name`);
        }
    }
    const getUserByIdStore = async (id: number) => {
        try {
            const data = await getUserById(id);
            return data;
        } catch (error) {
            console.error("Failed to get user by ID:", error);
        }
    }
    const getProfileStore = async () => {
        try {
            const data = await getProfile();
            user.value = data.data;
            return data.data;
        } catch (error) {
            console.error("Failed to get user by ID:", error);
        }
    }
    const getNameByIdStore = async (id: number) => {
        try {
            const data = await getNameById(id);
            return data.data.name;
        } catch (error) {
            console.error("Failed to get user by ID:", error);
        }
    }
    const getShopByidStore = async (id: number) => {
        try {
            const data = await getShopByid(id);
            return data.data;
        } catch (error) {
            console.error("Failed to get user by ID:", error);
        }
    }
    const resendOTPStore = async (email: string) => {
        loading.value = true;
        try {
            await resendOTP(email);
        } catch (error) {
            console.log(error);
        } finally {
            loading.value = false;
        }
    }
    const forgotPasswordStore = async (email: string) => {
        loading.value = true;
        error.value = null;
        try {
            await forgotPassword(email);
        } catch (err: any) {
            error.value = err || 'Lỗi máy chủ'
            if (err.status == 404) {
                error.value = '❌ Không tìm thấy người dùng'
            }
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    const verifyForgotPasswordStore = async (email: string, otp: string) => {
        loading.value = true;
        error.value = null;
        try {
            await verifyForgotPassword(email, otp);
        } catch (err: any) {
            err.valid = 'Lỗi';
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    const resetPasswordStore = async (email: string, newPassword: string) => {
        loading.value = true;
        error.value = null;
        try {
            await resetPassword(email, newPassword);
        } catch (err: any) {
            console.log(err);
            error.value = err;
        } finally {
            loading.value = false;
        }
    }
    const getShopIdByUserIdStore = async () => {
        try {
            const shop_id = await getShopIdByUserId();
            return shop_id.data;
        } catch (error) {
            console.log(error);
        }
    }
    const updateAvatarStore = async (file: File) => {
        try {
            loading.value = true
            const res = await updateAvatarAPI(file)
            user.value!.avatar = res.avatarUrl
            localStorage.setItem('avatar', res.avatarUrl)
            return res.avatarUrl
        } catch (error) {
            console.log(error);
            loading.value = false;
        } finally {
            loading.value = false
        }
    }
    const updateInfoStore = async (user: any) => {
        try {
            loading.value = true
            const res = await updateInfoAPI(user)
            await getProfile();
        } catch (error) {
            console.log(error);
            loading.value = false;
        } finally {
            loading.value = false
        }
    }
    return {
        OTP,
        loading,
        user,
        error,
        success,
        isLogin,
        getProfileStore,
        registerSendOtpStore,
        verifyRegisterStore,
        loginStore,
        getUserByIdStore,
        getShopByidStore,
        getShopNameStore,
        getNameByIdStore,
        resendOTPStore,
        forgotPasswordStore,
        verifyForgotPasswordStore,
        resetPasswordStore,
        getShopIdByUserIdStore,
        updateAvatarStore,
        updateInfoStore
    }
})
