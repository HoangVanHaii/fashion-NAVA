<script setup lang="ts">
import FlashSaleDetail from './FlashSaleDetail.vue';
import SideBarEmployee from '@/components/Employee/SideBarEmployee.vue';
import Loading from '../../components/Loading.vue';
import { onMounted, ref } from 'vue';
import {  formatDateTime, formatPrice } from '../../utils/format';
import { flashSaleStore } from '@/stores/flashSale';
import { useOrderEmployeeStore } from '@/stores/order';
import type { FlashSale } from '@/interfaces/flashSale';

const flashSale = flashSaleStore();
const loadingPage = ref(false);
const showTimeFilter = ref(false);
const selectedTimeFilter = ref('Hôm nay');
const order = useOrderEmployeeStore();

// Flash Sale Detail Modal State
const showFlashSaleModal = ref(false);
const selectedFlashSaleId = ref<FlashSale | null>(null);

// Info Tooltip States
const showInfoRevenue = ref(false);

// Mock Data for Online/Offline split (Since interface might not have it yet)
// const ordersOnline = computed(() => Math.floor((shopStatistic.value?.totalOrder || 0) * 0.65)); // Giả lập 65%
// const ordersOffline = computed(() => Math.ceil((shopStatistic.value?.totalOrder || 0) * 0.35));  // Giả lập 35%
// // Mock Data for Completed Orders in Todo
// const completedOrders = computed(() => Math.floor((shopStatistic.value?.totalOrder || 0)));

onMounted(async () => {
    loadingPage.value = false;
    await order.getStatisticalStore();
    await order.getDailyOrderComparisonStore(selectedTimeFilter.value);
    await flashSale.getFlashSaleActiveStore();
    loadingPage.value = true;
    console.log(flashSale.listFlashSale);
})



// const handleCancelFlashSale = async () => {
//     showConfirmDialog.value = false;
//     if (idChoose.value) {
//         loading.value = true;
//         await useFlashSale.cancelAllFlashSaleItemStore(idChoose.value)
//         useFlashSale.$patch((state) => {
//             const index = state.flashSaleHome.findIndex(item => item.id! === idChoose.value)
//             if (index !== -1) {
//                 state.flashSaleHome[index]!.shop_has_sale = false;
//             }
//         })
//         loading.value = false;
        
//         if (useFlashSale.isSuccess) {
//             isNotification.value = true;
//             toastText.value = 'Đã hủy tất cả sản phẩm trong Flash Sale';
//         } else {
//             isNotification.value = false;
//             toastText.value = 'Không thể hủy sản phẩm'
//         }
//     }
// }
const handleViewRevenue = async (time: string) => {
    selectedTimeFilter.value = time;
    showTimeFilter.value = false
    loadingPage.value = false;
    await order.getDailyOrderComparisonStore(time);
    loadingPage.value = true;
}
// Hàm mở Modal chi tiết Flash Sale
const viewFlashSaleDetail = (sale: FlashSale) => {
    selectedFlashSaleId.value = sale;
    showFlashSaleModal.value = true;
}

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
            :flashSale="selectedFlashSaleId"
            @close="showFlashSaleModal = false"
        />
        <!-- <Notification 
            :text="toastText"
            :isSuccess="isNotification" 
        /> -->

        <!-- Sidebar -->
        <SideBarEmployee />

        <!-- Main Content -->
        <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
            <!-- <Header class="border-b border-gray-200 bg-white" /> -->

            <div class="flex-1 overflow-auto sm:p-8 custom-page-scroll">
                <div class="max-w-6xl mx-0 space-y-8">
                    
                    <!-- Welcome Header -->
                    <div class="mt-[-20px]">
                        <h1 class="text-2xl font-black text-gray-900 uppercase tracking-tight">Tổng quan cửa hàng</h1>
                        <p class="text-sm text-gray-500">Theo dõi hoạt động kinh doanh của bạn hôm nay</p>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        <!-- LEFT COLUMN -->
                        <div class="lg:col-span-2 space-y-8">
                            
                            <!-- 1. To-Do List -->
                            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div class="flex justify-between items-center mb-6">
                                    <h3 class="text-lg font-bold text-gray-900">Việc cần làm</h3>
                                    <span class="text-xs text-gray-400 font-medium">Thời gian thực</span>
                                </div>
                                
                                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <!-- Pending -->
                                    <div class="bg-blue-50 rounded-xl p-4 flex flex-col items-center justify-center text-center border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors group">
                                        <span class="text-2xl font-black text-blue-600 mb-1 group-hover:scale-110 transition-transform">{{ order.statistical?.order_pending }}</span>
                                        <span class="text-[10px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                            Chờ xử lý
                                        </span>
                                    </div>

                                    <!-- Confirmed -->
                                    <div class="bg-yellow-50 rounded-xl p-4 flex flex-col items-center justify-center text-center border border-yellow-100 cursor-pointer hover:bg-yellow-100 transition-colors group">
                                        <span class="text-2xl font-black text-yellow-600 mb-1 group-hover:scale-110 transition-transform">{{ order.statistical?.order_confirmed }}</span>
                                        <span class="text-[10px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                            Chờ lấy hàng
                                        </span>
                                    </div>
                                    
                                    <!-- Completed (New) -->
                                    <div class="bg-green-50 rounded-xl p-4 flex flex-col items-center justify-center text-center border border-green-100 cursor-pointer hover:bg-green-100 transition-colors group">
                                        <span class="text-2xl font-black text-green-600 mb-1 group-hover:scale-110 transition-transform">{{ order.statistical?.order_completed }}</span>
                                        <span class="text-[10px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                            Hoàn thành
                                        </span>
                                    </div>

                                    <!-- Cancelled -->
                                    <div class="bg-red-50 rounded-xl p-4 flex flex-col items-center justify-center text-center border border-red-100 cursor-pointer hover:bg-red-100 transition-colors group">
                                        <span class="text-2xl font-black text-red-600 mb-1 group-hover:scale-110 transition-transform">{{ order.statistical?.order_cancelled }}</span>
                                        <span class="text-[10px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                            Đơn hủy
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- 2. Sales Analytics (Updated) -->
                            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div class="flex justify-between items-center mb-6">
                                    <h3 class="text-lg font-bold text-gray-900">Phân tích bán hàng</h3>
                                    <div class="relative">
                                        <button 
                                            @click="showTimeFilter = !showTimeFilter"
                                            class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:border-black hover:text-black transition-all shadow-sm focus:outline-none"
                                        >
                                            <span>{{ selectedTimeFilter }}</span>
                                            <i class="fa-solid fa-chevron-down text-[10px] transition-transform duration-200" :class="{'rotate-180': showTimeFilter}"></i>
                                        </button>

                                        <!-- Dropdown Menu -->
                                        <div 
                                            v-if="showTimeFilter" 
                                            class="absolute right-0 top-full mt-2 w-32 bg-white border border-gray-100 rounded-lg shadow-xl z-20 overflow-hidden animate-fade-in"
                                            @mouseleave="showTimeFilter = false"
                                        >
                                            <div 
                                                v-for="time in ['Hôm nay', 'Tuần này', 'Tháng này', 'Từ trước tới nay']" 
                                                :key="time"
                                                @click="handleViewRevenue(time)"
                                                class="px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 hover:text-black hover:font-bold cursor-pointer transition-colors flex justify-between items-center"
                                                :class="{'font-bold text-black bg-gray-50': selectedTimeFilter === time}"
                                            >
                                                {{ time }}
                                                <i v-if="selectedTimeFilter === time" class="fa-solid fa-check text-[10px]"></i>
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                                
                                <div class="space-y-6">
                                    <!-- Revenue Row -->
                                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center">
                                                <i class="fa-solid fa-sack-dollar"></i>
                                            </div>
                                            <div>
                                                <p class="text-xs font-bold text-gray-500 uppercase">Tổng doanh thu</p>
                                                <p class="text-xl font-black text-gray-900">{{ formatPrice(order.revenueOrder?.revenue || 0) }}</p>
                                            </div>
                                        </div>
                                        <div class="h-8 w-px bg-gray-200 mx-4 hidden sm:block"></div>
                                        <!-- Placeholder for chart or trend -->
                                        <span
                                            class="text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1"
                                            :class="
                                            (order.revenueOrder?.percentageChange || 0) >= 0
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-red-50 text-red-700'
                                            "
                                        >
                                            <i
                                            class="fa-solid"
                                            :class="
                                                 (order.revenueOrder?.percentageChange || 0) >= 0
                                                ? 'fa-arrow-trend-up'
                                                : 'fa-arrow-trend-down'
                                            "
                                            ></i>
                                            {{ order.revenueOrder?.percentageChange }} %
                                        </span>
                                    </div>

                                    <!-- Orders Split -->
                                    <div class="grid grid-cols-2 gap-4">
                                        <!-- Online Orders -->
                                        <div class="p-4 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors">
                                            <div class="flex justify-between items-start mb-2">
                                                <span class="text-xs font-bold text-gray-400 uppercase">Đơn Online</span>
                                                <i class="fa-solid fa-globe text-blue-500"></i>
                                            </div>
                                            <div class="flex items-end gap-2">
                                                <span class="text-2xl font-bold text-gray-900">{{ order.revenueOrder?.total_order_online }}</span>
                                                <span class="text-[10px] text-gray-500 mb-1">đơn</span>
                                            </div>
                                        </div>

                                        <!-- Offline Orders -->
                                        <div class="p-4 border border-gray-100 rounded-xl hover:border-orange-200 transition-colors">
                                            <div class="flex justify-between items-start mb-2">
                                                <span class="text-xs font-bold text-gray-400 uppercase">Tại quầy</span>
                                                <i class="fa-solid fa-store text-orange-500"></i>
                                            </div>
                                            <div class="flex items-end gap-2">
                                                <span class="text-2xl font-bold text-gray-900">{{ order.revenueOrder?.total_order_offline }}</span>
                                                <span class="text-[10px] text-gray-500 mb-1">đơn</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 3. NEW SECTION (Placeholder) -->
                            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
                                <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-100 to-white rounded-bl-full -mr-4 -mt-4 z-0"></div>
                                <div class="relative z-10 flex justify-between items-start">
                                    <div>
                                        <h3 class="text-left text-lg font-bold text-gray-900 mb-2 ml-[6px]">Tin tức hệ thống</h3>
                                        <p class="text-sm text-gray-500 max-w-md">Cập nhật các tính năng mới, chính sách sàn và mẹo bán hàng hiệu quả từ NAVA.</p>
                                        <button class="mt-4 text-xs font-bold text-black border-b border-black pb-0.5 hover:text-gray-600 hover:border-gray-400 transition-all">
                                            Xem chi tiết
                                        </button>
                                    </div>
                                    <div class="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 border border-gray-200">
                                        <i class="fa-regular fa-newspaper text-xl"></i>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <!-- RIGHT COLUMN: Flash Sale Campaigns -->
                        <div class="lg:col-span-1 h-full">
                            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden h-full flex flex-col max-h-[800px]">
                                <div class="p-5 border-b border-gray-100 bg-black text-white flex justify-between items-center sticky top-0 z-10">
                                    <h3 class="font-bold text-sm uppercase tracking-wider">Chiến dịch Flash Sale</h3>
                                    <button class="text-xs text-gray-300 hover:text-white hover:underline">Xem tất cả</button>
                                </div>

                                <!-- Scrollable List -->
                                <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    <div v-if="flashSale.listFlashSale.length === 0" class="flex flex-col items-center justify-center h-48 text-center text-gray-400">
                                        <i class="fa-solid fa-bolt text-4xl mb-3 opacity-30"></i>
                                        <p class="text-xs">Hiện chưa có chương trình nào.</p>
                                    </div>

                                    <div v-else class="space-y-4">
                                        <div v-for="sale in flashSale.listFlashSale" :key="sale.id" class="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow group bg-white">
                                            <div class="flex justify-between items-start mb-3">
                                                <span 
                                                    class="px-2 py-0.5 text-[10px] font-bold uppercase rounded border"
                                                    :class="getStatusBadgeColor(sale.status || '')"
                                                >
                                                    {{ getStatusLabel(sale.status || '') }}
                                                </span>
                                                <button 
                                                    @click="viewFlashSaleDetail(sale)" 
                                                    class="text-gray-400 hover:text-black transition-colors p-1 bg-gray-50 rounded-md w-6 h-6 flex items-center justify-center"
                                                    title="Xem danh sách sản phẩm"
                                                >
                                                    <i class="fa-solid fa-eye text-xs"></i>
                                                </button>
                                            </div>
                                            
                                            <h4 class="text-sm font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">{{ sale.title }}</h4>
                                            
                                            <div class="text-xs text-gray-500 space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                <div class="flex items-center gap-2">
                                                    <i class="fa-regular fa-clock text-[10px]"></i>
                                                    <span>{{ formatDateTime(sale.start_date) }}</span>
                                                </div>
                                                <div class="flex items-center gap-2 pl-4">
                                                    <i class="fa-solid fa-arrow-down text-[10px] text-gray-300"></i>
                                                    <span>{{ formatDateTime(sale.end_date) }}</span>
                                                </div>
                                            </div>

                                            <div class="mt-3 flex items-center gap-2">
                                                <div class="w-2 h-2 rounded-full" :class="sale.is_participate ? 'bg-green-500 animate-pulse' : 'bg-gray-300'"></div>
                                                <span class="text-[10px] font-bold uppercase" :class="sale.is_participate ? 'text-green-600' : 'text-gray-400'">
                                                    {{ sale.is_participate ? 'Đang tham gia' : 'Chưa tham gia' }}
                                                </span>
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
    </div>
</template>

<style scoped>
/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
}

/* Page Scrollbar */
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