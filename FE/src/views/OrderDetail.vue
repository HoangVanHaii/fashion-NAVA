<script setup lang="ts">
import Notification from "@/components/Notification.vue";
import Loading from "../components/Loading.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { formatDateTime, formatPrice } from "../utils/format";
import { useOrderEmployeeStore } from "@/stores/order";
import { useAuthStore } from "@/stores/auth";
import type { GetOrder } from "../interfaces/order";

const auth = useAuthStore();
const props = defineProps<{
    showOrderDetail: boolean;
    orderId: number;
}>();

const emit = defineEmits(['close']);

const router = useRouter();
const order = useOrderEmployeeStore();

const loading = ref(false);
const showFormConfirm = ref(false);
const showNotification = ref<boolean>(false);
const textToast = ref<string>("");
const showReviewForm = ref(false);
const selectedOrderItem = ref<GetOrder | null>(null);
onMounted(async () => {
    await order.getOrderByIdStore(props.orderId);
})
// Fetch Data when Modal Opens
watch(() => props.showOrderDetail, async (newVal) => {
    if (newVal && props.orderId) {
        loading.value = true;
        
        alert(1);
        loading.value = false;
    }
});

const handleClose = () => {
    emit('close');
};

const handleCancelled = async () => {
    showFormConfirm.value = false;
    if (order.orderDetail?.id) {
        loading.value = true;
        await order.changeStatusStore(order.orderDetail?.id, 'cancelled');
        loading.value = false;
        
        if (order.error) {
            textToast.value = "Không thể hủy đơn hàng";
            showNotification.value = true; 
        } else {
            textToast.value = "Hủy đơn hàng thành công";
            showNotification.value = true;
            // Reload order details
            if (props.orderId) await order.getOrderByIdStore(props.orderId);
        }
    }
};

const handleReOrder = async (getOrder: GetOrder, shop_name: string) => {
    // const cartItems: CartItemDetail[] = getOrder.items.map((item) => ({
    //     cart_item_id: item.id ?? 0,
    //     size_id: item.size_id,
    //     name: item.product_name,
    //     quantity: item.quantity,
    //     price: item.price,
    //     price_after_reduction: item.flash_price,
    //     size: item.size,
    //     color: item.color,
    //     image_url: item.image_url,
    //     total_price: item.quantity * item.price,
    // }));

    // const totalShop = cartItems.reduce((sum, item) => sum + item.total_price, 0);

    // const shopCart: ShopCart = {
    //     shop_id: getOrder.shop_id,
    //     shop_name: shop_name ,
    //     carts: cartItems,
    //     total_shop: totalShop, 
    // };

    // const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // const carttpmp: Cart = {
    //     shops: [shopCart],
    //     total_quantity: totalQuantity,
    //     total_amount: totalShop,
    //     voucher_discount: getOrder.discount_value,
    // };
    // cart.cartPay = carttpmp;
    // router.push({ name: 'payment' });
}

const handleReview = (item: GetOrder) => {
    selectedOrderItem.value = item;
    showReviewForm.value = true;
};

const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        'pending': 'Chờ xác nhận',
        'confirmed': 'Chờ lấy hàng',
        'shipped': 'Đang giao hàng',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
    };
    return map[status] || status;
};

// Helper for stepper active state
const getStepStatus = (currentStatus: string, step: string) => {
    const steps = ['pending', 'confirmed', 'shipped', 'completed'];
    if (currentStatus === 'cancelled') return 'inactive';
    const currentIndex = steps.indexOf(currentStatus);
    const stepIndex = steps.indexOf(step);
    if (stepIndex < currentIndex) return 'completed'; 
    if (stepIndex === currentIndex) return 'active';
    return 'inactive'; 
};
</script>

<template>
    <teleport to="body">
        <div v-if="showOrderDetail" class="fixed inset-0 z-[9999] flex items-center justify-center p-4" @click="handleClose">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"></div>

            <div class="relative z-[10000]">
                 <Notification :text="textToast" :isSuccess="showNotification" />
                 <ConfirmDialog
                    v-if="showFormConfirm"
                    :message="'Xác nhận hủy đơn hàng?'"
                    @close="showFormConfirm = false"
                    @confirm="handleCancelled"
                />
            </div>

            <!-- Modal Content -->
            <div 
                class="relative w-full max-w-5xl bg-[#FAFAFA] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in" 
                @click.stop
            >
                <Loading :loading="loading" />

                <!-- Modal Header -->
                <div class="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h3 class="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-3">
                            Chi tiết đơn hàng <span v-if="order.orderDetail">#{{ order.orderDetail.id }}</span>
                        </h3>
                        <p class="text-xs text-gray-500 mt-1" v-if="order.orderDetail">{{ formatDateTime(order.orderDetail.created_at) }}</p>
                    </div>
                    <button @click="handleClose" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-600">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <!-- Modal Body (Scrollable) -->
                <div class="flex-1 overflow-y-auto p-6 custom-scrollbar" v-if="order.orderDetail">
                    
                    <!-- 1. Stepper -->
                    <div v-if="order.orderDetail.status !== 'cancelled'" class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 overflow-x-auto">
                        <div class="relative flex justify-between items-center w-full min-w-[500px]">
                            <!-- Progress Line -->
                            <div class="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 z-0"></div>
                            
                            <!-- Steps -->
                            <div class="relative z-10 flex flex-col items-center bg-white px-2">
                                <div class="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                                     :class="getStepStatus(order.orderDetail.status || 'pending', 'pending') !== 'inactive' ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-300'">
                                    <i class="fa-regular fa-file-lines"></i>
                                </div>
                                <span class="absolute top-12 text-[10px] font-bold uppercase tracking-wide text-center">Đã đặt hàng</span>
                            </div>
                            <div class="relative z-10 flex flex-col items-center bg-white px-2">
                                <div class="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                                     :class="getStepStatus(order.orderDetail.status || 'confirmed', 'confirmed') !== 'inactive' ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-300'">
                                    <i class="fa-solid fa-box-open"></i>
                                </div>
                                <span class="absolute top-12 text-[10px] font-bold uppercase tracking-wide text-center">Đã xác nhận</span>
                            </div>
                            <div class="relative z-10 flex flex-col items-center bg-white px-2">
                                <div class="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                                     :class="getStepStatus(order.orderDetail.status || 'shipped', 'shipped') !== 'inactive' ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-300'">
                                    <i class="fa-solid fa-truck-fast"></i>
                                </div>
                                <span class="absolute top-12 text-[10px] font-bold uppercase tracking-wide text-center">Đang giao</span>
                            </div>
                            <div class="relative z-10 flex flex-col items-center bg-white px-2">
                                <div class="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                                     :class="order.orderDetail.status === 'completed' ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-300'">
                                    <i class="fa-solid fa-star"></i>
                                </div>
                                <span class="absolute top-12 text-[10px] font-bold uppercase tracking-wide text-center">Hoàn thành</span>
                            </div>
                        </div>
                        <div class="h-8"></div>
                    </div>

                    <!-- 2. Address & Info -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <i class="fa-solid fa-location-dot text-red-500"></i> Địa chỉ nhận hàng
                            </h4>
                            <p class="font-bold text-gray-900">{{ order.orderDetail.address.name }}</p>
                            <p class="text-sm text-gray-500 mb-1">{{ order.orderDetail.address.phone }}</p>
                            <p class="text-xs text-gray-600 border-t border-dashed border-gray-100 pt-2 mt-1">{{ order.orderDetail.address.street_address }}</p>
                        </div>
                        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                             <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <i class="fa-solid fa-credit-card text-blue-500"></i> Thanh toán
                            </h4>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-500">Phương thức:</span>
                                    <span class="font-bold">{{ order.orderDetail.payment_method === 'cod' ? 'COD' : 'VNPAY' }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-500">Trạng thái đơn:</span>
                                    <span class="font-bold uppercase" :class="order.orderDetail.status === 'cancelled' ? 'text-red-600' : 'text-green-600'">{{ getStatusLabel(order.orderDetail.status || 'pending') }}</span>
                                </div>
                                <div class="flex justify-between" v-if="order.orderDetail.note">
                                    <span class="text-gray-500">Note: </span>
                                    <span class="font-bold">{{ order.orderDetail.note }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 3. Product List -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                        <div class="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div class="flex items-center gap-2 font-bold text-sm text-gray-900">
                                <i class="fa-solid fa-store text-gray-400"></i>Nava - {{ auth.user?.branch }}
                            </div>
                        </div>
                        <div class="divide-y divide-gray-50">
                            <div v-for="item in order.orderDetail.items" class="p-4 flex gap-4 items-center">
                                <div class="w-16 h-16 bg-gray-100 rounded-md border border-gray-200 overflow-hidden flex-shrink-0 cursor-pointer" @click="router.push({ name: 'product-detail', params: { id: item.product_id_sql } })">
                                    <img :src="item.image" class="w-full h-full object-cover" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h5 class="text-sm font-bold text-gray-900 line-clamp-1 cursor-pointer hover:text-blue-600" @click="router.push({ name: 'product-detail', params: { id: item.product_id_sql } })">{{ item.product_name }}</h5>
                                    <div class="text-xs text-gray-500 mt-1">
                                        {{ item.color }}, {{ item.size }} <span class="mx-1">|</span> x{{ item.quantity }}
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm font-bold text-black">{{ formatPrice(item.flash_sale_price || item.price) }}</p>
                                    <button 
                                        v-if="order.orderDetail.status === 'completed'" 
                                        @click="handleReview(order.orderDetail)"
                                        class="mt-2 text-[10px] font-bold border border-gray-300 rounded px-2 py-1 hover:bg-black hover:text-white transition-colors"
                                    >
                                        Đánh giá
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 4. Summary -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div class="space-y-2 text-sm pb-4 border-b border-dashed border-gray-200">
                            <div class="flex justify-between">
                                <span class="text-gray-500">Tổng tiền hàng</span>
                                <span class="font-medium">{{ formatPrice((order.orderDetail.total || 0)) }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-500">Phí vận chuyển</span>
                                <span class="font-medium">0đ</span>
                            </div>
                            <div class="flex justify-between" >
                                <span class="text-gray-500">Voucher</span>
                                <span class="text-red-500 font-bold">-{{ formatPrice(order.orderDetail.discount_value) }}</span>
                            </div>
                        </div>
                        <div class="flex justify-between items-center pt-4">
                            <span class="text-base font-bold text-gray-900">Thành tiền</span>
                            <span class="text-xl font-black text-red-600">{{ formatPrice(order.orderDetail.total) }}</span>
                        </div>
                    </div>

                </div>

                <!-- Footer Actions -->
                <div class="p-4 bg-white border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 z-10" v-if="order.orderDetail">
                    <button 
                        @click="handleClose" 
                        class="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Đóng
                    </button>
                    
                    <button 
                        v-if="order.orderDetail.status === 'pending'" 
                        @click="showFormConfirm = true"
                        class="px-6 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
                    >
                        Hủy đơn hàng
                    </button>

                    <button 
                        v-if="order.orderDetail.status === 'completed' || order.orderDetail.status === 'cancelled'" 
                        @click="handleReOrder(order.orderDetail,'')"
                        class="px-8 py-2.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors shadow-lg"
                    >
                        Mua lại
                    </button>
                </div>
            </div>
            
            <!-- Review Popup inside Modal -->
            <ReviewPopup 
                v-if="showReviewForm && selectedOrderItem" 
                :orderItem="selectedOrderItem" 
                @close="showReviewForm = false" 
            />
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