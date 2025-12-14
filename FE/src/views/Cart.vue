<template>
  <Header></Header>
  <div class="bg-gray-50 min-h-screen pt-[10px]">
    <Loading :loading="cartStore.loading" />
    <Notification :isSuccess="isNotification" :text="toastText" />

    <VoucherModal 
      v-if="showVoucher" 
      :cartTotal="totalSelectedAmount" 
      @close="showVoucher = false"
      @apply="handleApplyVoucher"
    />

    <main class="max-w-[1400px] mx-auto px-6">
      <!-- <div class="mb-6 text-sm text-gray-400">
        <span class="hover:text-black cursor-pointer" @click="router.push('/')">
          Trang chủ
        </span>
        <span class="mx-2">/</span>
        <span class="text-black font-semibold">
          Giỏ hàng ({{ cartStore.totalQuantity }})
        </span>
      </div> -->

      <div v-if="!cartStore.cart && !cartStore.loading" class="bg-white rounded-xl border p-20 text-center shadow-lg">
        <i class="fa-solid fa-cart-shopping text-5xl text-gray-300 mb-6"></i>
        <h2 class="text-xl font-bold mb-2">Giỏ hàng trống</h2>
        <p class="text-gray-500 mb-6">Bạn chưa có sản phẩm nào</p>
        <button 
          @click="router.push('/')" 
          class="px-8 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition"
        >
          Tiếp tục mua sắm
        </button>
      </div>

      <div v-else class="grid lg:grid-cols-[1fr_360px] gap-8"> 
        
        <div class="bg-white rounded-xl border overflow-hidden shadow-lg">
          <div class="grid grid-cols-[60px_100px_1fr_140px_120px_160px_60px] bg-gray-50 px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <div class="flex justify-center">
              <input type="checkbox" :checked="isCheckAll" @change="toggleCheckAll" class="w-4 h-4 accent-black"/>
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
            class="grid grid-cols-[60px_100px_1fr_140px_120px_160px_60px] items-center px-6 py-5 border-t hover:bg-indigo-50/30 transition group"
          >
            <div class="flex justify-center">
              <input type="checkbox" v-model="selectedIds" :value="itemKey(item)" class="w-4 h-4 accent-black"/>
            </div>
            
            <img 
              :src="getImage(item.variant?.color?.image_main)" 
              class="w-20 h-20 rounded-lg border object-cover group-hover:scale-105 transition"
            />
            
            <div class="pr-6">
              <div class="font-semibold text-gray-900 line-clamp-2">{{ item.name }}</div>
              <div class="text-sm text-gray-500 mt-1">
                {{ item.variant?.color?.color }} / {{ item.variant?.size?.size }}
              </div>
            </div>
            
            <div class="text-center font-medium">{{ formatPrice(item.price) }}</div>
            
            <div class="flex justify-center">
              <div class="flex border rounded-lg overflow-hidden">
                <button 
                  @click="handleButtonClick(item, -1)" 
                  :disabled="cartStore.loading" 
                  class="w-8 h-8 hover:bg-gray-100 transition disabled:opacity-50"
                >−</button>
                
                <input 
                  type="number" 
                  :value="item.quantity" 
                  @input="handleDirectInput(item, $event)" 
                  @blur="handleInputBlur(item, $event)" 
                  min="1" 
                  :disabled="cartStore.loading" 
                  class="w-10 text-center font-medium leading-8 border-x focus:outline-none focus:ring-0 appearance-none m-0 disabled:bg-gray-50"
                />
                
                <button 
                  @click="handleButtonClick(item, 1)" 
                  :disabled="cartStore.loading" 
                  class="w-8 h-8 hover:bg-gray-100 transition disabled:opacity-50"
                >+</button>
              </div>
            </div>
            
            <div class="text-right font-bold text-red-600">{{ formatPrice(item.total_price) }}</div>
            
            <div class="text-center">
              <button 
                @click="handleRemoveItem(item)" 
                :disabled="cartStore.loading" 
                class="text-gray-400 hover:text-red-500 transition disabled:opacity-50"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="sticky top-28 h-fit">
          <div class="bg-white rounded-xl border p-6 space-y-5 shadow-lg">
            <h3 class="text-xl font-bold">Tóm tắt đơn hàng</h3>
            
            <div class="flex justify-between text-base">
              <span class="text-gray-500">Tạm tính ({{ selectedItems.length }} sản phẩm)</span>
              <span>{{ formatPrice(totalSelectedAmount) }}</span>
            </div>

            <div class="border-t pt-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-gray-800">Voucher</span>
                <button 
                  @click="openVoucherModal" 
                  class="text-sm font-semibold text-indigo-600 hover:underline transition"
                >
                  {{ selectedVoucher ? selectedVoucher.code : 'Chọn mã' }}
                </button>
              </div>

              <div v-if="!selectedVoucher" class="text-sm text-gray-400 italic">
                Chưa chọn voucher
              </div>
              <div v-else class="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                <div class="flex flex-col">
                  <span class="font-semibold text-green-700">{{ selectedVoucher.code }}</span>
                  <span class="text-xs text-green-600">Giảm {{ formatPrice(discountAmount) }}</span>
                </div>
                <span class="font-bold text-green-700">− {{ formatPrice(discountAmount) }}</span>
              </div>
            </div>
            
            <button 
              :disabled="selectedItems.length === 0 || cartStore.loading" 
              @click="handleClearSelectedItems" 
              class="w-full py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
            >
              Xóa {{ selectedItems.length }} sản phẩm đã chọn
            </button>

            <div class="border-t pt-4 flex justify-between items-end">
              <span class="font-semibold text-xl">Tổng cộng</span>
              <span class="text-2xl font-black text-red-600">{{ formatPrice(finalCalculatedAmount) }}</span>
            </div>

            <button 
              :disabled="selectedItems.length === 0 || cartStore.loading" 
              @click="confirmPay" 
              class="w-full py-4 rounded-lg font-bold text-lg transition bg-black text-white disabled:bg-gray-300 hover:bg-gray-800"
            >
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

// --- UTILS ---
const showToast = (text: string, isSuccess: boolean = true) => {
  toastText.value = ''; 
  isNotification.value = isSuccess;
  setTimeout(() => { toastText.value = text; }, 0);
};

const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ'
const getImage = (path?: string | null) => path || 'https://placehold.co/100x100?text=No+Image'

onMounted(async () => {
  await cartStore.fetchCartAction()
  selectedIds.value = cartItems.value.map(itemKey as any)
})

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
       cartStore.removeItemAction(itemId); 
     } catch (error: unknown) { break; }
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  await cartStore.fetchCartAction();
  
  selectedIds.value = selectedIds.value.filter(id => cartItems.value.some(item => itemKey(item as any) === id));
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
      finalAmount: finalCalculatedAmount.value
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
</style>