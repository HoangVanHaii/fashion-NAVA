import api from "./api";
export const loginUser = async (email: string, password: string) => {
    const result = await api.post('/auth/login', {
        email,
        password
    })
    return result.data;
}
export const registerSendOTP = async (name: string, email: string, phone: string, password: string, date_of_birth: string, province: string, district: string, ward: string, street_address: string) => {
    console.log('service');
    const result = await api.post('/auth/register', {
        name,
        email,
        password,
        phone,
        date_of_birth,
        gender: 'other',
        province,
        district,
        ward,
        street_address
    })
    console.log(result.data);
    return result.data;
}

export const verifyRegister = async (email: string, otp: string) => {
    const response = await api.post('/auth/verify-otp', {
        email,
        otp
    })
    return response.data

}
export const resendOTP = async (email: string) => {
    const response = await api.post('/user/resendOTP', { email });
    return response.data;
};

export const forgotPassword = async (email: string) => {
    const response = await api.post('/user/forgotPassword', { email });
    return response.data;
};
export const verifyForgotPassword = async (email: string, otp: string) => {
    const response = await api.post('/user/verifyForgotPassword', {
        email,
        otp
    })
    return response.data

}
export const resetPassword = async (email: string, newPassword: string) => {
    const response = await api.put('/user/resetPassword', {
        email,
        newPassword
    })
    return response.data

}


export const getUserById = async (id: number) => {
    const response = await api.get(`/admin/${id}`);
    return response.data;
}
export const getNameById = async (id: number) => {
    const response = await api.get(`/user/getName/${id}`);
    return response.data;
}
export const getShopByid = async (id: number) => {
    const response = await api.get(`/user/shop/${id}`)
    return response.data;
}
export const getShopIdByUserId = async () => {
    const response = await api.get(`/user/shop/getShopId`)
    return response.data;
}
export const getShopName = async (product_id: number) => {
    const response = await api.get(`/user/shop/nameByProduct/${product_id}`)
    return response.data;
}
export const getProfile = async () => {
    const response = await api.get(`/auth/profile`)
    return response.data;
}
export const updateInfoAPI = async (user: any) => {
    const response = await api.put(`/auth/updateProfile`, {
        name: user.name,
        dateOfBirth: user.date_of_birth,
        phone: user.phone,
        gender: user.gender,
        bio: user.profile.bio,
        preferences: user.profile.preferences
    })
    return response.data;
}
export const changeEmailAPI = async (newEmail: string, password: string) => {
    const response = await api.put('/user/changeEmail', {
        newEmail,
        password
    });
    return response.data;
};

export const verifyChangeEmailAPI = async (newEmail: string, otp: string) => {
    const response = await api.put('/user/verifyChangeEmail', {
        newEmail,
        otp
    });
    return response.data;
};

export const updateAvatarAPI = async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await api.put("/auth/changeAvatar", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });

    return response.data;
};


export const changePassword = async (password: string, newPassword: string) => {
    const response = await api.put('/user/changePassword', {
        password: password,
        newPassword: newPassword
    })
    return response.data
}