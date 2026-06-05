<script setup lang="ts">
import type {
  IProductColorResponse,
  IProductMongoDetail,
  IProductSizeResponse,
} from "../interfaces/product";
import { formatPrice, getMainProductImage, getMinProductPrice } from "../utils/format"; // Đã thêm getMinProductPrice vào import
import { onMounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useCartStore } from "@/stores/cartStore";
import Notification from "./Notification.vue";
import { useAnimationStore } from "@/stores/animation"; // [MỚI] Import store animation
import type { ICartItem } from "@/interfaces/cart";

const useCart = useCartStore();
const animationStore = useAnimationStore(); // [MỚI] Khởi tạo store
const router = useRouter();
const emit = defineEmits(["close"]);
const loading = ref(false);

const props = defineProps<{ product: IProductMongoDetail }>();

// [MỚI] Ref để lấy vị trí ảnh sản phẩm trong DOM
const productImageRef = ref<HTMLElement | null>(null);

const handleClose = () => {
  emit("close");
};

const colorChose = ref<IProductColorResponse>();
const sizeChose = ref<IProductSizeResponse>();
const ind = ref<number>(0); 
const quantity = ref(1);
const showNotification = ref<boolean>(false);
const toastText = ref("");

onMounted(() => {
  // Tự động chọn màu chính hoặc màu đầu tiên
  if (props.product.colors) {
    colorChose.value =
      props.product.colors.find((color) => color.is_main) ||
      props.product.colors[0];
  }

  // Tự động chọn size đầu tiên
  if (colorChose.value) {
    sizeChose.value = colorChose.value.sizes[0];
  }
});

const selectColor = (color: IProductColorResponse, index: number) => {
  colorChose.value = color;
  ind.value = index;
  // Reset size khi đổi màu
  sizeChose.value = color.sizes[0];
};

const selectSize = (size: IProductSizeResponse) => {
  sizeChose.value = size;
};

const increaseQuantity = () => {
  if (sizeChose.value && quantity.value < sizeChose.value.stock) {
    quantity.value++;
  }
};

const decreaseQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--;
  }
};

const handleAddToCart = async () => {
  if (!sizeChose.value) return;


  const login = localStorage.getItem("accessToken") ? true : false;
  if (!login) {
    router.push('auth/login')
    return;
  }

    if (loading.value) return;
    loading.value = true;
    const cartItem: ICartItem = {
        size_id_mongo: sizeChose.value._id,
      product_id_sql: props.product.product_id_sql,
      product_id_mongo: props.product._id,
      quantity: quantity.value || 1
    }

    await useCart.addToCartAction(cartItem);
//     if (useCart.success) {
//       setTimeout(() => {
//         loading.value = false;
//         handleClose();
//       }, 1500);
//     } else {
//         router.push('auth/login')
//         loading.value = false;
//             handleClose();
//     }
    // [MỚI] LOGIC HIỆU ỨNG BAY
    if (productImageRef.value) {
        // Lấy link ảnh hiện tại đang hiển thị để làm hiệu ứng
        const currentImgUrl = colorChose.value?.image_main || getMainProductImage(props.product);
        // Gọi action từ store để tạo hiệu ứng bay
        animationStore.triggerFlyToCart(productImageRef.value, currentImgUrl);
    }

    // Đóng modal ngay lập tức để người dùng thấy hiệu ứng bay trên màn hình chính
    emit("close");
    handleClose();
    loading.value = false;
};

const viewDetail = () => {
  router.push({
    name: "product-detail",
    params: { id: props.product.product_id_sql },
  });
  emit("close");
};

// Tính toán tồn kho & giá
const currentStock = computed(() => sizeChose.value?.stock || 0);
const currentPrice = computed(() => sizeChose.value?.price || getMinProductPrice(props.product));
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
<!--     <Notification :text="toastText" :isSuccess="false" v-if="showNotification" /> -->

    <div
      class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      @click="handleClose"
    ></div>

    <div
      class="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-scale-in"
    >
      <button
        @click="handleClose"
        class="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 text-gray-500 hover:text-black transition-all"
      >
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>

      <div class="w-full md:w-1/2 bg-gray-50 p-6 flex flex-col gap-4">
        <div
          class="aspect-square rounded-xl overflow-hidden bg-white border border-gray-100 relative group shadow-sm"
        >
          <img
            ref="productImageRef"
            :src="colorChose?.image_main || getMainProductImage(product)"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            alt="Product Image"
          />
          
          <div
            v-if="false" 
            class="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md"
          >
            -20%
          </div>
        </div>
        
        <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
           <button
            v-for="(color, index) in product.colors"
            :key="index"
            @click="selectColor(color, index)"
            class="w-16 h-16 flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all"
            :class="
              ind === index
                ? 'border-black ring-1 ring-black/10'
                : 'border-transparent hover:border-gray-300'
            "
          >
            <img
              :src="color.image_main"
              class="w-full h-full object-cover"
            />
          </button>
        </div>
      </div>

      <div class="w-full md:w-1/2 p-6 md:p-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
        <div>
          <h2 class="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
            {{ product.name }}
          </h2>
          <div class="mt-2 flex items-baseline gap-3">
             <span class="text-2xl font-bold text-red-600">
              {{ formatPrice(currentPrice || 0) }}
            </span>
             </div>
        </div>

        <div class="mt-8 space-y-6">
          <div>
            <div class="flex justify-between mb-2">
                 <span class="text-sm font-bold text-gray-900">Màu sắc</span>
                 <span class="text-sm text-gray-500">{{ colorChose?.color }}</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(color, index) in product.colors"
                :key="index"
                @click="selectColor(color, index)"
                class="px-4 py-2 border rounded-lg text-sm font-medium transition-all"
                :class="
                  ind === index
                    ? 'border-black bg-black text-white shadow-md'
                    : 'border-gray-200 text-gray-700 hover:border-gray-400 bg-white'
                "
              >
                {{ color.color }}
              </button>
            </div>
          </div>

          <div>
            <div class="flex justify-between mb-2">
                 <span class="text-sm font-bold text-gray-900">Kích thước</span>
                 <span class="text-xs font-bold text-blue-600 cursor-pointer hover:underline">Hướng dẫn chọn size</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="size in colorChose?.sizes"
                :key="size._id"
                @click="selectSize(size)"
                :disabled="size.stock <= 0"
                class="min-w-[3rem] px-3 py-2 border rounded-lg text-sm font-medium transition-all relative overflow-hidden"
                :class="[
                  sizeChose === size
                    ? 'border-black bg-black text-white shadow-md'
                    : 'border-gray-200 text-gray-700 hover:border-black bg-white',
                  size.stock <= 0 ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                ]"
              >
                {{ size.size }}
                <div v-if="size.stock <= 0" class="absolute inset-0 flex items-center justify-center">
                    <div class="w-full h-px bg-gray-400 rotate-45"></div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <span class="text-sm font-bold text-gray-900 block mb-2">Số lượng</span>
            <div class="flex items-center gap-4">
              <div class="flex items-center border border-gray-300 rounded-lg">
                <button
                  @click="decreaseQuantity"
                  class="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-l-lg transition-colors"
                >
                  <i class="fa-solid fa-minus text-xs"></i>
                </button>
                <input
                  type="text"
                  readonly
                  v-model="quantity"
                  class="w-12 h-10 text-center text-sm font-bold border-x border-gray-300 outline-none"
                />
                <button
                  @click="increaseQuantity"
                  class="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-r-lg transition-colors"
                >
                  <i class="fa-solid fa-plus text-xs"></i>
                </button>
              </div>
              <span class="text-sm text-gray-500">
                Còn lại: <span class="font-bold text-black">{{ currentStock }}</span> sản phẩm
              </span>
            </div>
          </div>
        </div>

        <div class="mt-auto pt-8 border-t border-gray-100">
          <button
            @click="handleAddToCart"
            :disabled="loading || currentStock <= 0"
            class="w-full py-4 bg-black text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <i
              v-if="loading"
              class="fa-solid fa-spinner animate-spin text-sm"
            ></i>
            <span v-else>Thêm vào giỏ hàng</span>
          </button>

          <div class="text-center mt-4">
            <button
              @click="viewDetail"
              class="text-xs font-bold text-gray-500 hover:text-black hover:underline transition-all flex items-center justify-center gap-1 mx-auto"
            >
              Xem chi tiết sản phẩm đầy đủ
              <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
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

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.animate-scale-in {
  animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>