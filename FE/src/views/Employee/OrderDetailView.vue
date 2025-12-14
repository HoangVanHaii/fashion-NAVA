<script setup lang="ts">
import { ref, watch } from 'vue';
import { formatDate, formatPrice } from '../../utils/format';
import Loading from '../../components/Loading.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import Notification from '@/components/Notification.vue';
import { useOrderEmployeeStore } from '@/stores/order';

const props = defineProps<{
    showDetail: boolean;
    orderId: string  | null;
}>();

const emit = defineEmits(['close', 'update']);

const orderStore = useOrderEmployeeStore();
const loading = ref(false);
const showConfirm = ref(false);
const confirmMessage = ref("");
const actionType = ref("");
const showNotify = ref(false);
const notifyText = ref("");

// Status Config
const statusMap: Record<string, string> = {
    "pending": "Chờ xác nhận",
    "confirmed": "Chờ lấy hàng",
    "shipped": "Đang giao hàng",
    "completed": "Hoàn thành",
    "cancelled": "Đã hủy",
};

const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
        'pending': 'bg-blue-50 text-blue-600 border-blue-200',
        'confirmed': 'bg-yellow-50 text-yellow-600 border-yellow-200',
        'shipped': 'bg-purple-50 text-purple-600 border-purple-200',
        'completed': 'bg-green-50 text-green-600 border-green-200',
        'cancelled': 'bg-red-50 text-red-600 border-red-200',
    };
    return map[status] || 'bg-gray-50 text-gray-600';
};

const loadOrderDetail = async () => {
        // alert("sdd" + props.orderId)
    // console.log()
    if (!props.orderId) return;
    loading.value = true;
    
    await orderStore.getOrderByIdStore(props.orderId);

    loading.value = false;
};

// Watch for changes to open/load data
watch(() => props.showDetail,async (newVal) => {
    if (newVal && props.orderId) {
        await loadOrderDetail();
    }
});

const handleClose = () => {
    emit('close');
};

// Actions
const confirmAction = (action: string) => {
    actionType.value = action;
    if (action === 'confirmed') confirmMessage.value = "Xác nhận đơn hàng này?";
    if (action === 'shipped') confirmMessage.value = "Xác nhận giao cho vận chuyển?";
    if (action === 'cancelled') confirmMessage.value = "Hủy đơn hàng này?";
    if (action === 'completed') confirmMessage.value = "Hoàn thành đơn hàng này?";

    showConfirm.value = true;
};

const handleProcessOrder = async () => {
    showConfirm.value = false;
    if(!props.orderId) return;
    
    loading.value = true;
    const id = props.orderId;

    try {
        await orderStore.changeStatusStore(id, actionType.value);
        if (orderStore.success) {
            notifyText.value = "Thao tác thành công!";
            showNotify.value = true;
            
            // Update local state immediately for UI
            if (orderStore.orderDetail) {
                if (actionType.value === 'confirmed') {
                    orderStore.orderDetail.status = 'confirmed';
                    setTimeout(() => {
                        notifyText.value = "Đơn hàng đã được xác nhận thành công.";
                    }, 0);
                } 
                
                if (actionType.value === 'shipped') {
                    orderStore.orderDetail.status = 'shipped';
                    setTimeout(() => {
                        notifyText.value = "Đơn hàng đã được giao cho đơn vị vận chuyển.";
                    }, 0);
                } 
                
                if (actionType.value === 'cancelled') {
                    orderStore.orderDetail.status = 'cancelled';
                    setTimeout(() => {
                        notifyText.value = "Đơn hàng đã được hủy thành công.";
                    }, 0);
                } 
                
                if (actionType.value === 'completed') {
                    orderStore.orderDetail.status = 'completed';
                    setTimeout(() => {
                        notifyText.value = "Đơn hàng đã được hoàn tất thành công.";
                    }, 0);
                }
            }
            // Emit event to parent to refresh list if needed
            emit('update'); 
        } else {
            notifyText.value = "Có lỗi xảy ra!";
            showNotify.value = true;
        }
    } catch (e) {
        notifyText.value = "Lỗi kết nối!";
        showNotify.value = true;
    } finally {
        loading.value = false;
    }
};
const mapStatusPayment: { [key: string]: string } = {
    'pending': 'Chưa thanh toán',
    'success': 'Đã thanh toán',
    'failed': 'Thanh toán thất bại'
}
</script>

<template>
    <teleport to="body">
        <div v-if="showDetail" class="fixed inset-0 z-[9999] flex items-center justify-center p-4" @click="handleClose">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

            <!-- Notification & Confirm Dialog (Local scope or Global) -->
            <div class="relative z-[10000]">
                 <Notification :text="notifyText" :isSuccess="showNotify" />
                 <ConfirmDialog 
                    v-if="showConfirm" 
                    :message="confirmMessage" 
                    @close="showConfirm = false" 
                    @confirm="handleProcessOrder" 
                />
            </div>

            <!-- Modal Content -->
            <div 
                class="relative w-full max-w-6xl bg-[#FAFAFA] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in" 
                @click.stop
            >
                <Loading :loading="loading" />

                <!-- Modal Header -->
                <div class="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center">
                    <h3 class="text-lg font-black text-gray-900 uppercase tracking-wide">
                        Chi tiết đơn hàng <span v-if="orderStore.orderDetail">#{{ orderStore.orderDetail.id }}</span>
                    </h3>
                    <button @click="handleClose" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-600">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <!-- Modal Body (Scrollable) -->
                <div class="flex-1 overflow-y-auto p-6 custom-scrollbar" v-if="orderStore.orderDetail">
                     <div class="flex flex-col lg:flex-row gap-6 items-start">
                        
                        <!-- LEFT COLUMN -->
                        <div class="flex-1 w-full space-y-6">
                            <!-- Products List -->
                            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div class="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                    <h4 class="font-bold text-gray-800 text-sm flex items-center gap-2">
                                        <i class="fa-solid fa-box text-gray-400"></i> Danh sách sản phẩm
                                    </h4>
                                    <span class="text-xs font-bold text-gray-500">{{ orderStore.orderDetail.items?.length || 0 }} món</span>
                                </div>
                                <div class="divide-y divide-gray-50">
                                    <div v-for="item in orderStore.orderDetail.items" class="p-4 flex gap-4 items-center">
                                        <div class="w-14 h-14 bg-gray-100 rounded-md border border-gray-200 overflow-hidden flex-shrink-0">
                                            <img :src="item.image" class="w-full h-full object-cover" />
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <h5 class="text-sm font-bold text-gray-900 line-clamp-1">{{ item.product_name }}</h5>
                                            <div class="flex gap-2 mt-1 text-[11px] text-gray-500">
                                                <span class="bg-gray-100 px-1.5 py-0.5 rounded">Màu: {{ item.color }}</span>
                                                <span class="bg-gray-100 px-1.5 py-0.5 rounded">Size: {{ item.size }}</span>
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-sm font-bold text-black">{{ formatPrice(item.flash_sale_price || item.price) }}</p>
                                            <p class="text-xs text-gray-500">x{{ item.quantity }}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Customer Info -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <i class="fa-solid fa-location-dot text-black"></i> Người nhận
                                    </h4>
                                    <div class="space-y-1">
                                        <p class="text-sm font-bold text-gray-900">{{ orderStore.orderDetail.address?.name }}</p>
                                        <p class="text-xs text-blue-600 font-bold">{{ orderStore.orderDetail.address?.phone }}</p>
                                        <p class="text-xs text-gray-600 mt-2 leading-relaxed border-t border-dashed border-gray-200 pt-2">
                                            {{ orderStore.orderDetail.address?.street_address }}
                                        </p>
                                    </div>
                                </div>

                                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
                                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <i class="fa-solid fa-note-sticky text-black"></i> Ghi chú & TT
                                    </h4>
                                    <div class="flex-1 space-y-3">
                                        <div>
                                            <p class="text-xs text-gray-900 italic bg-gray-50 p-2 rounded border border-gray-100">
                                                "{{ orderStore.orderDetail.note || 'Không có ghi chú' }}"
                                            </p>
                                        </div>
                                        <div class="flex items-center justify-between pt-2 border-t border-gray-100">
                                            <span class="text-xs text-gray-500">Phương thức:</span>
                                            <span class="text-xs font-bold text-gray-900 uppercase">{{ orderStore.orderDetail.payment_method }}</span>
                                        </div>
                                        <div class="flex items-center justify-between pt-2 border-t border-gray-100">
                                            <span class="text-xs text-gray-500">Trạng thái thanh toán:</span>
                                            <span class="text-xs font-bold text-gray-900 uppercase">{{ mapStatusPayment[orderStore.orderDetail.payment_status || 'success'] }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- RIGHT COLUMN -->
                        <div class="w-full lg:w-[300px] flex-shrink-0 space-y-6">
                             <!-- Status Card -->
                            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                                <h4 class="text-sm font-bold text-gray-900 mb-4">Trạng thái</h4>
                                <div class="flex items-center justify-between mb-4">
                                    <span 
                                        class="px-3 py-1 rounded-full text-[10px] font-bold uppercase border tracking-wide"
                                        :class="getStatusColor(orderStore.orderDetail.status || '')"
                                    >
                                        {{ statusMap[orderStore.orderDetail.status || ""] }}
                                    </span>
                                    <span class="text-[10px] text-gray-400">{{ formatDate(orderStore.orderDetail.created_at) }}</span>
                                </div>

                                <!-- Action Buttons -->
                                <div class="space-y-2">
                                    <button 
                                        v-if="orderStore.orderDetail.status === 'pending'"
                                        @click="confirmAction('confirmed')"
                                        class="w-full py-2.5 bg-black text-white rounded-lg font-bold text-xs hover:bg-gray-800 transition-all shadow-sm active:scale-95"
                                    >
                                        Xác nhận đơn hàng
                                    </button>
                                    
                                    <button 
                                        v-if="orderStore.orderDetail.status === 'confirmed'"
                                        @click="confirmAction('shipped')"
                                        class="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                                    >
                                        Giao cho vận chuyển
                                    </button>
                                    <button 
                                        v-if="orderStore.orderDetail.status === 'shipped'"
                                        @click="confirmAction('completed')"
                                        class="w-full py-2.5 bg-red-500 text-white rounded-lg font-bold text-xs hover:bg-red-600 transition-all shadow-sm active:scale-95"
                                    >
                                        Hoàn thành đơn hàng
                                    </button>
                                    <button 
                                        v-if="orderStore.orderDetail.status === 'pending' || orderStore.orderDetail.status === 'confirmed'"
                                        @click="confirmAction('cancelled')"
                                        class="w-full py-2.5 bg-white text-red-600 border border-red-200 rounded-lg font-bold text-xs hover:bg-red-50 transition-all"
                                    >
                                        Hủy đơn hàng
                                    </button>
                                </div>
                            </div>

                            <!-- Payment Summary -->
                            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                                <h4 class="text-sm font-bold text-gray-900 mb-3">Thanh toán</h4>
                                <div class="space-y-2 text-xs pb-3 border-b border-dashed border-gray-200">
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">Tổng tiền hàng</span>
                                        <span class="font-medium">{{ formatPrice(orderStore.orderDetail.total ) }}</span>
                                    </div>
                                    <!-- <div class="flex justify-between" v-if="orderStore.orderDetail.discount_value">
                                        <span class="text-gray-500">Voucher</span>
                                        <span class="text-red-500 font-bold">-{{ formatPrice(orderStore.orderDetail.discount_value) }}</span>
                                    </div> -->
                                </div>
                                <div class="flex justify-between items-center pt-3">
                                    <span class="text-sm font-bold text-gray-900">Tổng cộng</span>
                                    <span class="text-lg font-black text-red-600">{{ formatPrice(orderStore.orderDetail.total) }}</span>
                                </div>
                            </div>
                        </div>
                     </div>
                </div>
                
                <div v-else-if="!loading" class="flex-1 flex flex-col items-center justify-center h-64 text-gray-400">
                     <i class="fa-solid fa-file-circle-xmark text-4xl mb-2"></i>
                     <p>Không tìm thấy thông tin đơn hàng</p>
                </div>
            </div>
        </div>
    </teleport>
</template>

<style scoped>
.animate-scale-in {
    animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

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
</style>