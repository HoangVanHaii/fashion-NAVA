<template>
  <Header></Header>
  
  <div class="bg-gray-50 min-h-[60vh] pb-12 pt-[10px]" @click="closeDropdown">
    <Loading :loading="cartStore.loading || localLoading" />
    <Notification :isSuccess="isNotification" :text="toastText" />

    <VoucherModal 
      v-if="showVoucher" 
      :cartTotal="totalSelectedAmount" 
      @close="showVoucher = false"
      @apply="handleApplyVoucher"
    />

    <main class="w-full max-w-[1920px] mx-auto px-4 md:px-8 lg:px-12">
      
      <div v-if="!cartStore.cart && !cartStore.loading" class="bg-white rounded-xl border p-20 text-center shadow-lg">
        <i class="fa-solid fa-cart-shopping text-5xl text-gray-300 mb-6"></i>
        <h2 class="text-xl font-bold mb-2">Giỏ hàng trống</h2>
        <p class="text-gray-500 mb-6">Bạn chưa có sản phẩm nào</p>
        <button @click="router.push('/')" class="px-8 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition">
          Tiếp tục mua sắm
        </button>
      </div>

      <div v-else class="grid lg:grid-cols-[1fr_380px] gap-6 md:gap-10"> 
        
        <div class="bg-white rounded-xl border overflow-visible shadow-lg relative">
          <div class="grid grid-cols-[60px_100px_1fr_140px_120px_160px_60px] bg-gray-50 px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <div class="flex justify-center">
              <input type="checkbox" :checked="isCheckAll" @change="toggleCheckAll" class="w-4 h-4 accent-black cursor-pointer"/>
            </div>
            <div>Ảnh</div>
            <div>Sản phẩm</div>
            <div class="text-center">Đơn giá</div>
            <div class="text-center">Số lượng</div>
            <div class="text-right">Thành tiền</div>
            <div class="text-center">Xóa</div>
          </div>

          <div 
            v-for="item in cartItems" 
            :key="itemKey(item)" 
            class="grid grid-cols-[60px_100px_1fr_140px_120px_160px_60px] items-center px-6 py-5 border-t hover:bg-indigo-50/30 transition group relative"
          >
            <div class="flex justify-center">
              <input type="checkbox" v-model="selectedIds" :value="itemKey(item)" class="w-4 h-4 accent-black cursor-pointer"/>
            </div>
            
            <img 
              :src="getImage(item.variant?.color?.image_main || '')" 
              class="w-20 h-20 rounded-lg border object-cover group-hover:scale-105 transition cursor-pointer"
              @click="router.push(`/product/${item.product_id_sql}`)"
            />
            
            <div class="pr-6 relative">
              <div class="font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-indigo-600 transition-colors" @click="router.push(`/product/${item.product_id_sql}`)">
                {{ item.name }}
              </div>
              
              <div 
                class="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full cursor-pointer hover:bg-white hover:border-black hover:shadow-sm transition-all duration-300 group/btn select-none"
                @click.stop="toggleDropdown(item)"
              >
                <span class="text-xs font-medium text-gray-600 group-hover/btn:text-black">
                  {{ item.variant?.color?.color }} <span class="text-gray-300 mx-1">|</span> {{ item.variant?.size?.size }}
                </span>
                <i 
                  class="fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform duration-300 group-hover/btn:text-black" 
                  :class="{'rotate-180': openDropdownId === itemKey(item)}"
                ></i>
              </div>

              <div 
                v-if="openDropdownId === itemKey(item)"
                class="absolute top-full left-0 mt-3 w-[340px] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-gray-100 z-50 overflow-hidden ring-1 ring-black/5 animate-scale-in origin-top-left"
                @click.stop
              >
                 <div class="absolute -top-1.5 left-6 w-3 h-3 bg-white border-t border-l border-gray-100 rotate-45 z-0"></div>

                 <div class="relative z-10 bg-white p-5">
                    <div v-if="localLoading" class="flex flex-col items-center justify-center py-8 space-y-3">
                       <i class="fa-solid fa-circle-notch fa-spin text-black text-2xl"></i>
                       <span class="text-xs text-gray-400 font-medium">Đang tải thông tin...</span>
                    </div>

                    <div v-else>
                       <div class="mb-5">
                          <div class="flex justify-between items-end mb-3">
                             <span class="text-xs font-bold text-gray-900 uppercase tracking-wider">Màu sắc</span>
                             <span class="text-xs text-gray-500 font-medium">{{ tempSelectedColor?.color }}</span>
                          </div>
                          <div class="flex flex-wrap gap-3">
                             <div 
                                v-for="color in productDetails?.colors" 
                                :key="color._id || color.id"
                                class="group/color cursor-pointer relative"
                                @click="selectColor(color)"
                             >
                                <div 
                                   class="w-11 h-11 rounded-lg p-0.5 border transition-all duration-200"
                                   :class="tempSelectedColor?.color === color.color ? 'border-black shadow-md' : 'border-gray-200 hover:border-gray-400'"
                                >
                                   <img 
                                      :src="getImage(color.image_main || color.image_url)" 
                                      class="w-full h-full rounded-[6px] object-cover"
                                   />
                                </div>
                                <div v-if="tempSelectedColor?.color === color.color" class="absolute -top-1.5 -right-1.5 bg-black text-white w-4 h-4 rounded-full flex items-center justify-center shadow-sm text-[8px]">
                                   <i class="fa-solid fa-check"></i>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div class="w-full h-[1px] bg-gray-100 mb-5"></div>

                       <div class="mb-2">
                          <div class="flex justify-between items-end mb-3">
                             <span class="text-xs font-bold text-gray-900 uppercase tracking-wider">Kích thước</span>
                             <span class="text-xs text-orange-600 cursor-pointer hover:underline" @click="router.push('/size-guide')">Bảng size?</span>
                          </div>

                          <div class="grid grid-cols-4 gap-2">
                             <button
                                v-for="size in tempSelectedColor?.sizes"
                                :key="size._id || size.id"
                                class="relative h-10 text-sm font-medium rounded-lg border transition-all duration-200 flex items-center justify-center overflow-hidden"
                                :class="[
                                   item.variant?.size?.size_id_mongo === (size._id || size.id)
                                      ? 'bg-black text-white border-black shadow-md scale-[1.02]' 
                                      : '',
                                   size.stock < item.quantity 
                                      ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' 
                                      : item.variant?.size?.size_id_mongo !== (size._id || size.id) 
                                        ? 'bg-white text-gray-700 border-gray-200 hover:border-black hover:text-black' 
                                        : ''
                                ]"
                                :disabled="size.stock < item.quantity"
                                @click="handleUpdateVariant(item, size)"
                             >
                                {{ size.size }}
                                <div v-if="size.stock < item.quantity" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                                   <div class="w-full h-[1px] bg-gray-300 -rotate-12"></div>
                                </div>
                             </button>
                          </div>
                       </div>

                       <div class="mt-4 p-2 bg-blue-50/50 rounded-lg border border-blue-100 flex gap-2 items-start">
                          <i class="fa-solid fa-circle-info text-blue-500 text-[10px] mt-0.5"></i>
                          <p class="text-[10px] text-blue-600 leading-tight">
                             Chọn kích thước mới để cập nhật ngay lập tức.
                          </p>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
            
            <div class="text-center font-medium">{{ formatPrice(item.price) }}</div>
            
            <div class="flex justify-center">
              <div class="flex border rounded-lg overflow-hidden">
                <button @click="handleButtonClick(item, -1)" :disabled="cartStore.loading" class="w-8 h-8 hover:bg-gray-100 transition disabled:opacity-50">−</button>
                <input type="number" :value="item.quantity" @input="handleDirectInput(item, $event)" @blur="handleInputBlur(item, $event)" min="1" :disabled="cartStore.loading" class="w-10 text-center font-medium leading-8 border-x focus:outline-none appearance-none m-0 disabled:bg-gray-50"/>
                <button @click="handleButtonClick(item, 1)" :disabled="cartStore.loading" class="w-8 h-8 hover:bg-gray-100 transition disabled:opacity-50">+</button>
              </div>
            </div>
            
            <div class="text-right font-bold text-red-600">{{ formatPrice(item.total_price) }}</div>
            
            <div class="text-center">
              <button @click="handleRemoveItem(item)" :disabled="cartStore.loading" class="text-gray-400 hover:text-red-500 transition disabled:opacity-50">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="sticky top-28 h-fit z-0">
          <div class="bg-white rounded-xl border p-6 space-y-5 shadow-lg">
            <h3 class="text-xl font-bold">Tóm tắt đơn hàng</h3>
            <div class="flex justify-between text-base">
              <span class="text-gray-500">Tạm tính ({{ selectedItems.length }} sản phẩm)</span>
              <span>{{ formatPrice(totalSelectedAmount) }}</span>
            </div>

            <div class="border-t pt-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-gray-800">Voucher</span>
                <button @click="openVoucherModal" class="text-sm font-semibold text-indigo-600 hover:underline transition">
                  {{ selectedVoucher ? selectedVoucher.code : 'Chọn mã' }}
                </button>
              </div>
              
              <div v-if="selectedVoucher" class="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                <div class="flex flex-col">
                  <span class="font-semibold text-green-700">{{ selectedVoucher.code }}</span>
                  <span class="text-xs text-green-600">Giảm {{ formatPrice(discountAmount) }}</span>
                </div>
                <span class="font-bold text-green-700">− {{ formatPrice(discountAmount) }}</span>
              </div>
            </div>
            
            <button :disabled="selectedItems.length === 0 || cartStore.loading" @click="handleClearSelectedItems" class="w-full py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
              Xóa {{ selectedItems.length }} sản phẩm đã chọn
            </button>

            <div class="border-t pt-4 flex justify-between items-end">
              <span class="font-semibold text-xl">Tổng cộng</span>
              <span class="text-2xl font-black text-red-600">{{ formatPrice(finalCalculatedAmount) }}</span>
            </div>

            <button :disabled="selectedItems.length === 0 || cartStore.loading" @click="confirmPay" class="w-full py-4 rounded-lg font-bold text-lg transition bg-black text-white disabled:bg-gray-300 hover:bg-gray-800">
              Thanh toán ({{ selectedItems.length }})
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
  <Footer></Footer>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import Loading from '../components/Loading.vue' 
import Notification from '../components/Notification.vue' 
import VoucherModal from '../components/Voucher.vue'
import { useCartStore } from '../stores/cartStore'
import type { Voucher } from '../interfaces/voucher'
import { getProductById } from '../services/product' 
import { getImage, formatPrice } from '@/utils/format.ts'

// --- INIT ---
const router = useRouter()
const cartStore = useCartStore()

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY = 500; 

const isNotification = ref(false)
const toastText = ref('')

const cartItems = computed(() => cartStore.cart?.items || [])

// --- VOUCHER & CALCULATION ---
const showVoucher = ref(false)
const selectedVoucher = ref<Voucher | null>(null);

const itemKey = (item: { _id?: string }): string => item._id || '';
const selectedIds = ref<string[]>([])

const selectedItems = computed(() => 
  cartItems.value.filter(item => selectedIds.value.includes(itemKey(item as any)))
)

const totalSelectedAmount = computed(() => 
  selectedItems.value.reduce((sum, item) => sum + (item.total_price || 0), 0)
)

const discountAmount = computed(() => {
    if (!selectedVoucher.value) return 0;
    const voucher = selectedVoucher.value;
    const total = totalSelectedAmount.value;
    if (total < voucher.min_order_value) return 0;
    let discount = 0;
    if (voucher.discount_type === 'FIXED') {
        discount = voucher.discount_value;
    } else if (voucher.discount_type === 'PERCENT') {
        discount = (total * voucher.discount_value) / 100;
        if (voucher.max_discount && discount > voucher.max_discount) {
            discount = voucher.max_discount;
        }
    }
    return discount;
});

const finalCalculatedAmount = computed(() => 
  Math.max(0, totalSelectedAmount.value - discountAmount.value)
)

const openVoucherModal = () => { showVoucher.value = true; }
const handleApplyVoucher = (voucher: Voucher) => {
    selectedVoucher.value = voucher;
    showToast(`Đã áp dụng mã ${voucher.code}`, true);
}

// --- CHECKBOX LOGIC ---
const isCheckAll = computed(() => 
  cartItems.value.length > 0 && selectedIds.value.length === cartItems.value.length
)

const toggleCheckAll = () => {
  if (isCheckAll.value) selectedIds.value = [];
  else selectedIds.value = cartItems.value.map(itemKey as any);
}

// --- VARIANT DROPDOWN LOGIC ---
const openDropdownId = ref<string | null>(null)
const localLoading = ref(false)
const productDetails = ref<any>(null) 
const tempSelectedColor = ref<any>(null) 

const closeDropdown = () => {
  openDropdownId.value = null
  productDetails.value = null
  tempSelectedColor.value = null
}

const toggleDropdown = async (item: any) => {
  const itemId = itemKey(item)
  if (openDropdownId.value === itemId) {
    closeDropdown()
    return
  }

  openDropdownId.value = itemId
  localLoading.value = true
  
  try {
    const res = await getProductById(item.product_id_sql) 
    if (res && res.data) {
        productDetails.value = res.data
        const currentColor = item.variant?.color?.color
        tempSelectedColor.value = res.data.colors.find((c: any) => c.color === currentColor) || res.data.colors[0]
    }
  } catch (err) {
    console.error(err)
    showToast("Không thể tải thông tin sản phẩm", false)
  } finally {
    localLoading.value = false
  }
}

const selectColor = (color: any) => {
  tempSelectedColor.value = color
}

const handleUpdateVariant = async (item: any, size: any) => {
  const currentSizeId = item.variant?.size?.size_id_mongo;
  const newSizeId = size._id || size.id; 

  if (currentSizeId === newSizeId) {
    closeDropdown()
    return
  }
  
  if (size.stock < item.quantity) {
     showToast("Sản phẩm không đủ hàng để đổi", false)
     return
  }

  localLoading.value = true
  try {
      await cartStore.updateVariantAction(itemKey(item), newSizeId)
      showToast("Đổi phân loại thành công", true)
      closeDropdown()
  } catch (error: any) {
      showToast(error.message || "Lỗi khi đổi phân loại", false)
  } finally {
      localLoading.value = false
  }
}

// --- UTILS ---
const showToast = (text: string, isSuccess: boolean = true) => {
  toastText.value = ''; 
  isNotification.value = isSuccess;
  setTimeout(() => { toastText.value = text; }, 0);
};

onMounted(async () => {
  await cartStore.fetchCartAction()
  selectedIds.value = cartItems.value.map(itemKey as any)

})

// --- UPDATE QUANTITY ---
const executeUpdateQuantity = async (itemId: string, newQuantity: number) => {
  try {
    const result = await cartStore.updateQuantityAction(itemId, newQuantity);
    if (result.success) showToast(result.message, true);
  } catch (error: unknown) {
    const errorMessage = (error as Error).message || "Cập nhật thất bại.";
    showToast(`Cập nhật thất bại: ${errorMessage}`, false);
  }
};

const handleButtonClick = (item: { quantity: number, _id?: string }, change: number) => {
  if (cartStore.loading) return; 
  const newQuantity = item.quantity + change;
  if (newQuantity < 1) {
    showToast("Số lượng sản phẩm không thể nhỏ hơn 1.", false);
    return;
  }
  item.quantity = newQuantity; 
  if (debounceTimer) clearTimeout(debounceTimer);
  const itemId = itemKey(item); 
  debounceTimer = setTimeout(() => { executeUpdateQuantity(itemId, newQuantity); }, DEBOUNCE_DELAY);
};

const handleDirectInput = (item: { quantity: number, _id?: string }, event: Event) => {
  const target = event.target as HTMLInputElement;
  const val = target.value;
  if (val === '') return; 
  let newQuantity = parseInt(val, 10);
  if (!isNaN(newQuantity) && newQuantity >= 1) {
      item.quantity = newQuantity;
      if (debounceTimer) clearTimeout(debounceTimer);
      const itemId = itemKey(item);
      debounceTimer = setTimeout(() => { executeUpdateQuantity(itemId, newQuantity); }, DEBOUNCE_DELAY);
  }
};

const handleInputBlur = (item: { quantity: number, _id?: string }, event: Event) => {
    const target = event.target as HTMLInputElement;
    let val = target.value;
    let newQuantity = parseInt(val, 10);
    if (val === '' || isNaN(newQuantity) || newQuantity < 1) {
        target.value = item.quantity.toString();
        showToast("Số lượng không hợp lệ.", false);
    } else {
        if (debounceTimer) clearTimeout(debounceTimer);
        const itemId = itemKey(item);
        executeUpdateQuantity(itemId, newQuantity);
    }
}

// --- ACTIONS: REMOVE ---
const handleRemoveItem = async (item: { _id?: string, name?: string }) => {
  if (cartStore.loading) return; 
  if (!window.confirm(`Xóa sản phẩm "${item.name}"?`)) return;
  const itemId = itemKey(item);
  try {
    const result = await cartStore.removeItemAction(itemId);
    if (result.success) {
      selectedIds.value = selectedIds.value.filter(id => id !== itemId);
      showToast(result.message, true);
    }
  } catch (error: unknown) {
    showToast(`Xóa thất bại: ${(error as Error).message}`, false);
  }
};

const handleClearSelectedItems = async () => {
  if (cartStore.loading || selectedItems.value.length === 0) return;
  if (!window.confirm(`Xóa ${selectedItems.value.length} sản phẩm đã chọn?`)) return;
  
  cartStore.loading = true; 
  for (const item of selectedItems.value) {
     try {
       const itemId = itemKey(item as any);
       await cartStore.removeItemAction(itemId); 
     } catch (error: unknown) { break; }
  }
  await cartStore.fetchCartAction();
  selectedIds.value = [];
  showToast(`Xóa thành công.`, true);
}

const confirmPay = () => {
  if (selectedItems.value.length === 0) {
    showToast("Vui lòng chọn ít nhất một sản phẩm.", false);
    return;
  }
  
  cartStore.setCheckoutSession({
      items: JSON.parse(JSON.stringify(selectedItems.value)),
      voucher: selectedVoucher.value,
      totalAmount: totalSelectedAmount.value,
      discountAmount: discountAmount.value,
      finalAmount: finalCalculatedAmount.value,
      checkout_source: "cart"
  });
  
  router.push('/payment');
}
</script>

<style scoped>
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
.border-x {
  border-left-width: 1px;
  border-right-width: 1px;
  border-color: #d1d5db;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes scaleIn {
  from { 
    opacity: 0; 
    transform: scale(0.95) translateY(-10px); 
  }
  to { 
    opacity: 1; 
    transform: scale(1) translateY(0); 
  }
}
.animate-scale-in {
  animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>