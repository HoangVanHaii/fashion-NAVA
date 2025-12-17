<template>
  <div class="bg-gray-50 min-h-screen pt-28 pb-20">
    <Loading :loading="isLoading" />
    <Notification :isSuccess="isNotification" :text="toastText" />

    <VoucherModal 
        v-if="showVoucherModal" 
        :cartTotal="totalMerchandise" 
        @close="showVoucherModal = false" 
        @apply="handleApplyVoucher" 
    />

    <AddressSelectorModal 
        v-if="showAddressModal"
        :selectedId="selectedAddress?.id"
        @close="showAddressModal = false"
        @select="handleSelectAddress"
    />

    <main class="max-w-[1200px] mx-auto px-6">
      <div class="mb-6 text-sm text-gray-400">
        <span class="cursor-pointer hover:text-black" @click="router.push('/cart')">Giỏ hàng</span>
        <span class="mx-2">/</span>
        <span class="text-black font-semibold">Thanh toán</span>
      </div>

      <div class="grid lg:grid-cols-[1fr_380px] gap-8">
        <div class="space-y-6">
          
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
             <div class="absolute top-0 left-0 w-full h-1.5 bg-[repeating-linear-gradient(45deg,#3B82F6,#3B82F6_15px,#fff_15px,#fff_30px,#EF4444_30px,#EF4444_45px,#fff_45px,#fff_60px)]"></div>
             
             <div class="flex justify-between items-start mb-4">
                <h3 class="font-bold text-gray-900 flex items-center gap-2 uppercase text-sm tracking-wide">
                    <i class="fa-solid fa-location-dot text-red-500 text-lg"></i> Địa chỉ nhận hàng
                </h3>
                <button @click="showAddressModal = true" class="text-xs text-blue-600 font-bold hover:underline bg-blue-50 px-3 py-1.5 rounded-full transition-colors hover:bg-blue-100">
                    {{ selectedAddress ? 'Thay đổi' : 'Thêm địa chỉ' }}
                </button>
             </div>

             <div class="pl-7">
                 <template v-if="selectedAddress">
                    <p class="font-bold text-gray-900 text-base mb-1">
                        {{ selectedAddress.name }} 
                        <span class="font-normal text-gray-400 mx-2">|</span> 
                        <span class="text-gray-600">{{ selectedAddress.phone }}</span>
                    </p>
                    <p class="text-sm text-gray-500 leading-relaxed">
                        {{ formatFullAddress(selectedAddress) }}
                    </p>
                 </template>
                 <template v-else>
                    <div @click="showAddressModal = true" class="cursor-pointer flex items-center gap-2 text-red-500 italic text-sm hover:underline">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        Vui lòng chọn địa chỉ giao hàng (*)
                    </div>
                 </template>
             </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                 <h3 class="font-bold text-gray-900 text-sm uppercase tracking-wide">Sản phẩm</h3>
                 <span class="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-md shadow-sm">{{ checkoutItems.length }} món</span>
             </div>

             <div class="divide-y divide-gray-50">
                 <div v-for="item in checkoutItems" :key="item._id" class="p-5 flex gap-5 hover:bg-gray-50 transition-colors group">
                     <div class="relative w-24 h-24 flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden bg-white">
                         <img :src="getImage(item.variant?.color?.image_main)" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                         <div class="absolute bottom-0 right-0 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-tl-lg">
                            x{{ item.quantity }}
                         </div>
                     </div>
                     <div class="flex-1 min-w-0 flex flex-col justify-center">
                         <h4 class="text-sm font-bold text-gray-900 line-clamp-2 mb-2 leading-snug group-hover:text-blue-600 transition-colors">
                            {{ item.name }}
                         </h4>
                         <div class="flex flex-wrap gap-2 mb-2">
                             <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 border border-gray-200 text-xs font-medium text-gray-600">
                                <span class="w-2 h-2 rounded-full bg-gray-400"></span> {{ item.variant?.color?.color }}
                             </div>
                             <div class="inline-flex items-center px-2.5 py-1 rounded bg-gray-100 border border-gray-200 text-xs font-medium text-gray-600">
                                Size: {{ item.variant?.size?.size }}
                             </div>
                         </div>
                     </div>
                     <div class="text-right flex flex-col justify-center min-w-[100px]">
                         <span class="font-bold text-base text-gray-900 block">{{ formatPrice(item.price * item.quantity) }}</span>
                         <span v-if="item.quantity > 1" class="text-xs text-gray-400 mt-1">{{ formatPrice(item.price) }} / cái</span>
                     </div>
                 </div>
             </div>
             
             <div class="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 text-sm">
                <span class="text-gray-500">Tổng tiền hàng:</span>
                <span class="font-bold text-red-600">{{ formatPrice(totalMerchandise) }}</span>
             </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 class="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Phương thức thanh toán</h3>
              <div class="grid gap-3">
                  <label v-for="method in paymentMethods" :key="method.id" 
                         class="relative flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 group"
                         :class="selectedPayment === method.id ? 'border-black bg-gray-50 ring-1 ring-black shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'">
                      <input type="radio" :value="method.id" v-model="selectedPayment" class="hidden" />
                      <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                           :class="selectedPayment === method.id ? 'border-black' : 'border-gray-300 group-hover:border-gray-400'">
                          <div class="w-2.5 h-2.5 rounded-full bg-black transform transition-transform duration-200"
                               :class="selectedPayment === method.id ? 'scale-100' : 'scale-0'"></div>
                      </div>
                      <div class="flex-1">
                          <div class="flex items-center gap-3">
                              <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-white border border-gray-100 shadow-sm text-xl"
                                   :class="selectedPayment === method.id ? 'text-black' : 'text-gray-400'">
                                  <i :class="method.icon"></i>
                              </div>
                              <span class="font-bold text-sm text-gray-900">{{ method.label }}</span>
                          </div>
                      </div>
                      <div v-if="selectedPayment === method.id" class="absolute top-0 right-0 p-1.5">
                          <i class="fa-solid fa-check-circle text-black text-sm"></i>
                      </div>
                  </label>
              </div>
          </div>
        </div>

        <div class="h-fit space-y-4">
            <div class="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 p-6 sticky top-28">
                <h3 class="font-bold text-lg mb-6 text-gray-900 border-b pb-4 border-dashed">Chi tiết thanh toán</h3>
                
                <div class="mb-6 group">
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-sm font-bold text-gray-800 flex items-center gap-2"><i class="fa-solid fa-ticket text-red-500 rotate-[-45deg]"></i> Voucher</span>
                        <button @click="showVoucherModal = true" class="text-xs text-blue-600 font-bold hover:text-blue-700 hover:underline transition-all">{{ appliedVoucher ? 'Đổi mã khác' : 'Chọn hoặc nhập mã' }}</button>
                    </div>
                    <div v-if="appliedVoucher" class="relative overflow-hidden bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 transition-all">
                        <div class="flex justify-between items-start relative z-10">
                            <div>
                                <p class="font-black text-green-700 text-sm tracking-wider uppercase">{{ appliedVoucher.code }}</p>
                                <p class="text-[11px] text-green-600 mt-1 font-medium">{{ appliedVoucher.description }}</p>
                            </div>
                            <span class="font-bold text-green-700 bg-white/50 px-2 py-1 rounded text-sm shadow-sm">-{{ formatPrice(calculatedDiscount) }}</span>
                        </div>
                        <div class="absolute -right-2 -bottom-4 text-green-100 text-6xl opacity-50 rotate-12"><i class="fa-solid fa-tag"></i></div>
                    </div>
                    <div v-else @click="showVoucherModal = true" class="border border-dashed border-gray-300 rounded-xl p-3 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all">
                        <span class="text-xs text-gray-400 font-medium">Bạn chưa áp dụng mã giảm giá nào</span>
                    </div>
                </div>

                <div class="space-y-3 text-sm text-gray-600">
                    <div class="flex justify-between"><span>Tổng tiền hàng</span><span class="font-medium text-gray-900">{{ formatPrice(totalMerchandise) }}</span></div>
                    <div class="flex justify-between"><span>Phí vận chuyển</span><span class="font-medium text-gray-900">{{ formatPrice(shippingFee) }}</span></div>
                    <div class="flex justify-between text-green-600 animate-pulse" v-if="calculatedDiscount > 0"><span class="font-medium">Giảm giá voucher</span><span class="font-bold">-{{ formatPrice(calculatedDiscount) }}</span></div>
                </div>

                <div class="border-t border-gray-100 my-5"></div>

                <div class="flex justify-between items-end mb-6">
                    <div class="flex flex-col"><span class="font-bold text-gray-900 text-base">Tổng thanh toán</span><span class="text-[10px] text-gray-400 font-normal">Đã bao gồm VAT</span></div>
                    <span class="text-2xl font-black text-red-600 tracking-tight leading-none">{{ formatPrice(finalTotal) }}</span>
                </div>

                <div class="mb-6">
                    <label class="text-xs font-bold text-gray-500 uppercase block mb-2">Lời nhắn cho người bán</label>
                    <div class="relative">
                        <i class="fa-regular fa-pen-to-square absolute top-3 left-3 text-gray-400 text-sm"></i>
                        <textarea v-model="note" class="w-full pl-9 p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none bg-gray-50 focus:bg-white" rows="2" placeholder="Ví dụ: Giao hàng giờ hành chính..."></textarea>
                    </div>
                </div>

                <button @click="handleOrder" :disabled="isLoading" class="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <i v-if="isLoading" class="fa-solid fa-circle-notch fa-spin"></i>
                    {{ isLoading ? 'ĐANG XỬ LÝ...' : 'ĐẶT HÀNG NGAY' }}
                </button>
                <p class="text-[10px] text-center text-gray-400 mt-4">Nhấn "Đặt hàng" đồng nghĩa với việc bạn đồng ý với <a href="#" class="underline hover:text-black">điều khoản dịch vụ</a> của chúng tôi.</p>
            </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Loading from '../components/Loading.vue';
import Notification from '../components/Notification.vue';
import VoucherModal from '../components/Voucher.vue';
import AddressSelectorModal from '../components/AddressSelectorModal.vue'; // Import Modal
import { useCartStore } from '../stores/cartStore';
import { useOrderStore } from '../stores/orderStore';
import { useAddressStore } from '../stores/address'; // Import Address Store
import type { CreateOrderPayload } from '../interfaces/order';
import type { Voucher } from '../interfaces/voucher';
import type { Address } from '../interfaces/address';

const router = useRouter();
const cartStore = useCartStore();
const orderStore = useOrderStore();
const addressStore = useAddressStore(); // Init store

const isLoading = ref(false);
const isNotification = ref(false);
const toastText = ref('');
const showVoucherModal = ref(false);
const showAddressModal = ref(false); // State Modal Địa chỉ

// Data
const checkoutItems = computed(() => cartStore.checkoutSession?.items || []);
const appliedVoucher = ref<Voucher | null>(cartStore.checkoutSession?.voucher || null);
const selectedAddress = ref<Address | null>(null); // Địa chỉ được chọn

const paymentMethods = [
    { id: 'cod', label: 'Thanh toán khi nhận hàng (COD)', icon: 'fa-solid fa-money-bill-wave' },
    { id: 'vnpay', label: 'Ví VNPAY', icon: 'fa-solid fa-wallet' },
];
const selectedPayment = ref<'cod' | 'vnpay'>('cod');
const note = ref('');
const shippingFee = ref(30000);

// Computed
const totalMerchandise = computed(() => checkoutItems.value.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0));
const calculatedDiscount = computed(() => {
    if (!appliedVoucher.value) return 0;
    const voucher = appliedVoucher.value;
    const total = totalMerchandise.value;
    if (total < voucher.min_order_value) return 0;
    let discount = 0;
    if (voucher.discount_type === 'FIXED') discount = voucher.discount_value;
    else if (voucher.discount_type === 'PERCENT') {
        discount = (total * voucher.discount_value) / 100;
        if (voucher.max_discount && discount > voucher.max_discount) discount = voucher.max_discount;
    }
    return discount;
});
const finalTotal = computed(() => Math.max(0, totalMerchandise.value + shippingFee.value - calculatedDiscount.value));

// Lifecycle
onMounted(async () => {
    if (!cartStore.checkoutSession) {
        router.push('/cart');
        return;
    }
    // Lấy địa chỉ mặc định
    await addressStore.getAddressesByUserStore();
    
    if (addressStore.addressDefault && addressStore.addressDefault.id) {
        selectedAddress.value = addressStore.addressDefault;
    } else if (addressStore.listAddress.length > 0) {
        selectedAddress.value = addressStore.listAddress[0] || null;
    }
});

// Handlers
const handleApplyVoucher = (voucher: Voucher) => {
    appliedVoucher.value = voucher;
    showToast(`Đã áp dụng mã ${voucher.code}`, true);
};

// [MỚI] Hàm chọn địa chỉ từ Modal
const handleSelectAddress = (addr: Address) => {
    selectedAddress.value = addr;
};

const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';
const formatFullAddress = (addr: Address) => {
    return [addr.street_address, addr.ward, addr.district, addr.province].filter(Boolean).join(', ');
};
const getImage = (path?: string) => path || 'https://placehold.co/100?text=NoImg';
const showToast = (msg: string, success: boolean) => { toastText.value = ''; isNotification.value = success; setTimeout(() => toastText.value = msg, 0); };

// [QUAN TRỌNG] Handle Order với địa chỉ thật
const handleOrder = async () => {
    // 1. Validate Địa chỉ
    if (!selectedAddress.value) {
        showToast("Vui lòng chọn địa chỉ nhận hàng!", false);
        return;
    }

    isLoading.value = true;

    // 2. Map Items
    const itemsPayload = checkoutItems.value.map((item: any) => {
        const sizeId = item.variant?.size?.size_id_mongo || item.size_id_mongo;
        if (!sizeId) {
            console.error("❌ LỖI: Không tìm thấy size_id_mongo cho sản phẩm:", item.name);
            return null;
        }
        return { size_id: sizeId, quantity: item.quantity };
    }).filter((i: any) => i !== null) as { size_id: string; quantity: number }[];

    if (itemsPayload.length === 0) {
        isLoading.value = false;
        showToast("Lỗi dữ liệu: Không lấy được ID sản phẩm", false);
        return;
    }

    // 3. Payload
    const payload: CreateOrderPayload = {
        orderItems: itemsPayload,
        voucherCode: appliedVoucher.value?.code,
        // Dùng địa chỉ đã chọn
        address: {
            name: selectedAddress.value.name,
            phone: selectedAddress.value.phone,
            province: selectedAddress.value.province,
            district: selectedAddress.value.district,
            ward: selectedAddress.value.ward,
            street_address: selectedAddress.value.street_address,
            full_address: formatFullAddress(selectedAddress.value)
        },
        methodPayment: selectedPayment.value,
        note: note.value,
        checkout_source: cartStore.checkoutSession?.checkout_source
    };

    // 4. API Call
    const result = await orderStore.createOrderAction(payload);

    if (result.success) {
        cartStore.clearCheckoutSession();
        if (selectedPayment.value === 'vnpay' && result.data.paymentUrl) {
            window.location.href = result.data.paymentUrl;
        } else {
            router.push('/orderSuccess');
        }
    } else {
        showToast(result.message || "Đặt hàng thất bại", false);
    }
    isLoading.value = false;
};
</script>