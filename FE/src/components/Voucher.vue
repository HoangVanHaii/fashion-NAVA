<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { Voucher } from "../interfaces/voucher";
import { useCartStore } from '../stores/cartStore';
import { useVoucherStore } from '../stores/voucherStore'; 

// Props
const props = defineProps<{
  cartTotal: number 
}>();

const emit = defineEmits(["close", "apply"]);

const cartStore = useCartStore();
const voucherStore = useVoucherStore();

const selectedVoucherId = ref<string | null>(null);
const errorMsg = ref('');

// Search & Claim
const textSearch = ref("");
const isSearching = ref(false);

// Utils Format
const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';
const formatDate = (dateStr: string) => {
    if(!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN');
}

// --- LINK ẢNH CLOUDINARY CỦA BẠN ---
const getImage = (url?: string) => {
    if (url && url.length > 0) return url;
    return 'https://res.cloudinary.com/dnjp4j9xb/image/upload/v1765647982/voucher_vkp9t6.webp'; 
}

// Load Vouchers
onMounted(async () => {
    await voucherStore.getAllVoucherStore();
});

// Xử lý Search / Claim
const handleSearchOrClaim = async () => {
    if (!textSearch.value) return;
    errorMsg.value = '';
    
    // 1. Tìm local
    const found = voucherStore.myVouchers.filter(v => v.code.toLowerCase() === textSearch.value.toLowerCase());
    
    if (found.length > 0) {
        voucherStore.myVouchers = found;
    } else {
        // 2. Gọi API Claim
        isSearching.value = true;
        try {
            const res = await voucherStore.claimVoucherAction(textSearch.value);
            if(res.success) {
                alert(res.message);
                voucherStore.myVouchers = voucherStore.myVouchers;
                textSearch.value = ""; 
            }
        } catch (err: any) {
            errorMsg.value = err.message;
            voucherStore.myVouchers = [];
        } finally {
            isSearching.value = false;
        }
    }
};

watch(() => voucherStore.myVouchers, (newVal) => {
    if (!textSearch.value) voucherStore.myVouchers = newVal;
});

watch(textSearch, (val) => {
    if (!val) {
        voucherStore.myVouchers = voucherStore.myVouchers;
        errorMsg.value = '';
    }
});

// Logic Check
const isEligible = (voucher: Voucher) => {
    const now = new Date();
    const endDate = new Date(voucher.end_date);
    if(endDate < now) return false;
    return props.cartTotal >= voucher.min_order_value;
};

const handleSelect = (voucher: Voucher) => {
    console.log(voucher);
    if(isEligible(voucher)) selectedVoucherId.value = voucher.id;
};

const handleApply = () => {
    const voucher = voucherStore.myVouchers.find(v => v.id === selectedVoucherId.value);
    if (voucher) {
        emit("apply", voucher);
        emit("close");
    }
};
</script>

<template>
  <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>
    
    <div class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
      
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <h3 class="text-lg font-bold text-gray-900 uppercase tracking-wide">Chọn Voucher</h3>
        <button @click="$emit('close')" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
          <i class="fa-solid fa-xmark text-xl text-gray-500"></i>
        </button>
      </div>

      <div class="p-4 bg-gray-50 border-b border-gray-100">
        <div class="flex gap-2">
          <input 
            v-model="textSearch" 
            type="text" 
            placeholder="Nhập mã voucher" 
            class="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all uppercase placeholder:normal-case"
            @keyup.enter="handleSearchOrClaim"
          />
          <button 
            @click="handleSearchOrClaim"
            :disabled="!textSearch || isSearching || voucherStore.loading"
            class="px-5 py-2.5 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {{ isSearching || voucherStore.loading ? '...' : 'Áp dụng' }}
          </button>
        </div>
        <div v-if="errorMsg" class="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-xs text-red-600 font-medium">
             <i class="fa-solid fa-circle-exclamation"></i>
             <span>{{ errorMsg }}</span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-white custom-scrollbar relative">
        <div v-if="voucherStore.loading && voucherStore.myVouchers.length === 0" class="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>

        <div 
            v-for="voucher in voucherStore.myVouchers" 
            :key="voucher.id"
            class="group relative border rounded-xl p-3 flex gap-3 transition-all duration-200 cursor-pointer select-none"
            :class="[
                !isEligible(voucher) ? 'border-gray-100 bg-gray-50 opacity-60 grayscale cursor-not-allowed' : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-md',
                selectedVoucherId === voucher.id ? '!border-black ring-1 ring-black bg-gray-50/30' : ''
            ]"
            @click="handleSelect(voucher)"
        >
            <div class="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 relative">
                <img :src="getImage(voucher.image_url)" class="w-full h-full object-cover" />
                
                <div v-if="voucher.discount_type === 'PERCENT'" class="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl-lg">
                    %
                </div>
            </div>

            <div class="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start mb-1">
                        <p class="text-red-600 font-black text-sm uppercase tracking-wider leading-tight">{{ voucher.code }}</p>
                        
                        <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ml-2"
                             :class="[
                                selectedVoucherId === voucher.id ? 'border-black' : 'border-gray-300',
                                !isEligible(voucher) ? 'opacity-50' : ''
                             ]">
                            <div class="w-2.5 h-2.5 rounded-full bg-black transform scale-0 transition-transform duration-200"
                                 :class="selectedVoucherId === voucher.id ? 'scale-100' : ''"></div>
                        </div>
                    </div>
                    <p class="text-left text-gray-600 text-xs line-clamp-2 leading-relaxed" :title="voucher.description">
                        {{ voucher.description }}
                    </p>
                </div>
                
                <div class="flex items-end justify-between mt-2 border-t border-dashed border-gray-100 pt-2">
                    <span class="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                        Đơn tối thiểu {{ formatPrice(voucher.min_order_value) }}
                    </span>
                    <div class="text-[10px] text-gray-400 flex items-center gap-1">
                        <i class="fa-regular fa-clock"></i>
                        <span>HSD: {{ formatDate(voucher.end_date) }}</span>
                    </div>
                </div>
            </div>
             <div v-if="!isEligible(voucher)" class="absolute inset-0 z-10" title="Chưa đủ điều kiện áp dụng"></div>
        </div>

        <div v-if="voucherStore.myVouchers && voucherStore.myVouchers.length === 0 && !voucherStore.loading" class="text-center py-10 text-gray-400">
            <i class="fa-solid fa-ticket text-4xl mb-2 opacity-30"></i>
            <p class="text-xs">Bạn chưa có voucher nào.</p>
        </div>
      </div>

      <div class="p-4 bg-white border-t border-gray-100 flex gap-3 sticky bottom-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button @click="$emit('close')" class="flex-1 py-3 border border-gray-300 rounded-lg font-bold text-sm text-gray-600 hover:bg-gray-50 hover:text-black transition-colors">
            Đóng
        </button>
        <button 
            @click="handleApply" 
            class="flex-1 py-3 bg-black text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!selectedVoucherId"
        >
            Đồng ý
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 10px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #d1d5db; }
.animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>