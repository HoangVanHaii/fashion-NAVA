<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
// import logo from "../assets/logo.jpg"
import { useAuthStore } from '@/stores/auth';
import Header from '@/components/Header.vue';
import VerifyOTP from '../components/VerifyOTP.vue';
import Footer from '@/components/Footer.vue';
import Notification from '@/components/Notification.vue';
// import RePassSenOTP from '../components/RePass/SenOTP.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const showVerify = ref(false);

const name = ref<string>('');
const email = ref<string>('');
const phone = ref<string>('');
const password = ref<string>('');
const dateOfBirth = ref<string>('');

const province = ref<string>('');
const district = ref<string>('');
const ward = ref<string>('');

interface LocationItem {
    code: number;
    name: string;
    districts?: LocationItem[];
    wards?: LocationItem[];
}

const provinceList = ref<LocationItem[]>([]);
const districtList = ref<LocationItem[]>([]);
const wardList = ref<LocationItem[]>([]);

const selectedProvinceCode = ref<number | string>('');
const selectedDistrictCode = ref<number | string>('');
const selectedWardCode = ref<number | string>('');

const isShaking = ref(false);
const showNotification = ref<boolean>(false);
const toastText = ref('');
const showPassword = ref(false);
const showForgot = ref<boolean>(false);

const nameInput = ref<HTMLInputElement | null>(null);
const emailInput = ref<HTMLInputElement | null>(null);
const phoneInput = ref<HTMLInputElement | null>(null);
const passwordInput = ref<HTMLInputElement | null>(null);
const dobInput = ref<HTMLInputElement | null>(null);
const provinceInput = ref<HTMLSelectElement | null>(null);

const isRegisterMode = computed(() => route.name === 'register-sendOTP' || route.path === '/auth/register');

onMounted(async () => {
    showForgot.value = false;
    if (isRegisterMode.value) {
        await fetchProvinces();
    }
})

const fetchProvinces = async () => {
    try {
        const response = await fetch('https://provinces.open-api.vn/api/?depth=1');
        provinceList.value = await response.json();
    } catch (error) {
        console.error("Failed to fetch provinces", error);
    }
};

const fetchDistricts = async (provinceCode: number | string) => {
    try {
        const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
        const data = await response.json();
        districtList.value = data.districts;
    } catch (error) {
        console.error("Failed to fetch districts", error);
    }
};

const fetchWards = async (districtCode: number | string) => {
    try {
        const response = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
        const data = await response.json();
        wardList.value = data.wards;
    } catch (error) {
        console.error("Failed to fetch wards", error);
    }
};

const handleProvinceChange = () => {
    selectedDistrictCode.value = '';
    selectedWardCode.value = '';
    districtList.value = [];
    wardList.value = [];
    district.value = '';
    ward.value = '';

    const p = provinceList.value.find(item => item.code == selectedProvinceCode.value);
    if (p) province.value = p.name;

    if (selectedProvinceCode.value) fetchDistricts(selectedProvinceCode.value);
};

const handleDistrictChange = () => {
    selectedWardCode.value = '';
    wardList.value = [];
    ward.value = '';

    const d = districtList.value.find(item => item.code == selectedDistrictCode.value);
    if (d) district.value = d.name;

    if (selectedDistrictCode.value) fetchWards(selectedDistrictCode.value);
};

const handleWardChange = () => {
    const w = wardList.value.find(item => item.code == selectedWardCode.value);
    if (w) ward.value = w.name;
};


const openRegister = () => {
    email.value = '';
    password.value = '';
    dateOfBirth.value = ''
    phone.value = '';
    province.value = '';
    district.value = '';
    ward.value = '';
    
    selectedProvinceCode.value = '';
    selectedDistrictCode.value = '';
    selectedWardCode.value = '';
    districtList.value = [];
    wardList.value = [];

    fetchProvinces();
    router.push('/auth/register')
}

const openLogin = () => {
    name.value = '';
    password.value = '';
    router.push('/auth/login')
}

const togglePassword = () => {
    showPassword.value = !showPassword.value
}

const triggerShake = () => {
    isShaking.value = true;
    setTimeout(() => {
        isShaking.value = false;
    }, 400);
};

const handleRegister = async () => {
    
    alert(province.value);
    if (!name.value) { auth.error = "Tên không được bỏ trống"; triggerShake(); nameInput.value?.focus(); return; }
    if (!dateOfBirth.value) { auth.error = "Ngày sinh không được bỏ trống"; triggerShake(); dobInput.value?.focus(); return; }
    if (!phone.value) { auth.error = "Số điện thoại không được bỏ trống"; triggerShake(); phoneInput.value?.focus(); return; }
    if (!email.value) { auth.error = "Email không được bỏ trống"; triggerShake(); emailInput.value?.focus(); return; }
    
    if (!province.value) { auth.error = "Vui lòng chọn Tỉnh/Thành phố"; triggerShake(); provinceInput.value?.focus(); return; }
    if (!district.value) { auth.error = "Vui lòng chọn Quận/Huyện"; triggerShake(); return; }
    if (!ward.value) { auth.error = "Vui lòng chọn Phường/Xã"; triggerShake(); return; }
    
    if (!password.value) { auth.error = "Mật khẩu không được bỏ trống"; triggerShake(); passwordInput.value?.focus(); return; }
    
    showNotification.value = false;
    await auth.registerSendOtpStore(name.value, email.value, phone.value, password.value, dateOfBirth.value, province.value, district.value, ward.value, `${ward.value}, ${district.value}, ${province.value}`)
    
    if (auth.error) {
        auth.loading = false;
        triggerShake();
        return;
    }
    if (auth.success) {
        password.value = '';
        showVerify.value = true;
        showNotification.value = true;
    }

    auth.loading = false;
}

const handleLogin = async () => {
    if (!email.value) {
        auth.error = "Email không được bỏ trống";
        triggerShake()
        emailInput.value?.focus();
        return;
    }
    if (!password.value) {
        auth.error = "Mật khẩu không được bỏ trống";
        triggerShake()
        passwordInput.value?.focus();
        return;
    }
    showNotification.value = false;
    toastText.value = '';
    await auth.loginStore(email.value, password.value);
    if (auth.error) {
        triggerShake();
    }
    if (auth.success) {
        showNotification.value = true;
        toastText.value = "Đăng nhập thành công!";

        setTimeout(() => {
            const redirectPath = router.currentRoute.value.query.redirect;
            if (redirectPath) {
                router.push(redirectPath.toString());
            }
            else {
                if (auth.user?.role === 'employee') {
                    router.push({ name: 'home-employee' });
                } else if (auth.user?.role === 'admin') {
                    router.push({ name: 'HomeAdmin' })
                } else {
                    router.push('/');
                }
            }
        }, 1500);
    }
}
</script>

<template>
    <div class="font-sans text-gray-900 bg-[#FAFAFA] min-h-screen flex flex-col">
        <Header />
        <Notification :text="toastText" :isSuccess="showNotification" />
        <RePassSenOTP v-if="showForgot" @close="showForgot = false" />
        <VerifyOTP :email="email" v-if="showVerify" @close="showVerify = false" />

        <div class="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-28">
            <div class="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12">
                
                <!-- Left Side: Slogan & Image -->
                <div class="hidden lg:flex flex-col justify-start items-center text-center space-y-6">
                    <div class="relative w-80 h-80 bg-white rounded-full flex items-center justify-center shadow-2xl shadow-gray-200">
                         <img src="../assets/logoNav.png" alt="Nava Logo" class="w-64 h-64 object-contain drop-shadow-sm transition-transform hover:scale-105 duration-500">
                    </div>
                    <div class="space-y-3">
                        <h1 class="text-5xl font-black tracking-tighter text-black">NAVA FASHION</h1>
                        <h2 class="text-xl font-medium text-gray-500 tracking-[0.2em] uppercase">Thiên đường mua sắm</h2>
                    </div>
                </div>

                <!-- Right Side: Forms -->
                <div class="w-full max-w-md mx-auto">
                    <div class="bg-white border border-gray-100 shadow-2xl rounded-3xl overflow-hidden p-8 sm:p-10 transition-all duration-300 ease-in-out relative">
                        
                        <!-- Toggle Tabs -->
                        <div class="flex items-center justify-center mb-8 select-none border-b border-gray-100 pb-4">
                            <span 
                                @click="openLogin"
                                class="cursor-pointer text-lg font-bold transition-all duration-200 px-6"
                                :class="!isRegisterMode ? 'text-black scale-105' : 'text-gray-400 hover:text-gray-600'"
                            >
                                Đăng nhập
                            </span>
                            <span class="w-px h-6 bg-gray-200"></span>
                            <span 
                                @click="openRegister"
                                class="cursor-pointer text-lg font-bold transition-all duration-200 px-6"
                                :class="isRegisterMode ? 'text-black scale-105' : 'text-gray-400 hover:text-gray-600'"
                            >
                                Đăng ký
                            </span>
                        </div>

                        <!-- Form Content -->
                        <form @submit.prevent="isRegisterMode ? handleRegister() : handleLogin()" class="space-y-4">
                            
                            <!-- Register Specific Fields -->
                            <div v-if="isRegisterMode" class="space-y-4 animate-fade-in">
                                <!-- Name -->
                                <div class="group">
                                    <input 
                                        ref="nameInput" 
                                        v-model="name" 
                                        type="text" 
                                        class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all duration-200 shadow-sm" 
                                        placeholder="Họ và tên"
                                    >
                                </div>
                                
                                <!-- DOB & Phone -->
                                <div class="grid grid-cols-2 gap-4">
                                    <input 
                                        ref="dobInput" 
                                        v-model="dateOfBirth" 
                                        type="date" 
                                        class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-500 placeholder-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all duration-200 shadow-sm focus:text-black" 
                                    >
                                    <input 
                                        ref="phoneInput" 
                                        v-model="phone" 
                                        type="text" 
                                        class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all duration-200 shadow-sm" 
                                        placeholder="Số điện thoại"
                                    >
                                </div>

                                <!-- Email -->
                                <input 
                                    ref="emailInput" 
                                    v-model="email" 
                                    type="text" 
                                    class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all duration-200 shadow-sm" 
                                    placeholder="Địa chỉ Email"
                                >

                                <!-- Address Section -->
                                <div class="space-y-3 pt-2">
                                    <p class="text-xs font-bold text-gray-400 uppercase tracking-wide">Địa chỉ</p>
                                    <div class="grid grid-cols-2 gap-4">
                                        <!-- Province Select -->
                                        <div class="relative">
                                            <select 
                                                ref="provinceInput"
                                                v-model="selectedProvinceCode" 
                                                @change="handleProvinceChange"
                                                class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all duration-200 shadow-sm appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled selected>Tỉnh / Thành phố</option>
                                                <option v-for="p in provinceList" :key="p.code" :value="p.code">{{ p.name }}</option>
                                            </select>
                                            <i class="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                                        </div>

                                        <!-- District Select -->
                                        <div class="relative">
                                            <select 
                                                v-model="selectedDistrictCode" 
                                                @change="handleDistrictChange"
                                                :disabled="!selectedProvinceCode"
                                                class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all duration-200 shadow-sm appearance-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
                                            >
                                                <option value="" disabled selected>Quận / Huyện</option>
                                                <option v-for="d in districtList" :key="d.code" :value="d.code">{{ d.name }}</option>
                                            </select>
                                            <i class="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                                        </div>
                                    </div>
                                    
                                    <!-- Ward Select -->
                                    <div class="relative">
                                        <select 
                                            v-model="selectedWardCode" 
                                            @change="handleWardChange"
                                            :disabled="!selectedDistrictCode"
                                            class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all duration-200 shadow-sm appearance-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
                                        >
                                            <option value="" disabled selected>Phường / Xã</option>
                                            <option v-for="w in wardList" :key="w.code" :value="w.code">{{ w.name }}</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>

                            <!-- Login Fields (Only Email needed if Login mode) -->
                            <div v-else class="space-y-4 animate-fade-in">
                                <input 
                                    ref="emailInput"
                                    v-model="email" 
                                    type="text" 
                                    class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all duration-200 shadow-sm" 
                                    placeholder="Địa chỉ Email"
                                >
                            </div>

                            <!-- Password Field (Shared) -->
                            <div class="relative">
                                <input 
                                    ref="passwordInput"
                                    :type="showPassword ? 'text' : 'password'" 
                                    v-model="password" 
                                    class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all duration-200 shadow-sm pr-10" 
                                    placeholder="Mật khẩu"
                                >
                                <button 
                                    type="button"
                                    @click="togglePassword" 
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors p-1"
                                >
                                    <i class="fa" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                                </button>
                            </div>

                            <!-- Forgot Password Link -->
                            <div v-if="!isRegisterMode" class="flex justify-end animate-fade-in">
                                <span 
                                    @click="showForgot = true" 
                                    class="text-xs font-bold text-gray-500 hover:text-black hover:underline cursor-pointer transition-colors"
                                >
                                    Quên mật khẩu?
                                </span>
                            </div>

                            <!-- Error Message -->
                            <div class="min-h-[24px] flex items-center justify-center">
                                <p 
                                    v-if="auth.error" 
                                    class="text-red-500 text-xs font-bold flex items-center gap-1"
                                    :class="{ 'animate-shake': isShaking }"
                                >
                                    <i class="fa-solid fa-circle-exclamation"></i> {{ auth.error }}
                                </p>
                            </div>

                            <!-- Submit Button -->
                            <button 
                                type="submit"
                                :disabled="auth.loading"
                                class="w-full bg-black text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-lg hover:bg-gray-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-70 disabled:cursor-wait"
                            >
                                {{ auth.loading ? 'ĐANG XỬ LÝ...' : (isRegisterMode ? 'ĐĂNG KÝ' : 'ĐĂNG NHẬP') }}
                            </button>
                        </form>

                        <!-- Divider -->
                        <div class="relative my-8">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-gray-200"></div>
                            </div>
                            <div class="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                                <span class="px-3 bg-white text-gray-400">Hoặc tiếp tục với</span>
                            </div>
                        </div>

                        <!-- Social Buttons -->
                        <div class="grid grid-cols-2 gap-4">
                            <button class="flex items-center justify-center w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group">
                                <i class="fa-brands fa-facebook text-blue-600 text-lg group-hover:scale-110 transition-transform"></i>
                                <span class="ml-2 text-xs font-bold">Facebook</span>
                            </button>
                            <button class="flex items-center justify-center w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group">
                                <i class="fa-brands fa-google text-red-500 text-lg group-hover:scale-110 transition-transform"></i>
                                <span class="ml-2 text-xs font-bold">Google</span>
                            </button>
                        </div>

                        <!-- Footer / Rules -->
                        <div v-if="isRegisterMode" class="mt-8 text-center text-[10px] text-gray-400 animate-fade-in leading-relaxed">
                            <p>Bằng việc đăng kí, bạn đã đồng ý với Nava về</p>
                            <div class="mt-1 font-bold text-gray-600">
                                <a href="#" class="hover:underline hover:text-black">Điều khoản dịch vụ</a>
                                <span class="mx-1">&</span>
                                <a href="#" class="hover:underline hover:text-black">Chính sách bảo mật</a>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
    <Footer />
</template>

<style scoped>
/* Animations only - Logic styling moved to template classes */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}

.animate-shake {
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
}
</style>