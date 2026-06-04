<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { formatDate, formatPrice } from '../../utils/format';
import Loading from '../../components/Loading.vue';
import OrderDetailAdmin from './OrderDetailAdmin.vue';
import SideBarEmployee from '@/components/admin/Navbar.vue';
import { useOrderEmployeeStore } from '@/stores/order';

const order = useOrderEmployeeStore();

// --- Branch Selection Config ---
const branches = [
    { code: 'CT', label: 'Toàn Hệ Thống' },
    { code: 'HN', label: 'Chi Nhánh Hà Nội' },
    { code: 'DN', label: 'Chi Nhánh Đà Nẵng' },
    { code: 'HCM', label: 'Chi Nhánh TPHCM' }
];
const selectedBranch = ref<any>(branches[0] );
const showBranchDropdown = ref(false);

const selectBranch = (branch: typeof branches[0]) => {
    selectedBranch.value = branch;
    showBranchDropdown.value = false;
    // Reset về trang 1 khi đổi chi nhánh
    currentPage.value = 1;
};

// --- Tabs & State ---
const currentTab = ref<'online' | 'offline'>('online');
const showOrderDetail = ref(false);
const selectedOrderId = ref<number | null>(null);

// Search State
const toggle = ref(false);
const selectedType = ref('product_name');
const items = [
    { value: 'product_name', label: 'Tên' },
    { value: 'order_id', label: 'Mã' }
];

// --- Pagination State ---
const currentPage = ref(1);
const itemsPerPage = 5;

// --- Computed Props ---
const selectedLabel = computed(() => items.find(i => i.value === selectedType.value)?.label);
const placeholderText = computed(() => selectedType.value === 'order_id' ? 'Nhập mã đơn hàng' : 'Nhập tên sản phẩm');

const filteredAndPaginatedOrders = computed(() => {
    const list = order.filteredOrder || [];
    const startIndex = (currentPage.value - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return list.slice(startIndex, endIndex);
});

const totalPages = computed(() => Math.ceil((order.filteredOrder?.length || 0) / itemsPerPage));

// --- Status Map ---
const statusMap: Record<string, string> = {
    "pending": "Chờ xác nhận",
    "confirmed": "Chờ lấy hàng",
    "shipped": "Đang giao hàng",
    "completed": "Hoàn thành",
    "cancelled": "Đã hủy",
};

const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
        'pending': 'bg-blue-50 text-blue-600 border-blue-100',
        'confirmed': 'bg-yellow-50 text-yellow-600 border-yellow-100',
        'shipped': 'bg-purple-50 text-purple-600 border-purple-100',
        'completed': 'bg-green-50 text-green-600 border-green-100',
        'cancelled': 'bg-red-50 text-red-600 border-red-100',
    };
    return map[status] || 'bg-gray-50 text-gray-600';
};

// --- Methods ---
const fetchData = async () => {
    await order.getOrderOfTypeBranchStore(currentTab.value);
};

onMounted(async () => {
    await fetchData();
});

// Watch changes to fetch data
watch([currentTab, selectedBranch], async () => {
    currentPage.value = 1; // Reset page
    await fetchData();
});

const handleChangeTab = (tab: string) => {
    if (tab === 'online' || tab === 'offline') {
        currentTab.value = tab;
    }
};

const goToDetail = (id: number) => {
    selectedOrderId.value = id;
    showOrderDetail.value = true;
};

const selectItem = (item : any) => {
    selectedType.value = item.value;
    toggle.value = false;
};

const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
    }
};
</script>

<template>
    <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900">
         <Loading :loading="order.loading" />
        
        <OrderDetailAdmin 
            :showDetail="showOrderDetail" 
            :orderId="selectedOrderId"
            @close="showOrderDetail = false"
        />

        <div class="flex h-screen overflow-hidden">
            <SideBarEmployee />

            <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div class="flex-1 overflow-auto p-4 sm:p-8">
                    <div class="max-w-7xl mx-auto">
                        
                        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                            <div>
                                <h1 class="text-2xl font-black text-gray-900 uppercase tracking-tight">Quản lý đơn hàng (Admin)</h1>
                                <p class="text-sm text-gray-500">Giám sát đơn hàng toàn hệ thống và chi nhánh</p>
                            </div>

                            <div class="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                <div class="relative w-full sm:w-64 z-20">
                                    <div 
                                        class="bg-white border border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg cursor-pointer flex justify-between items-center shadow-sm hover:border-black transition-colors h-[42px]"
                                        @click="showBranchDropdown = !showBranchDropdown"
                                    >
                                        <div class="flex items-center gap-2 truncate">
                                            <i class="fa-solid fa-building-columns text-gray-400"></i>
                                            <span class="truncate">{{ selectedBranch.label }}</span>
                                        </div>
                                        <i class="fa-solid fa-chevron-down text-xs transition-transform" :class="{'rotate-180': showBranchDropdown}"></i>
                                    </div>
                                    
                                    <div 
                                        v-if="showBranchDropdown" 
                                        class="absolute top-full left-0 w-full bg-white border border-gray-100 shadow-xl rounded-lg mt-1 overflow-hidden animate-fade-in"
                                    >
                                        <div 
                                            v-for="branch in branches" 
                                            :key="branch.code"
                                            class="px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between group"
                                            @click="selectBranch(branch)"
                                        >
                                            <span :class="selectedBranch.code === branch.code ? 'font-bold text-black' : 'text-gray-600'">{{ branch.label }}</span>
                                            <i v-if="selectedBranch.code === branch.code" class="fa-solid fa-check text-green-500 text-xs"></i>
                                        </div>
                                    </div>
                                    <div v-if="showBranchDropdown" class="fixed inset-0 z-[-1]" @click="showBranchDropdown = false"></div>
                                </div>

                                <div class="flex bg-gray-100 p-1 rounded-lg h-[42px]">
                                    <button 
                                        @click="handleChangeTab('online')"
                                        class="px-6 rounded-md text-sm font-bold transition-all flex items-center justify-center h-full"
                                        :class="currentTab === 'online' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'"
                                    >
                                        Online
                                    </button>
                                    <button 
                                        @click="handleChangeTab('offline')"
                                        class="px-6 rounded-md text-sm font-bold transition-all flex items-center justify-center h-full"
                                        :class="currentTab === 'offline' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'"
                                    >
                                        Tại quầy
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                            <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                                
                                <div class="flex overflow-x-auto w-full md:w-auto scrollbar-hide gap-2 pb-2 md:pb-0">
                                    <button 
                                        v-for="status in ['Tất cả', 'Chờ xác nhận', 'Chờ lấy hàng', 'Đang giao hàng', 'Hoàn thành', 'Đã hủy']"
                                        :key="status"
                                        class="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all"
                                        :class="order.selectedStatus === status ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'"
                                        @click="() => { order.selectedStatus = status; currentPage = 1; }"
                                    >
                                        {{ status }}
                                    </button>
                                </div>

                                <div class="flex items-center gap-3 w-full md:w-auto">
                                    <div class="flex relative w-full md:w-64">
                                        <div class="w-[90px] relative cursor-pointer" @mouseenter="toggle = true" @mouseleave="toggle = false">
                                            <div class="h-full flex items-center px-3 bg-gray-50 border border-gray-200 rounded-l-lg text-xs font-bold text-gray-700 border-r-0 hover:bg-gray-100">
                                                {{ selectedLabel }} <i class="fa-solid fa-chevron-down ml-2 text-[10px]"></i>
                                            </div>
                                            <div v-if="toggle" class="absolute top-full left-0 w-32 bg-white border border-gray-200 shadow-lg rounded-lg z-20 overflow-hidden mt-0">
                                                <div 
                                                    v-for="item in items" :key="item.value"
                                                    class="px-4 py-2 text-xs hover:bg-gray-50 cursor-pointer"
                                                    @click="selectItem(item)"
                                                >
                                                    {{ item.label }}
                                                </div>
                                            </div>
                                        </div>
                                        <input 
                                            v-model="order.searchText" 
                                            type="text"
                                            :placeholder="placeholderText"
                                            class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-r-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                                        >
                                    </div>
                                    <button @click="order.searchText = ''" class="p-2.5 text-gray-400 hover:text-black transition-colors">
                                        <i class="fa-solid fa-rotate-right"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[400px]">
                            <div class="overflow-x-auto flex-1">
                                <table class="w-full text-sm text-left">
                                    <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th class="px-6 py-4 font-bold">Mã đơn</th>
                                            <th class="px-6 py-4 font-bold">Người đặt</th>
                                            <th class="px-6 py-4 font-bold text-right">Tổng đơn</th>
                                            <th v-if="currentTab === 'online'" class="px-6 py-4 font-bold">Người nhận</th>
                                            <th class="px-6 py-4 font-bold">Ngày tạo</th>
                                            <th class="px-6 py-4 font-bold text-center">Trạng thái</th>
                                            <th class="px-6 py-4 font-bold text-center">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-50">
                                        <tr v-if="filteredAndPaginatedOrders.length === 0">
                                            <td colspan="7" class="px-6 py-10 text-center text-gray-500">
                                                <div class="flex flex-col items-center justify-center">
                                                    <i class="fa-solid fa-box-open text-4xl text-gray-300 mb-3"></i>
                                                    <p>Không tìm thấy đơn hàng nào</p>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-for="(item, index) in filteredAndPaginatedOrders" :key="index" class="hover:bg-gray-50/50 transition-colors group">
                                            <td class="px-6 py-4 font-mono font-medium text-gray-900">#{{ item.id }}</td>
                                            <td class="px-6 py-4 font-bold text-gray-900">{{ item.user_name_buyer }}</td>
                                            <td class="px-6 py-4 text-right font-bold text-red-600">{{ formatPrice(item.total || 0) }}</td>
                                            
                                            <td v-if="currentTab === 'online'" class="px-6 py-4" >
                                                <div class="flex flex-col">
                                                    <span  class="font-bold text-gray-900">{{ item.address?.name }}</span>
                                                    <span class="text-gray-500 text-xs">{{ item.address?.phone }}</span>
                                                    <span class="text-gray-400 text-[10px] truncate max-w-[200px]">{{ item.address?.street_address }}</span>
                                                </div>
                                            </td>

                                            <td class="px-6 py-4 text-gray-500">{{ formatDate(item.created_at) }}</td>
                                            
                                            <td class="px-6 py-4 text-center">
                                                <span 
                                                    class="px-3 py-1 rounded-full text-[10px] font-bold uppercase border tracking-wide whitespace-nowrap"
                                                    :class="getStatusColor(item.status || 'pending')"
                                                >
                                                    {{ statusMap[item.status || ''] }} 
                                                </span>
                                            </td>
                                            
                                            <td class="px-6 py-4 text-center">
                                                <div class="flex items-center justify-center gap-2">
                                                    <button 
                                                        @click="goToDetail(item.id)"
                                                        class="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-black hover:text-white hover:border-black transition-colors flex items-center justify-center"
                                                        title="Xem chi tiết"
                                                    >
                                                        <i class="fa-solid fa-eye"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                                <p class="text-xs text-gray-500">
                                    Trang <span class="font-bold text-gray-900">{{ currentPage }}</span> / {{ totalPages }}
                                </p>
                                <div class="flex gap-2">
                                    <button 
                                        @click="changePage(currentPage - 1)" 
                                        :disabled="currentPage === 1"
                                        class="px-3 py-1 rounded border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                                    >
                                        <i class="fa-solid fa-chevron-left"></i>
                                    </button>
                                    <button 
                                        v-for="page in totalPages" 
                                        :key="page"
                                        @click="changePage(page)"
                                        class="w-7 h-7 rounded border text-xs font-bold transition-all flex items-center justify-center"
                                        :class="currentPage === page ? 'bg-black text-white border-black' : 'bg-white text-gray-600 hover:bg-gray-100'"
                                    >
                                        {{ page }}
                                    </button>
                                    <button 
                                        @click="changePage(currentPage + 1)" 
                                        :disabled="currentPage === totalPages"
                                        class="px-3 py-1 rounded border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                                    >
                                        <i class="fa-solid fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
    animation: fadeIn 0.15s ease-out forwards;
}
</style>