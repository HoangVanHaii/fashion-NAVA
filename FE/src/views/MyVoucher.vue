<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router"; // Import Router
import SideBarProfile from "@/components/SideBarProfile.vue";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import Loading from "@/components/Loading.vue";
import Notification from "@/components/Notification.vue";
import { useVoucherStore } from '@/stores/voucherStore';
import type { Voucher } from "@/interfaces/voucher";

// --- Config ---
const router = useRouter(); // Init Router
const voucherStore = useVoucherStore();
const showNavbar = ref(true);
const loading = ref(false);

// --- Notification State ---
const showNotification = ref(false);
const notifyText = ref("");
const isSuccessNotify = ref(true);

const showNotify = (msg: string, success: boolean = true) => {
    notifyText.value = msg;
    isSuccessNotify.value = success;
    showNotification.value = true;
};

// --- Data State ---
const listVouchers = ref<Voucher[]>([]);
const textSearch = ref("");
const isSearching = ref(false);
const activeTab = ref<'active' | 'used' | 'expired'>('active');

// --- Lifecycle ---
const handleResize = () => {
  showNavbar.value = window.innerWidth > 1024;
};

onMounted(async () => {
  handleResize();
  window.addEventListener("resize", handleResize);
  
  loading.value = true;
  await voucherStore.fetchUserVouchersAction();
  listVouchers.value = voucherStore.myVouchers;
  loading.value = false;
});

onUnmounted(() => window.removeEventListener("resize", handleResize));

// --- Computed ---
const filteredVouchers = computed(() => {
    const now = new Date();
    let source = listVouchers.value;

    if (activeTab.value === 'active') {
        source = source.filter(v => new Date(v.end_date) >= now);
    } else if (activeTab.value === 'expired') {
        source = source.filter(v => new Date(v.end_date) < now);
    }

    if (textSearch.value) {
        source = source.filter(v => v.code.toLowerCase().includes(textSearch.value.toLowerCase()));
    }

    return source;
});

// --- Utils ---
const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';
const formatDate = (dateStr: string) => {
    if(!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN');
}
const getImage = (url?: string) => {
    if (url && url.length > 0) return url;
    return 'https://res.cloudinary.com/dnjp4j9xb/image/upload/v1765647982/voucher_vkp9t6.webp'; 
}

// --- Actions ---
const handleSearchOrClaim = async () => {
    if (!textSearch.value) return;
    
    const foundLocal = voucherStore.myVouchers.some(v => v.code.toLowerCase() === textSearch.value.toLowerCase());
    if (foundLocal) {
        showNotify("Bạn đã sở hữu voucher này rồi!", true);
        return;
    }

    isSearching.value = true;
    try {
        const res = await voucherStore.claimVoucherAction(textSearch.value);
        if(res.success) {
            showNotify(res.message, true);
            await voucherStore.fetchUserVouchersAction();
            listVouchers.value = voucherStore.myVouchers;
            textSearch.value = ""; 
        }
    } catch (err: any) {
        showNotify(err.message || "Không thể lưu voucher", false);
    } finally {
        isSearching.value = false;
    }
};

const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    showNotify(`Đã sao chép mã: ${code}`, true);
};

// Hàm chuyển hướng sang trang Cart
const handleUseVoucher = () => {
    router.push({ name: 'cart' });
};

const getDaysLeft = (dateStr: string) => {
    const end = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(end.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (end < now) return "Đã hết hạn";
    if (diffDays <= 3) return `Hết hạn sau ${diffDays} ngày`;
    return null;
}
</script>

<template>
  <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900 pt-[26px]" >
    <Header />
    <Notification :text="notifyText" :isSuccess="isSuccessNotify" v-if="showNotification" />
    <Loading :loading="loading || voucherStore.loading" />

    <main class=" pb-20">
        <div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col lg:flex-row gap-8 items-start">
                
                <div class="w-full lg:w-[280px] flex-shrink-0">
                    <SideBarProfile
                        v-model:show-menu="showNavbar"
                        :show-detail="false"
                        :show-address="false"
                        :show-favourite="false"
                        :show-notification="false"
                        :show-order="false"
                        :show-profile="false"
                        :show-register-seller="false"
                        :show-reset-password="false"
                        :show-voucher="true" 
                    />
                </div>

                <div class="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in min-h-[600px] flex flex-col">
                    
                    <div class="px-8 py-6 border-b border-gray-100">
                        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <i class="fa-solid fa-ticket text-orange-500"></i> Kho Voucher
                                </h1>
                                <p class="text-sm text-gray-500 mt-1">Quản lý và sử dụng mã giảm giá của bạn</p>
                            </div>

                            <div class="w-full md:w-auto flex gap-2">
                                <input 
                                    v-model="textSearch" 
                                    type="text" 
                                    placeholder="Nhập mã voucher" 
                                    class="w-full md:w-64 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all uppercase placeholder:normal-case"
                                    @keyup.enter="handleSearchOrClaim"
                                />
                                <button 
                                    @click="handleSearchOrClaim"
                                    :disabled="!textSearch || isSearching"
                                    class="px-4 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap"
                                >
                                    {{ isSearching ? '...' : 'Lưu' }}
                                </button>
                            </div>
                        </div>

                        <div class="flex gap-6 mt-6 border-b border-gray-100">
                            <button 
                                @click="activeTab = 'active'"
                                class="pb-3 text-sm font-bold border-b-2 transition-colors relative"
                                :class="activeTab === 'active' ? 'text-black border-black' : 'text-gray-400 border-transparent hover:text-gray-600'"
                            >
                                Có hiệu lực
                            </button>
                            <button 
                                @click="activeTab = 'expired'"
                                class="pb-3 text-sm font-bold border-b-2 transition-colors relative"
                                :class="activeTab === 'expired' ? 'text-black border-black' : 'text-gray-400 border-transparent hover:text-gray-600'"
                            >
                                Hết hạn
                            </button>
                        </div>
                    </div>

                    <div class="p-8 bg-gray-50 flex-1">
                        <div v-if="filteredVouchers.length > 0" class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            <div 
                                v-for="voucher in filteredVouchers" 
                                :key="voucher.id"
                                class="group relative bg-white border border-gray-200 rounded-xl p-4 flex gap-4 transition-all hover:shadow-md hover:border-gray-300"
                                :class="activeTab !== 'active' ? 'opacity-60 grayscale' : ''"
                            >
                                <div class="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 relative">
                                    <img :src="getImage(voucher.image_url)" class="w-full h-full object-cover" />
                                    <div v-if="voucher.discount_type === 'PERCENT'" class="absolute top-0 left-0 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg shadow-sm">%</div>
                                    <div v-else class="absolute top-0 left-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg shadow-sm">Giảm {{ formatPrice(voucher.discount_value) }}</div>
                                </div>

                                <div class="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                        <div class="flex justify-between items-start">
                                            <h3 class="text-gray-900 font-bold text-sm line-clamp-1" :title="voucher.code">
                                                {{ voucher.code }}
                                            </h3>
                                            <button @click="copyToClipboard(voucher.code)" class="text-xs text-gray-400 hover:text-black transition-colors" title="Sao chép mã">
                                                <i class="fa-regular fa-copy"></i>
                                            </button>
                                        </div>
                                        <p class="text-xs text-gray-500 mt-1 line-clamp-2" :title="voucher.description">
                                            {{ voucher.description }}
                                        </p>
                                    </div>

                                    <div class="mt-3 pt-3 border-t border-dashed border-gray-100 flex items-center justify-between">
                                        <div class="flex flex-col gap-0.5">
                                            <span class="text-[10px] text-gray-400">HSD: {{ formatDate(voucher.end_date) }}</span>
                                            <div v-if="activeTab === 'active' && getDaysLeft(voucher.end_date)" class="text-[10px] text-orange-600 font-bold">
                                                {{ getDaysLeft(voucher.end_date) }}
                                            </div>
                                        </div>

                                        <button 
                                            v-if="activeTab === 'active'"
                                            @click="handleUseVoucher"
                                            class="px-3 py-1.5 bg-black text-white text-[10px] font-bold rounded hover:bg-gray-800 transition-colors shadow-sm"
                                        >
                                            Dùng ngay
                                        </button>
                                    </div>
                                </div>

                                <div class="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-50 rounded-full border-r border-gray-200"></div>
                                <div class="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-50 rounded-full border-l border-gray-200"></div>
                            </div>
                        </div>

                        <div v-else class="flex flex-col items-center justify-center h-64 text-center">
                            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <i class="fa-solid fa-ticket text-3xl text-gray-300"></i>
                            </div>
                            <h3 class="text-sm font-bold text-gray-900">Không tìm thấy voucher</h3>
                            <p class="text-xs text-gray-500 mt-1 max-w-xs">
                                {{ activeTab === 'active' ? 'Bạn chưa có mã giảm giá nào.' : 'Bạn không có mã giảm giá nào ở mục này.' }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>