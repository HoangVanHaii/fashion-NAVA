import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
});

// 🪶 Thêm accessToken vào mỗi request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
};
const refreshToken = localStorage.getItem("refreshToken") || '';
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (refreshToken.length > 10 && error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh((token: string) => {
                        originalRequest.headers.Authorization = "Bearer " + token;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {

                const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/user/refreshToken`, {
                    refreshToken,
                });
                localStorage.setItem("accessToken", data.accessToken);
                api.defaults.headers.Authorization = "Bearer " + data.accessToken;
                onRefreshed(data.accessToken);
                isRefreshing = false;
                return api(originalRequest);
            } catch (err) {
                isRefreshing = false;
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
