<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import SideBarEmployee from '@/components/Employee/SideBarEmployee.vue'; // Đảm bảo đường dẫn đúng
import FlashSaleDetail from './FlashSaleDetail.vue'; // Import modal chi tiết
import Loading from '@/components/Loading.vue';
import { flashSaleStore } from '@/stores/flashSale';
import { formatDateTime } from '@/utils/format';
import type { FlashSale } from '@/interfaces/flashSale';

// --- Store & State ---
const flashSaleStoreInstance = flashSaleStore();
const loadingPage = ref(false);

// Modal State
const showFlashSaleModal = ref(false);
const selectedFlashSale = ref<FlashSale | null>(null);

// Filter State
const currentFilter = ref('all'); // all, active, upcoming, expired

// --- Lifecycle ---
onMounted(async () => {
    loadingPage.value = false;
    // Gọi API lấy danh sách Flash Sale (Có thể dùng lại hàm getFlashSaleActiveStore hoặc hàm lấy tất cả nếu có)
    await flashSaleStoreInstance.getFlashSaleActiveStore(); 
    loadingPage.value = true;
});

// --- Computed ---
const filteredList = computed(() => {
    const list = flashSaleStoreInstance.listFlashSale || [];
    if (currentFilter.value === 'all') return list;
    return list.filter(item => item.status === currentFilter.value);
});

const counts = computed(() => {
    const list = flashSaleStoreInstance.listFlashSale || [];
    return {
        all: list.length,
        active: list.filter(i => i.status === 'active').length,
        pending: list.filter(i => i.status === 'pending').length,
        ended: list.filter(i => i.status === 'ended').length,
        cancelled: list.filter(i => i.status === 'cancelled').length,
    } as Record<string, number>;
});

// --- Methods ---
const handleViewDetail = (sale: FlashSale) => {
    selectedFlashSale.value = sale;
    showFlashSaleModal.value = true;
};

const setFilter = (filter: string) => {
    currentFilter.value = filter;
};

const getStatusBadgeColor = (status: string) => {
    switch(status) {
        case 'active': return 'bg-green-100 text-green-700 border-green-200';
        case 'pending': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'ended': return 'bg-gray-100 text-gray-600 border-gray-200';
        case 'cancelled': return 'bg-red-400 text-red-400 border-red-400';
        default: return 'bg-gray-50 text-gray-500 border-gray-200';
    }
}

const getStatusLabel = (status: string) => {
     switch(status) {
        case 'active': return 'Đang diễn ra';
        case 'pending': return 'Sắp diễn ra';
         case 'ended': return 'Đã kết thúc';
         case 'cancelled': return 'Đã hủy';

        default: return status;
    }
}
</script>

<template>
    <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900 flex h-screen overflow-hidden">
        <Loading :loading="!loadingPage" />
        
        <FlashSaleDetail 
            :show="showFlashSaleModal" 
            :flashSale="selectedFlashSale"
            @close="showFlashSaleModal = false"
        />

        <SideBarEmployee />

        <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
            
            <div class="flex-1 overflow-auto sm:p-8 custom-page-scroll">
                <div class="max-w-7xl mx-auto space-y-6">
                    
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 class="text-2xl font-black text-gray-900 uppercase tracking-tight">Danh sách chiến dịch</h1>
                            <p class="text-sm text-gray-500">Quản lý và theo dõi các chương trình Flash Sale của cửa hàng</p>
                        </div>
                        
                        </div>

                    <div class="bg-white p-1 rounded-xl border border-gray-200 inline-flex shadow-sm">
                        <button 
                            v-for="filter in ['all', 'active', 'pending', 'ended', 'cancelled']" 
                            :key="filter"
                            @click="setFilter(filter)"
                            class="px-4 py-2 rounded-lg text-xs font-bold transition-all relative"
                            :class="currentFilter === filter ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-black'"
                        >
                            {{ filter === 'all' ? 'Tất cả' : getStatusLabel(filter) }}
                            <span class="ml-1 opacity-80 text-[10px]">({{ counts[filter] }})</span>
                        </button>
                    </div>

                    <div v-if="filteredList.length === 0" class="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                         <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fa-solid fa-bolt text-3xl text-gray-300"></i>
                         </div>
                         <h3 class="text-lg font-bold text-gray-900">Không tìm thấy chương trình nào</h3>
                         <p class="text-gray-500 text-sm">Hiện tại không có chiến dịch nào ở trạng thái này.</p>
                    </div>

                    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div 
                            v-for="sale in filteredList" 
                            :key="sale.id" 
                            class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group flex flex-col h-full cursor-pointer"
                            @click="handleViewDetail(sale)"
                        >
                            <div class="flex justify-between items-start mb-4">
                                <span 
                                    class="px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border"
                                    :class="getStatusBadgeColor(sale.status || '')"
                                >
                                    {{ getStatusLabel(sale.status || '') }}
                                </span>
                                <div class="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center transition-colors text-gray-400">
                                    <i class="fa-solid fa-arrow-right text-sm"></i>
                                </div>
                            </div>

                            <div class="mb-4 flex-1">
                                <h3 class="text-base font-bold text-gray-900 line-clamp-2 mb-3 group-hover:text-blue-700 transition-colors">
                                    {{ sale.title }}
                                </h3>
                                
                                <div class="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                                    <div class="flex items-center justify-between text-xs">
                                        <span class="text-gray-500 font-medium">Bắt đầu:</span>
                                        <span class="font-bold text-gray-900">{{ formatDateTime(sale.start_date) }}</span>
                                    </div>
                                    <div class="w-full h-px bg-gray-200 border-dashed"></div>
                                    <div class="flex items-center justify-between text-xs">
                                        <span class="text-gray-500 font-medium">Kết thúc:</span>
                                        <span class="font-bold text-gray-900">{{ formatDateTime(sale.end_date) }}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
                                <div class="flex items-center gap-2">
                                    <div class="relative flex h-3 w-3">
                                      <span v-if="sale.is_participate" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                      <span class="relative inline-flex rounded-full h-3 w-3" :class="sale.is_participate ? 'bg-green-500' : 'bg-gray-300'"></span>
                                    </div>
                                    <span class="text-xs font-bold uppercase" :class="sale.is_participate ? 'text-green-700' : 'text-gray-400'">
                                        {{ sale.is_participate ? 'Đang tham gia' : 'Chưa tham gia' }}
                                    </span>
                                </div>
                                <span class="text-xs text-gray-400 font-medium">ID: #{{ sale.id }}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    </div>
</template>

<style scoped>
/* Page Scrollbar - Giữ nguyên style từ Home.vue */
.custom-page-scroll::-webkit-scrollbar {
  width: 8px;
}
.custom-page-scroll::-webkit-scrollbar-track {
  background: #FAFAFA;
}
.custom-page-scroll::-webkit-scrollbar-thumb {
  background-color: #d4d4d4;
  border-radius: 10px;
}
</style>