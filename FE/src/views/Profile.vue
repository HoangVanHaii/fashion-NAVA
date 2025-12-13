<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import SideBarProfile from "@/components/SideBarProfile.vue";
import Header from "../components/Header.vue";
import Loading from "../components/Loading.vue";
// import Notification from "../components/Notification.vue";
import type { User } from "../interfaces/user";
import Footer from "@/components/Footer.vue";
import { useAuthStore } from "@/stores/auth";

const userStore = useAuthStore();
const showNavbar = ref(true);

const avatarUrl = computed(() => {
  const avatar = userStore.user?.avatar;
  if (!avatar) return "";
  return avatar.startsWith("http") ? avatar : `${import.meta.env.VITE_API_URL}${avatar}`;
});

// --- State cho phần mở rộng (Bio & Socials) ---
const showBioInput = ref(false);
const showSocialsInput = ref(false);

interface SocialItem {
    id: number;
    platform: string;
    link: string;
}
const socials = ref<SocialItem[]>([]);

// Đồng bộ dữ liệu preferences từ user vào socials list khi user được load
watch(() => userStore.user, (newUser) => {
    if (newUser) {
        // Init socials from preferences
        const prefs = newUser.profile.preferences || {};
        socials.value = Object.entries(prefs).map(([key, value], index) => ({
            id: Date.now() + index,
            platform: key,
            link: value as string
        }));
        
        // Init original data for comparison
         if (!originalUserData.value) {
            originalUserData.value = JSON.parse(JSON.stringify(newUser));
        }
        // Note: preferences in originalUserData will be an object, we compare against transformed socials later
    }
}, { deep: true });

const addSocialRow = () => {
    socials.value.push({ id: Date.now(), platform: '', link: '' });
};

const removeSocialRow = (index: number) => {
    socials.value.splice(index, 1);
};

// --- End State mở rộng ---

// Lưu dữ liệu gốc để so sánh
const originalUserData = ref<User | null>(null);

// Kiểm tra có thay đổi không
const hasChanges = computed(() => {
  if (!userStore.user || !originalUserData.value) return false;
  const current = userStore.user;
  const original = originalUserData.value;
  
  // Convert current socials list back to object for comparison
  const currentPrefs: Record<string, any> = {};
  socials.value.forEach(item => {
      if(item.platform.trim()) currentPrefs[item.platform.trim()] = item.link.trim();
  });

  // Compare Basic Info
  const basicChanged = (
    current.name !== original.name ||
    current.phone !== original.phone ||
    current.gender !== original.gender ||
    current.date_of_birth?.toString() !== original.date_of_birth?.toString() ||
    (current.profile.bio || '') !== (original.profile.bio || '')
  );
  // Compare Preferences
  const originalPrefs = original.profile.preferences || {};
  const prefChanged = JSON.stringify(currentPrefs) !== JSON.stringify(originalPrefs);

  return basicChanged || prefChanged;
});

const handleResize = () => {
  showNavbar.value = window.innerWidth > 1024;
};

onMounted(() => {
  handleResize();
  userStore.getProfileStore();
  window.addEventListener("resize", handleResize);
});
onUnmounted(() => window.removeEventListener("resize", handleResize));

const fileInput = ref<HTMLInputElement | null>(null);
const previewImage = ref<string | null>(null);

const triggerFileInput = () => fileInput.value?.click();
const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  previewImage.value = URL.createObjectURL(file);

  try {
    await userStore.updateAvatarStore(file);
    textToast.value = "Ảnh đại diện đã được cập nhật!";
    showNotification.value = true;
  } catch {
    textToast.value = "Cập nhật ảnh đại diện thất bại!";
    showNotification.value = true;
  }
};

const textToast = ref("");
const showNotification = ref(false);
const change = async () => {
  textToast.value = "";
  showNotification.value = false;
  if (!userStore.user) return;
  
  if (!userStore.user.name || !userStore.user.phone) {
    textToast.value = "Vui lòng nhập đầy đủ họ tên và số điện thoại.";
    showNotification.value = true;
    return;
  }
  const phoneRegex = /^(0|\+84)[0-9]{9}$/;
  if (!phoneRegex.test(userStore.user.phone)) {
    textToast.value = "Số điện thoại không hợp lệ.";
    showNotification.value = true;
    return;
  }
  
  try {
    if (userStore.user.date_of_birth && !(userStore.user.date_of_birth instanceof Date)) {
      userStore.user.date_of_birth = new Date(userStore.user.date_of_birth);
    }

    // Transform socials array back to preferences object before saving
    const newPreferences: Record<string, any> = {};
    socials.value.forEach(item => {
        if (item.platform.trim()) {
            newPreferences[item.platform.trim()] = item.link.trim();
        }
    });
    userStore.user.profile.preferences = newPreferences;

    await userStore.updateInfoStore(userStore.user);
      // Update original data after save
      originalUserData.value = JSON.parse(JSON.stringify(userStore.user));    
      
    textToast.value = "Đã cập nhật thông tin mới";
    showNotification.value = true;
  } catch {
    textToast.value = "Cập nhật thông tin thất bại";
    showNotification.value = true;
  }
};

const showEmailModal = ref(false);
const showOtpForm = ref(false);
const newEmail = ref("");
const password = ref("");
const otp = ref("");

const openEmailForm = () => {
    showEmailModal.value = true;
    showOtpForm.value = false;
    newEmail.value = "";
    password.value = "";
    otp.value = "";
};
const closeEmailModal = () => (showEmailModal.value = false);

const sendChangeEmail = async () => {
  textToast.value=""

  if (!newEmail.value || !password.value) {
    textToast.value = "Vui lòng nhập đủ email mới và mật khẩu";
    showNotification.value = true;
    return;
  }
  try {
    //    await userStore.changeEmail(newEmail.value, password.value);
    
    // if (userStore.emailPending) {
    //   showOtpForm.value = true;
    //   textToast.value = "OTP đã được gửi, vui lòng kiểm tra email";
    //   showNotification.value = true;
    // }
  } catch(error:any) {
    if(error?.response?.data?.message === "Email already exists"){
      textToast.value = "Email đã tồn tại, vui lòng chọn email khác.";
    }
    else if(error?.response?.data?.message === "Invalid password"){
        textToast.value = "Mật khẩu không chính xác";
    }
    else{
      textToast.value = "Email đã tồn tại hoặc sai mật khẩu";
    }
    showNotification.value = true;
  }
};

const verifyOtp = async () => {
  if (!otp.value) return;
  try {
    // await userStore.verifyChangeEmail(otp.value);
    showOtpForm.value = false;
    showEmailModal.value = false;
    textToast.value = "Email đã được đổi thành công";
    showNotification.value = true;
  } catch {
    textToast.value = "Xác thực OTP thất bại";
    showNotification.value = true;
  }
};
</script>

<template>
  <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900">
    <Header />
    <Notification :text="textToast" :isSuccess="showNotification" />
    <Loading :loading="userStore.loading" />

    <main class="pt-[10px] pb-20">
        <div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col lg:flex-row gap-8 items-start">
                <!-- Sidebar -->
                <div class="w-full lg:w-[280px] flex-shrink-0">
                    <SideBarProfile
                        v-model:show-menu="showNavbar"
                        :show-detail="true"
                        :show-address="false"
                        :show-favourite="false"
                        :show-notification="false"
                        :show-order="false"
                        :show-profile="true"
                        :show-register-seller="false"
                        :show-reset-password="false"
                        :show-voucher="false"
                    />
                </div>

                <!-- Main Content Card -->
                <div v-if="userStore.user" class="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                    <!-- Header -->
                    <div class="px-8 py-6 border-b border-gray-100">
                        <h1 class="text-xl font-bold text-gray-900">Hồ sơ của tôi</h1>
                        <p class="text-sm text-gray-500 mt-1">Quản lý thông tin hồ sơ để bảo mật tài khoản</p>
                    </div>

                    <!-- Body -->
                    <div class="p-8">
                        <div class="flex flex-col-reverse lg:flex-row gap-10">
                            
                            <!-- Form Section (Left) -->
                            <div class="flex-1 space-y-6">
                                <!-- Name -->
                                <div class="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-2 md:gap-6 items-center">
                                    <label class="text-sm font-medium text-gray-500 text-right md:text-right">Tên hiển thị</label>
                                    <input 
                                        v-model="userStore.user.name" 
                                        type="text" 
                                        class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                                    />
                                </div>

                                <!-- Email -->
                                <div class="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-2 md:gap-6 items-center">
                                    <label class="text-sm font-medium text-gray-500 md:text-right">Email</label>
                                    <div class="flex items-center gap-3">
                                        <span class="text-sm text-gray-900 font-medium">{{ userStore.user.email }}</span>
                                        <button 
                                            @click="openEmailForm"
                                            class="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                                        >
                                            Thay đổi
                                        </button>
                                    </div>
                                </div>

                                <!-- Phone -->
                                <div class="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-2 md:gap-6 items-center">
                                    <label class="text-sm font-medium text-gray-500 md:text-right">Số điện thoại</label>
                                    <input 
                                        v-model="userStore.user.phone" 
                                        type="text"
                                        class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                                    />
                                </div>

                                <!-- Gender -->
                                <div class="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-2 md:gap-6 items-center">
                                    <label class="text-sm font-medium text-gray-500 md:text-right">Giới tính</label>
                                    <div class="flex gap-6">
                                        <label class="flex items-center gap-2 cursor-pointer group">
                                            <input type="radio" name="gender" value="male" v-model="userStore.user.gender" class="accent-black cursor-pointer w-4 h-4" />
                                            <span class="text-sm text-gray-700 group-hover:text-black">Nam</span>
                                        </label>
                                        <label class="flex items-center gap-2 cursor-pointer group">
                                            <input type="radio" name="gender" value="female" v-model="userStore.user.gender" class="accent-black cursor-pointer w-4 h-4" />
                                            <span class="text-sm text-gray-700 group-hover:text-black">Nữ</span>
                                        </label>
                                        <label class="flex items-center gap-2 cursor-pointer group">
                                            <input type="radio" name="gender" value="other" v-model="userStore.user.gender" class="accent-black cursor-pointer w-4 h-4" />
                                            <span class="text-sm text-gray-700 group-hover:text-black">Khác</span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Birthday -->
                                <div class="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-2 md:gap-6 items-center">
                                    <label class="text-sm font-medium text-gray-500 md:text-right">Ngày sinh</label>
                                    <input
                                        type="date"
                                        class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                                        :value="userStore.user?.date_of_birth instanceof Date ? userStore.user.date_of_birth.toISOString().substr(0,10) : userStore.user?.date_of_birth || ''"
                                        @input="(e: Event) => {
                                            const target = e.target as HTMLInputElement | null;
                                            if (!target || !userStore.user) return;
                                            userStore.user.date_of_birth = target.value ? new Date(target.value) : new Date();
                                        }"
                                    />
                                </div>

                                <!-- Save Button -->
                                <div class="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-2 md:gap-6 mt-8">
                                    <div></div>
                                    <button 
                                        class="w-fit px-8 py-3 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/20"
                                        @click="change" 
                                        :disabled="!hasChanges"
                                    >
                                        Lưu Thay Đổi
                                    </button>
                                </div>
                            </div>

                            <!-- Right Section: Avatar & Extra Info -->
                            <!-- Increased width to accommodate extra info -->
                            <div class="w-full lg:w-[350px] flex flex-col border-l border-gray-100 pl-0 lg:pl-10">
                                
                                <!-- Avatar -->
                                <div class="flex flex-col items-center justify-center gap-6 mb-8 pt-2">
                                    <div class="relative group cursor-pointer">
                                        <div class="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 shadow-inner">
                                            <img 
                                                :src="userStore.user.avatar || previewImage || ''"
                                                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                alt="avatar" 
                                            />
                                        </div>
                                        <!-- Overlay Icon -->
                                        <div class="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" @click="triggerFileInput">
                                            <i class="fa-solid fa-camera text-white text-xl drop-shadow-md"></i>
                                        </div>
                                    </div>
                                    
                                    <div class="text-center">
                                        <button 
                                            @click="triggerFileInput"
                                            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:border-black hover:text-black transition-all bg-white"
                                        >
                                            Chọn ảnh
                                        </button>
                                        <input ref="fileInput" type="file" accept="image/*" @change="handleFileChange" class="hidden" />
                                        <p class="text-xs text-gray-400 mt-2">
                                            Dụng lượng tối đa 1 MB<br>Định dạng: .JPEG, .PNG
                                        </p>
                                    </div>
                                </div>

                                <!-- Extra Info Sections (Bio & Socials) -->
                                <div class="w-full space-y-4">
                                    
                                    <!-- Bio Section -->
                                    <div class="border rounded-xl border-gray-200 overflow-hidden transition-all duration-300">
                                        <div 
                                            class="px-4 py-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                                            @click="showBioInput = !showBioInput"
                                        >
                                            <span class="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                <i class="fa-regular fa-pen-to-square"></i> Bio / Giới thiệu
                                            </span>
                                            <i class="fa-solid fa-chevron-down text-xs text-gray-500 transition-transform duration-300" :class="{'rotate-180': showBioInput}"></i>
                                        </div>
                                        <div v-show="showBioInput" class="p-4 bg-white border-t border-gray-100">
                                            <textarea 
                                                v-model="userStore.user.profile.bio" 
                                                rows="3" 
                                                class="w-full text-sm border border-gray-200 rounded-lg p-3 outline-none focus:border-black transition-all resize-none placeholder-gray-400" 
                                                placeholder="Viết đôi dòng giới thiệu về bản thân..."
                                            ></textarea>
                                        </div>
                                    </div>

                                    <!-- Socials Section -->
                                    <div class="border rounded-xl border-gray-200 overflow-hidden transition-all duration-300">
                                        <div 
                                            class="px-4 py-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                                            @click="showSocialsInput = !showSocialsInput"
                                        >
                                            <span class="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                <i class="fa-solid fa-share-nodes"></i> Mạng xã hội
                                            </span>
                                            <i class="fa-solid fa-chevron-down text-xs text-gray-500 transition-transform duration-300" :class="{'rotate-180': showSocialsInput}"></i>
                                        </div>
                                        <div v-show="showSocialsInput" class="p-4 bg-white border-t border-gray-100 space-y-3">
                                            <div v-for="(item, idx) in socials" :key="item.id" class="flex gap-2 items-center animate-fade-in">
                                                <input 
                                                    v-model="item.platform" 
                                                    type="text" 
                                                    placeholder="Tên (VD: Facebook)" 
                                                    class="w-1/3 text-xs border border-gray-200 rounded-md p-2.5 outline-none focus:border-black transition-colors"
                                                >
                                                <input 
                                                    v-model="item.link" 
                                                    type="text" 
                                                    placeholder="Link / Username" 
                                                    class="flex-1 text-xs border border-gray-200 rounded-md p-2.5 outline-none focus:border-black transition-colors"
                                                >
                                                <button 
                                                    @click="removeSocialRow(idx)" 
                                                    class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Xóa"
                                                >
                                                    <i class="fa-solid fa-trash text-xs"></i>
                                                </button>
                                            </div>
                                            <button 
                                                @click="addSocialRow" 
                                                class="text-xs font-bold text-black hover:text-gray-600 hover:underline flex items-center gap-1 transition-colors mt-2"
                                            >
                                                <i class="fa-solid fa-plus bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px]"></i> 
                                                Thêm mạng xã hội
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Modal Change Email -->
    <div v-if="showEmailModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeEmailModal"></div>
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 class="text-lg font-bold text-gray-900">Đổi Email</h3>
                <button @click="closeEmailModal" class="text-gray-400 hover:text-black transition-colors">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>
            
            <div class="p-6 space-y-4">
                <div v-if="!showOtpForm" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Email mới</label>
                        <input v-model="newEmail" type="email" placeholder="example@mail.com" class="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Mật khẩu hiện tại</label>
                        <input v-model="password" type="password" placeholder="••••••••" class="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none" />
                    </div>
                    <button @click="sendChangeEmail" class="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors mt-2">
                        Gửi mã xác nhận
                    </button>
                </div>

                <div v-else class="space-y-4 text-center">
                    <div class="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <i class="fa-solid fa-envelope-circle-check text-xl"></i>
                    </div>
                    <p class="text-sm text-gray-600">Mã xác thực (OTP) đã được gửi đến email mới của bạn.</p>
                    <input v-model="otp" type="text" placeholder="Nhập mã OTP" class="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-lg font-mono tracking-widest focus:border-black focus:ring-1 focus:ring-black outline-none" />
                    <button @click="verifyOtp" class="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors">
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    </div>

  </div>
  <Footer />
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>