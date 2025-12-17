<template>
  <div class="bg-gray-50 min-h-screen pt-28 pb-20">
    <Loading :loading="isLoading || isAddrLoading" />
    <Notification :isSuccess="isNotification" :text="toastText" />

    <VoucherModal 
        v-if="showVoucherModal" 
        :cartTotal="totalMerchandise" 
        @close="showVoucherModal = false" 
        @apply="handleApplyVoucher" 
    />

    <div v-if="showAddressModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="showAddressModal = false">
        <div class="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scale-in">
            <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div class="flex items-center gap-3">
                    <button v-if="addrMode === 'create'" @click="switchAddrList" class="text-gray-500 hover:text-black transition-colors">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h3 class="font-bold text-lg text-gray-900">
                        {{ addrMode === 'list' ? 'Chọn địa chỉ nhận hàng' : 'Thêm địa chỉ mới' }}
                    </h3>
                </div>
                <button @click="showAddressModal = false" class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <i class="fa-solid fa-xmark text-gray-500"></i>
                </button>
            </div>

            <div v-if="addrMode === 'list'" class="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                <div v-if="addressStore.listAddress.length === 0" class="text-center py-8 text-gray-500">
                    <div class="mb-3"><i class="fa-solid fa-map-location-dot text-3xl text-gray-300"></i></div>
                    <p>Bạn chưa có địa chỉ nào.</p>
                </div>

                <div 
                    v-for="addr in addressStore.listAddress" 
                    :key="addr.id"
                    @click="handleSelectAddress(addr)"
                    class="border rounded-xl p-4 cursor-pointer transition-all hover:border-black group relative"
                    :class="addr.id === selectedAddress?.id ? 'border-black bg-blue-50/30 ring-1 ring-black' : 'border-gray-200'"
                >
                    <div class="flex justify-between items-start mb-1">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-gray-900">{{ addr.name }}</span>
                            <span class="text-gray-300">|</span>
                            <span class="text-gray-600 font-medium">{{ addr.phone }}</span>
                        </div>
                        <div v-if="addr.id === selectedAddress?.id">
                            <i class="fa-solid fa-circle-check text-black text-lg"></i>
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 leading-relaxed">{{ formatFullAddress(addr) }}</p>
                    <span v-if="addr.is_default" class="mt-2 inline-block px-2 py-0.5 border border-red-200 text-red-600 text-[10px] font-bold rounded bg-red-50 uppercase">Mặc định</span>
                </div>
            </div>

            <div v-else class="p-6 overflow-y-auto custom-scrollbar flex-1">
                <form @submit.prevent="handleSubmitAddress" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-gray-500 uppercase">Họ tên</label>
                            <input v-model="formAddr.name" type="text" class="input-style" placeholder="Nguyễn Văn A" required />
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-gray-500 uppercase">SĐT</label>
                            <input v-model="formAddr.phone" type="tel" class="input-style" placeholder="0909..." required />
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-3">
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-gray-500 uppercase">Tỉnh/TP</label>
                            <select v-model="selProvince" @change="handleProvinceChange" class="input-style" required>
                                <option value="" disabled>Chọn</option>
                                <option v-for="p in provinceList" :key="p.code" :value="p.code">{{ p.name }}</option>
                            </select>
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-gray-500 uppercase">Quận/Huyện</label>
                            <select v-model="selDistrict" @change="handleDistrictChange" :disabled="!selProvince" class="input-style disabled:bg-gray-100" required>
                                <option value="" disabled>Chọn</option>
                                <option v-for="d in districtList" :key="d.code" :value="d.code">{{ d.name }}</option>
                            </select>
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-gray-500 uppercase">Phường/Xã</label>
                            <select v-model="selWard" @change="handleWardChange" :disabled="!selDistrict" class="input-style disabled:bg-gray-100" required>
                                <option value="" disabled>Chọn</option>
                                <option v-for="w in wardList" :key="w.code" :value="w.code">{{ w.name }}</option>
                            </select>
                        </div>
                    </div>

                    <div class="space-y-1">
                        <label class="text-xs font-bold text-gray-500 uppercase">Địa chỉ cụ thể</label>
                        <textarea v-model="formAddr.street_address" rows="2" class="input-style resize-none" placeholder="Số nhà, tên đường..." required></textarea>
                    </div>

                    <div class="flex items-center gap-2">
                        <input type="checkbox" v-model="formAddr.is_default" id="default" class="w-4 h-4 rounded border-gray-300 text-black focus:ring-black">
                        <label for="default" class="text-sm font-medium text-gray-700">Đặt làm địa chỉ mặc định</label>
                    </div>
                </form>
            </div>

            <div class="p-5 border-t border-gray-100 bg-gray-50 sticky bottom-0 z-10">
                <button v-if="addrMode === 'list'" @click="switchAddrCreate" class="w-full py-3 border border-dashed border-gray-400 rounded-xl flex items-center justify-center gap-2 text-gray-600 font-bold hover:border-black hover:text-black hover:bg-white transition-all">
                    <i class="fa-solid fa-plus"></i> Thêm địa chỉ mới
                </button>

                <div v-else class="flex gap-3">
                    <button @click="switchAddrList" class="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-bold hover:bg-white transition-all">
                        Trở lại
                    </button>
                    <button @click="handleSubmitAddress" :disabled="isAddrLoading" class="flex-[2] py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all flex justify-center items-center gap-2">
                        <i v-if="isAddrLoading" class="fa-solid fa-spinner fa-spin"></i>
                        {{ isAddrLoading ? 'Đang lưu...' : 'Hoàn thành' }}
                    </button>
                </div>
            </div>
        </div>
    </div>

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
                <button @click="openAddressModal" class="text-xs text-blue-600 font-bold hover:underline bg-blue-50 px-3 py-1.5 rounded-full transition-colors hover:bg-blue-100">
                    {{ selectedAddress ? 'Thay đổi' : 'Thêm địa chỉ' }}
                </button>
             </div>

             <div class="flex flex-col md:flex-row justify-between items-end gap-4 pl-7">
                 
                 <div class="w-full md:flex-1">
                     <template v-if="selectedAddress">
                        <p class="font-bold text-gray-900 text-base mb-1">
                            {{ selectedAddress.name }} 
                            <span class="font-normal text-gray-400 mx-2">|</span> 
                            <span class="text-gray-600">{{ selectedAddress.phone }}</span>
                        </p>
                        <p class="text-sm text-gray-500 leading-relaxed max-w-lg">
                            {{ formatFullAddress(selectedAddress) }}
                        </p>
                     </template>
                     <template v-else>
                        <div @click="openAddressModal" class="cursor-pointer flex items-center gap-2 text-red-500 italic text-sm hover:underline">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            Vui lòng chọn địa chỉ giao hàng (*)
                        </div>
                     </template>
                 </div>

                 <div class="hidden md:block w-[180px] h-[50px] relative opacity-90 select-none pointer-events-none mb-1">
                      <div class="shipper-animation w-full h-full relative">
                          <i class="fa-solid fa-truck-fast truck text-2xl text-red-500 absolute top-1/2 -translate-y-1/2 z-10"></i>
                          <i class="fa-solid fa-house-chimney house text-2xl text-red-500 absolute right-0 top-1/2 -translate-y-1/2 z-10"></i>
                          <div class="absolute bottom-1 left-0 w-full h-[2px] bg-red-100 rounded-full"></div>
                      </div>
                 </div>

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
import { onMounted, ref, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import Loading from '../components/Loading.vue';
import Notification from '../components/Notification.vue';
import VoucherModal from '../components/Voucher.vue';
import { useCartStore } from '../stores/cartStore';
import { useOrderStore } from '../stores/orderStore';
import { useAddressStore } from '../stores/address';
import type { CreateOrderPayload } from '../interfaces/order';
import type { Voucher } from '../interfaces/voucher';
import type { Address } from '../interfaces/address';

const router = useRouter();
const cartStore = useCartStore();
const orderStore = useOrderStore();
const addressStore = useAddressStore();

const isLoading = ref(false);
const isNotification = ref(false);
const toastText = ref('');
const showVoucherModal = ref(false);

// --- MODAL ADDRESS STATE ---
const showAddressModal = ref(false);
const addrMode = ref<'list' | 'create'>('list');
const isAddrLoading = ref(false);
const formAddr = reactive<Address>({ name: "", phone: "", province: '', district: '', ward: '', street_address: '', is_default: false });
const provinceList = ref<any[]>([]);
const districtList = ref<any[]>([]);
const wardList = ref<any[]>([]);
const selProvince = ref<number | string>("");
const selDistrict = ref<number | string>("");
const selWard = ref<number | string>("");

// --- MAIN DATA ---
const checkoutItems = computed(() => cartStore.checkoutSession?.items || []);
const appliedVoucher = ref<Voucher | null>(cartStore.checkoutSession?.voucher || null);
const selectedAddress = ref<Address | null>(null);

const paymentMethods = [
    { id: 'cod', label: 'Thanh toán khi nhận hàng (COD)', icon: 'fa-solid fa-money-bill-wave' },
    { id: 'vnpay', label: 'Ví VNPAY', icon: 'fa-solid fa-wallet' },
];
const selectedPayment = ref<'cod' | 'vnpay'>('cod');
const note = ref('');
const shippingFee = ref(30000);

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

// --- LIFECYCLE ---
onMounted(async () => {
    if (!cartStore.checkoutSession) {
        router.push('/cart');
        return;
    }
    await addressStore.getAddressesByUserStore();
    if (addressStore.addressDefault && addressStore.addressDefault.id) {
        selectedAddress.value = addressStore.addressDefault;
    } else if (addressStore.listAddress.length > 0) {
        selectedAddress.value = addressStore.listAddress[0] || null;
    }
    fetchProvinces(); // Pre-fetch for modal
});

// --- HELPER FUNCTIONS ---
const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';
const formatFullAddress = (addr: Address) => [addr.street_address, addr.ward, addr.district, addr.province].filter(Boolean).join(', ');
const getImage = (path?: string) => path || 'https://placehold.co/100?text=NoImg';
const showToast = (msg: string, success: boolean) => { toastText.value = ''; isNotification.value = success; setTimeout(() => toastText.value = msg, 0); };

// --- VOUCHER ---
const handleApplyVoucher = (voucher: Voucher) => {
    appliedVoucher.value = voucher;
    showToast(`Đã áp dụng mã ${voucher.code}`, true);
};

// --- ADDRESS MODAL LOGIC ---
const openAddressModal = () => { showAddressModal.value = true; addrMode.value = 'list'; };
const switchAddrCreate = () => {
    Object.assign(formAddr, { name: "", phone: "", province: '', district: '', ward: '', street_address: '', is_default: false });
    selProvince.value = ""; selDistrict.value = ""; selWard.value = "";
    addrMode.value = 'create';
};
const switchAddrList = () => { addrMode.value = 'list'; };

const fetchProvinces = async () => { try { const res = await fetch('https://provinces.open-api.vn/api/?depth=1'); provinceList.value = await res.json(); } catch(e){} };
const fetchDistricts = async (code: number|string) => { try { const res = await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`); const d = await res.json(); districtList.value = d.districts; } catch(e){} };
const fetchWards = async (code: number|string) => { try { const res = await fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`); const d = await res.json(); wardList.value = d.wards; } catch(e){} };

const handleProvinceChange = () => {
    const p = provinceList.value.find(item => item.code == selProvince.value);
    formAddr.province = p ? p.name : '';
    selDistrict.value = ""; selWard.value = ""; districtList.value = []; wardList.value = [];
    if (selProvince.value) fetchDistricts(selProvince.value);
};
const handleDistrictChange = () => {
    const d = districtList.value.find(item => item.code == selDistrict.value);
    formAddr.district = d ? d.name : '';
    selWard.value = ""; wardList.value = [];
    if (selDistrict.value) fetchWards(selDistrict.value);
};
const handleWardChange = () => {
    const w = wardList.value.find(item => item.code == selWard.value);
    formAddr.ward = w ? w.name : '';
};

// Submit Add Address
const handleSubmitAddress = async () => {
    if (!formAddr.name || !formAddr.phone || !formAddr.street_address || !formAddr.province) {
        alert("Vui lòng điền đầy đủ thông tin!"); return;
    }
    try {
        isAddrLoading.value = true;
        await addressStore.addAddressStore({ ...formAddr });
        await addressStore.getAddressesByUserStore();
        if (addressStore.listAddress.length > 0) {
             const newAddr = addressStore.listAddress.find(a => a.is_default) || addressStore.listAddress[addressStore.listAddress.length - 1];
             if(newAddr) handleSelectAddress(newAddr);
        }
        addrMode.value = 'list';
    } catch (e) { alert("Lỗi thêm địa chỉ"); } 
    finally { isAddrLoading.value = false; }
};

const handleSelectAddress = (addr: Address) => {
    selectedAddress.value = addr;
    showAddressModal.value = false;
};

// --- ORDER ---
const handleOrder = async () => {
    if (!selectedAddress.value) { showToast("Vui lòng chọn địa chỉ nhận hàng!", false); return; }
    isLoading.value = true;

    const itemsPayload = checkoutItems.value.map((item: any) => {
        const sizeId = item.variant?.size?.size_id_mongo || item.size_id_mongo;
        if (!sizeId) { console.error("❌ Lỗi Size ID:", item.name); return null; }
        return { size_id: sizeId, quantity: item.quantity };
    }).filter((i: any) => i !== null) as { size_id: string; quantity: number }[];

    if (itemsPayload.length === 0) { isLoading.value = false; showToast("Lỗi dữ liệu sản phẩm", false); return; }

    const payload: CreateOrderPayload = {
        orderItems: itemsPayload,
        voucherCode: appliedVoucher.value?.code,
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

    const result = await orderStore.createOrderAction(payload);
    if (result.success) {
        cartStore.clearCheckoutSession();
        if (selectedPayment.value === 'vnpay' && result.data.paymentUrl) {
            window.location.href = result.data.paymentUrl;
        } else {
            router.push('/order-success');
        }
    } else {
        showToast(result.message || "Đặt hàng thất bại", false);
    }
    isLoading.value = false;
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }

.input-style {
    width: 100%; padding: 10px 12px;
    background-color: white; border: 1px solid #e5e7eb;
    border-radius: 8px; font-size: 14px; outline: none;
    transition: all 0.2s;
}
.input-style:focus {
    border-color: black;
    outline: 1px solid black; 
}

@keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}
.animate-scale-in { animation: scaleIn 0.2s ease-out; }

@keyframes truckRun {
    0% { 
        left: 0; 
        opacity: 0; 
        transform: translateY(-50%) translateX(-20px); 
    }
    10% { 
        opacity: 1; 
    }

    90% { 
        left: calc(100% - 40px);
        opacity: 1; 
        transform: translateY(-50%) translateX(0); 
    }

    100% { 
        left: calc(100% - 40px); 
        opacity: 0; 
        transform: translateY(-50%) translateX(20px); 
    }
}

.truck {
    animation: truckRun 3s linear infinite; 
    transform-origin: center; 
}
</style>