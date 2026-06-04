<script setup lang="ts">
import { ref, nextTick, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
// import iconLock from '../assets/iconLock.jpg'
// import Notification from "./Notification.vue";
// import RePassConfirm from "./RePassConfirm.vue";

const props = defineProps(['email']);
const emit = defineEmits(['close']);
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const err = ref<string>('');
const otpLength = 6;
const otp = ref<string[]>(Array(otpLength).fill(""));
const resending = ref<boolean>(false);
const inputs = ref<(HTMLInputElement | null)[]>([]);

const countdown = ref<number>(0);
let timer: any = null;


const showNotification = ref<boolean>(false);
const toastText = ref('');
const handleInput = (index: number) => {
    err.value = "";
    const current = otp.value[index];
    if (current && index < otpLength - 1) {
        nextTick(() => inputs.value[index + 1]?.focus());
    }
};
onMounted(() => {
    if (inputs) {
        nextTick(() => inputs.value?.[0]?.focus());
    }
})
const handleBackspace = (event: KeyboardEvent, index: number) => {
    if (event.key === "Backspace" && !otp.value[index] && index > 0) {
        nextTick(() => inputs.value[index - 1]?.focus());
    }
};
const showRepass = ref<boolean>(false);
const showMe = ref(true);
const handleSubmit = async () => {

    const otpCode = otp.value.join("");
    auth.loading = true;
    if(otpCode.length != 6){
        err.value = "Vui lòng mã có 6 chữ số";
        auth.loading = false;
        return;
    }
    const email: string = props.email
    if (route.path == '/auth/login') {
        await auth.verifyForgotPasswordStore(props.email, otpCode)
         if(!auth.error){
            showNotification.value = true;
            toastText.value = "✅ Xác thực thành công!";
            setTimeout(() => {
                showRepass.value = true;
                showMe.value = false;
            }, 1200);  
            
        }
        if(auth.error){
            err.value = auth.error;
        }
    }
    if (route.path == '/auth/register') {
        await auth.verifyRegisterStore(email, otpCode)
        if(auth.success){
            showNotification.value = true;
            toastText.value = "✅ Xác thực thành công!";
            setTimeout(() => {
                emit('close');
                router.push('/auth/login')
            }, 1200);  
            
        }
        if(auth.error){
            err.value = auth.error;
        }
    }
    auth.loading = false;
}
const handleResendOTP = async () => {
    if (resending.value || countdown.value > 0) return;

    err.value = "";
    resending.value = true;
    await auth.resendOTPStore(props.email);

    otp.value = Array(otpLength).fill("");
    nextTick(() => inputs.value[0]?.focus());

    countdown.value = 120;
    timer = setInterval(() => {
        countdown.value--;
        if (countdown.value <= 0) {
            clearInterval(timer);
        }
    }, 1000);

    setTimeout(() => {
        resending.value = false;
    }, 1000);
};

const handleClose = () => {
    emit('close');
}
</script>

<template>
    <Notification :text="toastText" :isSuccess="showNotification" />
    <RePassConfirm :email="props.email" v-if="showRepass" @close="showRepass = false"/>
    
    <!-- Modern Overlay -->
    <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click="handleClose" v-if="showMe">
        <!-- Modern Card -->
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center overflow-hidden animate-scale-in border border-gray-100" @click.stop>
            
            <!-- Decoration Background -->
            <div class="absolute top-0 left-0 right-0 h-1.5 bg-black"></div>

            <!-- Icon -->
            <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
                <i class="fa-solid fa-shield-halved text-3xl text-black"></i>
            </div>
            
            <h2 class="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Xác thực OTP</h2>
            
            <p class="text-sm text-gray-500 mb-8 leading-relaxed px-4">
                Mã xác thực đã được gửi đến email <br>
                <span class="font-bold text-black">{{ props.email }}</span>
                <span class="block text-xs text-gray-400 mt-1">(Mã có hiệu lực trong 120s)</span>
            </p>

            <!-- OTP Inputs -->
            <div class="flex justify-center gap-2 mb-8">
                <input
                    v-for="(digit, index) in otp"
                    :key="index"
                    type="text"
                    maxlength="1"
                    class="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-black focus:ring-0 outline-none transition-all bg-white text-black"
                    v-model="otp[index]"
                    ref="inputs"
                    @input="handleInput(index)"
                    @keydown="handleBackspace($event, index)"
                />
            </div>

            <!-- Error Message -->
            <div v-if="err" class="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-bold flex items-center justify-center gap-2">
                <i class="fa-solid fa-circle-exclamation"></i>
                {{ err }}
            </div>

            <!-- Verify Button -->
            <button
                class="w-full py-3.5 bg-black text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-gray-800 transition-all shadow-lg shadow-black/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                @click="handleSubmit"
                :disabled="auth.loading"
            >
                <i v-if="auth.loading" class="fa-solid fa-spinner animate-spin"></i>
                <span>{{ auth.loading ? 'Đang xử lý...' : 'Tiếp tục' }}</span>
            </button>

            <!-- Resend Link -->
            <p class="text-xs text-gray-500 mt-6">
                Chưa nhận được mã? 
                <a 
                    href="#" 
                    @click.prevent="handleResendOTP"
                    class="font-bold text-black hover:underline ml-1 transition-colors"
                    :class="{ 'text-gray-400 cursor-not-allowed no-underline': resending || countdown > 0 }"
                >
                    <template v-if="resending">Đang gửi...</template>
                    <template v-else-if="countdown > 0">Gửi lại sau {{ countdown }}s</template>
                    <template v-else>Gửi lại mã</template>
                </a>
            </p>
        </div>
    </div>
</template>

<style scoped>
.animate-scale-in {
    animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes scaleIn {
    from { 
        opacity: 0; 
        transform: scale(0.95) translateY(10px); 
    }
    to { 
        opacity: 1; 
        transform: scale(1) translateY(0); 
    }
}

/* Remove number input spinners if type changed to number */
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
</style>