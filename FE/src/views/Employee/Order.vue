<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

import { formatDate, formatPrice } from '../../utils/format';
import Loading from '../../components/Loading.vue';
// import { useAuthStore } from '../../stores/authStore';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import Notification from '@/components/Notification.vue';
import OrderDetailView from './OrderDetailView.vue';
import SideBarEmployee from '@/components/Employee/SideBarEmployee.vue';
import CreateOrder from './CreateOrder.vue';
import { useOrderEmployeeStore } from '@/stores/order';
const order = useOrderEmployeeStore();

// State for Tabs
const currentTab = ref<'online' | 'offline'>('online');

// State for Order Detail Modal
const showOrderDetail = ref(false);
const selectedOrderId = ref<string | null>(null);

const toggle = ref(false)
const selectedType = ref('order_id')
// const listNameUser = ref<string[]>([]);
const showFormConfirm = ref<boolean>(false);
const orderAction = ref<string | null>(null)
const messageAction = ref<string>("Xác nhận hành động này");
const statusAction = ref<string>('pending');
const showNotification = ref<boolean>(false);
const texNotification = ref<string>('');
// State for Create Order Modal
const showCreateOrderModal = ref(false);

const handleOrderCreated = () => {
    // console.log(1)
    // alert(11);
    showCreateOrderModal.value = true; // Mở Modal
}
onMounted(async () => {
    await order.getOrderOfBranchStore('online');
    // console.log(order.filteredOrder)
})

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
}

const items = [
    { value: 'product_name', label: 'Tên' },
    { value: 'order_id', label: 'Mã' }
]

const selectedLabel = computed(() =>
     items.find(i => i.value === selectedType.value)?.label
)

const placeholderText = computed(() => {
    if (selectedType.value === 'order_id') return 'Nhập mã đơn hàng';
    if (selectedType.value === 'product_name') return 'Nhập tên sản phẩm';
    return '';
})

const typeInput = computed(() => {
    return selectedType.value === 'order_id' ? 'number' : 'text';
})

const selectItem = (item : any) => {
    selectedType.value = item.value
    toggle.value = false
}

// const handleRefresh = () => {
//     router.go(0);
// };

// Hàm mở Modal chi tiết đơn hàng
const goToDetail = (id: string) => {
    // alert(1);
    selectedOrderId.value = id;
    showOrderDetail.value = true;

    // alert(selectedOrderId.value);
}

const handleAction = async () => {
    showFormConfirm.value = false;
    texNotification.value = '';

    if (statusAction.value == 'pending') {
        await order.changeStatusStore(orderAction.value!, statusAction.value);
        if (order.success) texNotification.value = 'Hủy thành công đơn hàng!';
        else texNotification.value = 'Không thể hủy đơn hàng!';
    } else if (statusAction.value == 'confirmed') {
        await order.changeStatusStore(orderAction.value!, statusAction.value);
        if (order.success) texNotification.value = 'Xác nhận thành công đơn hàng!';
        else texNotification.value = 'Không thể xác nhận đơn hàng!';
    } else if (statusAction.value == 'shipped') {
        await order.changeStatusStore(orderAction.value!, statusAction.value);
        if (order.success) texNotification.value = 'Giao hàng thành công!';
        else texNotification.value = 'Chưa thể giao đơn hàng!';
    } else if (statusAction.value == 'completed') {
        await order.changeStatusStore(orderAction.value!, statusAction.value);
        if (order.success) texNotification.value = 'Hoàn thành đơn hàng thành công';
        else texNotification.value = 'Chưa thể hoàn thành đơn hàng!';
    }
    showNotification.value = true;
    // Refresh list data
    await order.getOrderOfBranchStore(currentTab.value);
}

const groupData = (order_id: string, status: string) => {
    orderAction.value = order_id;
    statusAction.value = status;
    if (status == 'pending') {
        messageAction.value = 'Xác nhận đơn hàng này?'
        statusAction.value = 'confirmed'
    } else if (status == 'confirmed') {
        messageAction.value = 'Tiến hành giao cho đơn vị vận chuyển?'
        statusAction.value = 'shipped';
    } else if (status == 'shipped') {
        messageAction.value = 'Xác nhận hoàn thành thành đơn?'
        statusAction.value = 'completed';
    }
    showFormConfirm.value = true;
}

const goToCancel = (order_id: string, status: string) => {
    showFormConfirm.value = true;
    orderAction.value = order_id;
    statusAction.value = status;
    messageAction.value = 'Xác nhận hủy đơn hàng này?'
}
const handleChangeTab = async (tab: string) => {
    if (tab != 'online' && tab != 'offline') return;
    currentTab.value = tab;
    // alert(currentTab.value);
    await order.getOrderOfBranchStore(currentTab.value)
}
const handleClose = async () => {
    showCreateOrderModal.value = false
    await order.getOrderOfBranchStore(currentTab.value)
}
</script>

<template>
    <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900">
         <Loading :loading="order.loading" />
        <ConfirmDialog 
            v-if="showFormConfirm && orderAction"
            :message="messageAction"
            @close="showFormConfirm = false"
            @confirm="handleAction"
        />
       <Notification :text="texNotification" :isSuccess="showNotification"/>
        
        <!-- Detail Modal -->
        <OrderDetailView 
            :showDetail="showOrderDetail" 
            :orderId="selectedOrderId"
            @close="showOrderDetail = false"
            @update="handleAction"
        />
        <CreateOrder 
            :show="showCreateOrderModal"
            @close="handleClose"
            @create=""
        />
        <div class="flex h-screen overflow-hidden">
            <!-- Sidebar -->
            <!-- <Navbar 
                class="w-64 flex-shrink-0 border-r border-gray-200 bg-white h-full overflow-y-auto"
                :isShow='false'
                :showManagermentOrder='true'
                :showAllOrder='true'
            /> -->
            <SideBarEmployee />

            <!-- Main Content -->
            <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
                <!-- <Header class="border-b border-gray-200 bg-white" /> -->
                
                <div class="flex-1 overflow-auto p-4 sm:p-8">
                    <div class="max-w-7xl mx-auto">
                        
                        <!-- Page Header & Tabs -->
                        <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                            <div>
                                <h1 class="text-2xl font-black text-gray-900 uppercase tracking-tight">Quản lý đơn hàng</h1>
                                <p class="text-sm text-gray-500">Theo dõi và xử lý đơn hàng của Shop</p>
                            </div>
                            
                            <!-- Tab Switcher -->
                            <div class="flex bg-gray-100 p-1 rounded-lg">
                                <button 
                                    @click="handleChangeTab('online')"
                                    class="px-6 py-2 rounded-md text-sm font-bold transition-all"
                                    :class="currentTab === 'online' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'"
                                >
                                    Online
                                </button>
                                <button 
                                    @click="handleChangeTab('offline')"
                                    class="px-6 py-2 rounded-md text-sm font-bold transition-all"
                                    :class="currentTab === 'offline' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'"
                                >
                                    Tại quầy
                                </button>
                            </div>
                        </div>

                        <!-- Filter & Search Bar (Shared) -->
                        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                            <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                                
                                <!-- Status Filters -->
                                <div class="flex overflow-x-auto w-full md:w-auto scrollbar-hide gap-2 pb-2 md:pb-0">
                                    <button 
                                        v-for="status in ['Tất cả', 'Chờ xác nhận', 'Chờ lấy hàng', 'Đang giao hàng', 'Hoàn thành', 'Đã hủy']"
                                        :key="status"
                                        class="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all"
                                        :class="order.selectedStatus === status ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'"
                                        @click="order.selectedStatus = status"
                                    >
                                        {{ status }}
                                    </button>
                                </div>

                                <!-- Actions Right -->
                                <div class="flex items-center gap-3 w-full md:w-auto">
                                    <!-- Search -->
                                    <div class="flex relative w-full md:w-64">
                                        <div class="w-[90px] relative cursor-pointer" @mouseenter="toggle = true" @mouseleave="toggle = false">
                                            <div class="h-full flex items-center px-3 bg-gray-50 border border-gray-200 rounded-l-lg text-xs font-bold text-gray-700 border-r-0 hover:bg-gray-100">
                                                {{ selectedLabel }} <i class="fa-solid fa-chevron-down ml-2 text-[10px]"></i>
                                            </div>
                                            <div v-if="toggle" class="absolute top-full left-0 w-320 bg-white border border-gray-200 shadow-lg rounded-lg z-20 overflow-hidden mt-0">
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

                                    <!-- Create Order Button (Only in Offline) -->
                                    <button 
                                        v-if="currentTab === 'offline'"
                                        @click="handleOrderCreated"
                                        class="px-4 py-2.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <i class="fa-solid fa-plus"></i> Tạo đơn
                                    </button>

                                    <button @click="order.searchText = ''" class="p-2.5 text-gray-400 hover:text-black transition-colors">
                                        <i class="fa-solid fa-rotate-right"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Order List Table -->
                        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm text-left">
                                    <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th class="px-6 py-4 font-bold">Mã đơn</th>
                                            <th class="px-6 py-4 font-bold">Người đặt</th>
                                            <th class="px-6 py-4 font-bold text-right">Tổng đơn</th>
                                            <!-- Hide in Offline Mode -->
                                            <th v-if="currentTab === 'online'" class="px-6 py-4 font-bold">Người nhận</th>
                                            <th class="px-6 py-4 font-bold">Ngày tạo</th>
                                            <th class="px-6 py-4 font-bold text-center">Trạng thái</th>
                                            <th class="px-6 py-4 font-bold text-center">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-50">
                                        <tr v-if="order.filteredOrder.length === 0">
                                            <td colspan="7" class="px-6 py-10 text-center text-gray-500">
                                                <div class="flex flex-col items-center justify-center">
                                                    <i class="fa-solid fa-box-open text-4xl text-gray-300 mb-3"></i>
                                                    <p>Không tìm thấy đơn hàng nào</p>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-for="(item, index) in order.filteredOrder" :key="index" class="hover:bg-gray-50/50 transition-colors group">
                                            <td class="px-6 py-4 font-mono font-medium text-gray-900">#{{ item.id }}</td>
                                            <td class="px-6 py-4 font-bold text-gray-900">{{ item.user_name_buyer }}</td>
                                            <td class="px-6 py-4 text-right font-bold text-red-600">{{ formatPrice(item.total || 0) }}</td>
                                            
                                            <!-- Hide in Offline Mode -->
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
                                                        v-if="item.status != 'cancelled' && item.status != 'completed'"
                                                        @click="groupData(item.id, item.status || '')"
                                                        class="w-8 h-8 rounded-lg border border-gray-200 text-green-600 hover:bg-green-50 hover:border-green-200 transition-colors flex items-center justify-center"
                                                        title="Xác nhận / Chuyển trạng thái"
                                                    >
                                                        <i class="fa-solid fa-check"></i>
                                                    </button>
                                                    
                                                    <button 
                                                        v-if="item.status == 'pending'"
                                                        @click="goToCancel(item.id, item.status)"
                                                        class="w-8 h-8 rounded-lg border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center"
                                                        title="Hủy đơn"
                                                    >
                                                        <i class="fa-solid fa-xmark"></i>
                                                    </button>
                                                    
                                                    <!-- Detail Button -->
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
</style>