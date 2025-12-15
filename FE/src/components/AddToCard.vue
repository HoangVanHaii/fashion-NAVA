<script setup lang="ts">
import type {
  IProductColorPayload,
  IProductColorResponse,
  IProductMongoDetail,
  IProductSizePayload,
  IProductSizeResponse,
} from "../interfaces/product";
import { formatPrice } from "../utils/format";
import { onMounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
// import { useCartStore } from "../stores/cartStore";
import { useCartStore } from "@/stores/cartStore";
import Notification from "./Notification.vue";
import type { ICartItem } from "@/interfaces/cart";
const useCart = useCartStore();

const router = useRouter();
const emit = defineEmits(["close"]);
const loading = ref(false);

const props = defineProps<{ product: IProductMongoDetail }>();

const handleClose = () => {
  emit("close");
};

const colorChose = ref<IProductColorResponse>();
const sizeChose = ref<IProductSizeResponse>();
const image_main = ref<string>();
const ind = ref<number>(0); // Start at 0
const quantity = ref(1);
// const cart = useCartStore();
const showNotification = ref<boolean>(false);
const toastText = ref("");

onMounted(() => {
  // Auto select main color or first color
  if (props.product.colors) {
    colorChose.value =
      props.product.colors.find((color) => color.is_main) ||
      props.product.colors[0];
  }

  // Auto select first size
  if (colorChose.value) {
    sizeChose.value = colorChose.value.sizes[0];
    image_main.value = colorChose.value.image_main;
  }
});

// Computed list of all images for current color (Main + Thumbnails)
const currentImages = computed(() => {
  if (!colorChose.value) return [];
  const imgs = [colorChose.value.image_main];
  if (colorChose.value.color_images) {
    colorChose.value.color_images.forEach(img => {
      if (typeof img === "string") {
        imgs.push(img);
      } else if (img instanceof File) {
        imgs.push(URL.createObjectURL(img));
      }
    });
  }
  return imgs.filter(Boolean);
});

const selectImage = (img: string, index: number) => {
  image_main.value = img;
  ind.value = index;
};

const preImage = () => {
  if (currentImages.value.length <= 1) return;
  ind.value =
    (ind.value - 1 + currentImages.value.length) % currentImages.value.length;
  image_main.value = currentImages.value[ind.value];
};

const nextImage = () => {
  if (currentImages.value.length <= 1) return;
  ind.value = (ind.value + 1) % currentImages.value.length;
  image_main.value = currentImages.value[ind.value];
};

const handleSelectColor = (color: IProductColorResponse) => {
  colorChose.value = color;
  sizeChose.value = color.sizes[0]; // Reset size when color changes
  image_main.value = color.image_main;
  ind.value = 0;
  quantity.value = 1;
};

const handleAddToCart = async () => {
  if (!sizeChose.value) return;

  showNotification.value = false;
  toastText.value = "";

  const login = localStorage.getItem("accessToken") ? true : false;
  if (!login) {
    setTimeout(() => {
      toastText.value = "Vui lòng đăng nhập để thêm vào giỏ hàng!";
      showNotification.value = true;
    }, 0);
    return;
  }

  if (loading.value) return;
    loading.value = true;
    const cartItem: ICartItem = {
        size_id_mongo: sizeChose.value._id,
        product_id_sql: props.product.product_id_sql,
        quantity: quantity.value || 1
    }

    await useCart.addToCartAction(cartItem);

    if (useCart.success) {
      showNotification.value = true;
      toastText.value = "Thêm vào giỏ hàng thành công!";
      setTimeout(() => {
        loading.value = false;
        handleClose();
      }, 1500);
    } else {
      toastText.value = "Thêm vào giỏ hàng thất bại!";
      showNotification.value = true;
      loading.value = false;
    }
};

const viewDetail = () => {
  router.push({
    name: "product-detail",
    params: { id: props.product.product_id_sql },
  });
};
</script>

<template>
  <!-- Modal Overlay -->
  <div
    class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    @click="handleClose"
  >
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

    <!-- Notification Toast (Local) -->
    <Notification :text="toastText" :isSuccess="showNotification" />

    <!-- Modal Content -->
    <!-- Reduced max-w-4xl to max-w-2xl for smaller width -->
    <div
      class="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] animate-scale-in"
      @click.stop
    >
      <!-- Close Button -->
      <button
        @click="handleClose"
        class="absolute top-3 right-3 z-20 w-7 h-7 flex items-center justify-center bg-white/80 backdrop-blur rounded-full text-gray-500 hover:text-black hover:bg-white transition-colors shadow-sm"
      >
        <i class="fa-solid fa-xmark text-base"></i>
      </button>

      <!-- Left: Image Gallery -->
      <!-- Reduced width on desktop (md:w-5/12 instead of 1/2) -->
      <div class="w-full md:w-6/12 bg-gray-50 relative flex flex-col">
        <!-- Main Image -->
        <div class="relative flex-1 overflow-hidden group">
          <img
            :src="image_main"
            class="w-full h-full object-cover transition-transform duration-500"
            alt="Product Image"
          />

          <!-- Navigation Arrows -->
          <div
            v-if="currentImages.length > 1"
            class="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <button
              @click.stop="preImage"
              class="w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-black hover:bg-black hover:text-white transition-colors"
            >
              <i class="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <button
              @click.stop="nextImage"
              class="w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-black hover:bg-black hover:text-white transition-colors"
            >
              <i class="fa-solid fa-chevron-right text-xs"></i>
            </button>
          </div>
        </div>

        <!-- Thumbnails Strip -->
        <div
          class="p-3 bg-white border-t border-gray-100 overflow-x-auto flex gap-2 scrollbar-hide h-20 items-center"
        >
          <div
            v-for="(img, idx) in currentImages"
            :key="idx"
            @click="selectImage(img, idx)"
            class="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden border cursor-pointer transition-all"
            :class="
              ind === idx
                ? 'border-black ring-1 ring-black/10'
                : 'border-transparent opacity-60 hover:opacity-100'
            "
          >
            <img :src="img" class="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      <!-- Right: Product Info & Actions -->
      <div
        class="w-full md:w-7/12 flex flex-col h-full bg-white overflow-y-auto custom-scrollbar"
      >
        <!-- Reduced padding from p-6 to p-5 -->
        <div class="p-5 md:p-6 space-y-4">
          <!-- Header info -->
          <div>
            <!-- Reduced text size -->
            <h2
              class="text-lg font-bold text-gray-900 mb-1 leading-tight line-clamp-2"
            >
              {{ props.product.name }}
            </h2>
            <p
              class="text-[10px] text-gray-400 font-medium uppercase tracking-wider"
            >
              Mã SP: 1900{{ props.product.product_id_sql }}
            </p>
          </div>

          <!-- Price -->
          <div
            v-if="sizeChose"
            class="flex items-baseline gap-2 border-b border-gray-100 pb-4"
          >
            <!-- Giá hiển thị -->
            <span class="text-2xl font-black text-red-600">
              {{ formatPrice(sizeChose.sale_price ?? sizeChose.price ?? 0) }}
            </span>

            <!-- Giá gốc gạch ngang nếu có sale_price -->
            <span
              v-if="sizeChose.sale_price != null"
              class="text-sm text-gray-400 line-through decoration-gray-300"
            >
              {{ formatPrice(sizeChose.price ?? 0) }}
            </span>

            <!-- Phần trăm giảm giá -->
            <span
              v-if="sizeChose.sale_price != null && sizeChose.price != null"
              class="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-sm"
            >
              -{{
                Math.round(
                  ((sizeChose.price - sizeChose.sale_price) / sizeChose.price) *
                    100
                )
              }}%
            </span>
          </div>

          <!-- Options -->
          <div class="space-y-4">
            <!-- Colors -->
            <div>
              <h3
                class="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide"
              >
                Màu sắc:
                <span class="text-gray-500 normal-case font-medium ml-1">{{
                  colorChose?.color
                }}</span>
              </h3>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="color in props.product.colors"
                  :key="color._id"
                  @click="handleSelectColor(color)"
                  class="w-9 h-9 rounded-full border cursor-pointer overflow-hidden relative transition-all duration-200"
                  :class="
                    colorChose?._id === color._id
                      ? 'border-black ring-1 ring-offset-1 ring-gray-300 scale-110'
                      : 'border-gray-200 hover:border-gray-400'
                  "
                >
                  <img
                    :src="color.image_main"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-if="colorChose?._id === color._id"
                    class="absolute inset-0 bg-black/20 flex items-center justify-center"
                  >
                    <i
                      class="fa-solid fa-check text-white text-[10px] drop-shadow-md"
                    ></i>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sizes -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <h3
                  class="text-xs font-bold text-gray-900 uppercase tracking-wide"
                >
                  Kích thước
                </h3>
                <span
                  class="text-[10px] text-blue-600 cursor-pointer hover:underline"
                  >Bảng size</span
                >
              </div>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="size in colorChose?.sizes"
                  :key="size._id"
                  @click="sizeChose = size"
                  class="py-1.5 text-xs font-bold border rounded-md transition-all duration-200 relative overflow-hidden"
                  :class="[
                    sizeChose?._id === size._id
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'text-gray-700 border-gray-200 hover:border-black hover:text-black bg-white',
                    size.stock <= 0
                      ? 'opacity-40 cursor-not-allowed bg-gray-50'
                      : '',
                  ]"
                  :disabled="size.stock <= 0"
                >
                  {{ size.size }}
                  <div
                    v-if="size.stock <= 0"
                    class="absolute inset-0 flex items-center justify-center"
                  >
                    <div class="w-[120%] h-[1px] bg-gray-400 rotate-45"></div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Quantity -->
            <div>
              <h3
                class="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide"
              >
                Số lượng
              </h3>
              <div
                class="flex items-center justify-between bg-gray-50 rounded-md p-0.5 border border-gray-200 w-fit"
              >
                <button
                  @click="quantity = Math.max(1, quantity - 1)"
                  class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black hover:bg-white rounded transition-all shadow-sm"
                >
                  <i class="fa-solid fa-minus text-[10px]"></i>
                </button>
                <input
                  v-model="quantity"
                  type="number"
                  class="w-10 text-center bg-transparent border-none font-bold text-sm text-gray-900 focus:ring-0"
                />
                <button
                  @click="
                    quantity = Math.min(quantity + 1, sizeChose?.stock || 99)
                  "
                  class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black hover:bg-white rounded transition-all shadow-sm"
                >
                  <i class="fa-solid fa-plus text-[10px]"></i>
                </button>
              </div>
              <p class="text-[10px] text-gray-400 mt-1" v-if="sizeChose">
                {{ sizeChose.stock }} có sẵn
              </p>
            </div>
          </div>
        </div>

        <!-- Bottom Actions (Sticky) -->
        <div
          class="p-5 md:p-6 bg-white border-t border-gray-100 mt-auto sticky bottom-0 z-10"
        >
          <button
            @click="handleAddToCart"
            class="w-full py-3 bg-black text-white rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-gray-800 transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="loading || !sizeChose || sizeChose.stock <= 0"
          >
            <i
              v-if="loading"
              class="fa-solid fa-spinner animate-spin text-xs"
            ></i>
            <span v-else>Thêm vào giỏ hàng</span>
          </button>

          <div class="text-center mt-3">
            <button
              @click="viewDetail"
              class="text-[10px] font-bold text-gray-500 hover:text-black hover:underline transition-all"
            >
              Xem chi tiết sản phẩm
              <i class="fa-solid fa-arrow-right ml-0.5 text-[8px]"></i>
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
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
