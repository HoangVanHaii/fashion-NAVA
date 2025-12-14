<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Header from "../components/Header.vue";
import { formatPrice, formatDateTime, getMainProductImage, checkProductSale, getMinProductPrice, getMaxProductPrice } from "../utils/format";
import type { IProductColorResponse, IProductMongoDetail, IProductSizeResponse} from "../interfaces/product";
// import type { ReviewOfProduct, Review } from "../interfaces/review";
// import { useReviewStore } from "../stores/reviewStore";
// import { useCartStore } from "../stores/cartStore";
import Notification from "@/components/Notification.vue";
// import { useAuthStore } from "../stores/authStore";
import Loading from "../components/Loading.vue";
import { useFavouriteStore } from "../stores/favourite";
import { useAuthStore } from "@/stores/auth";
import { useProductStore } from "@/stores/product";
import type { Category } from "@/interfaces/category";
import type { BrandRatingResult,  IBrandResponse } from "@/interfaces/brand";
import Footer from "@/components/Footer.vue";
import Brand from "./Brand.vue";
// import type { Cart, CartItemDetail, ShopCart } from "../interfaces/cart";

const loadingAddToCart = ref(false);
const favourite = useFavouriteStore();
const auth = useAuthStore();
const route = useRoute();
// const cart = useCartStore();
const router = useRouter();
// const review = useReviewStore();
const product = useProductStore();
const url_main = ref<string>();
const productId = ref<IProductMongoDetail>();
const colorChose = ref<IProductColorResponse>();
const sizeChose = ref<IProductSizeResponse>();
const quantity = ref<number>(1);
const listpProducts = ref<IProductMongoDetail[]>();
const productOfShop = ref<IProductMongoDetail[]>();
const filterReviews = ref<any[]>();
const selectedRating = ref<number | null>(null);
const reviewProduct = ref<any>();
const showReview = ref<boolean>(false);
const indexImage = ref<number>(-1);
const showNotification = ref<boolean>(false);
const copied = ref<Boolean>(false);
const toastText = ref("");
// const shop = ref<ShopDetal>();
const listImg = ref<string[]>([])
const index = ref<number>(0);
const category = ref<Category>()
const brand = ref<IBrandResponse>();
const showBrandModal = ref(false);
const currentBrandId = ref<string>('');
const brandRating = ref<BrandRatingResult>();

const handleOpenBrand = (id: string) => {
    currentBrandId.value = id;
    showBrandModal.value = true;
    
};
const handleOrder = (size: IProductSizeResponse) => {
  // const carttmp = {
  //   cart_item_id: 1,
  //   size_id: size._id,
  //   name: productId.value?.name,
  //   quantity: quantity.value,
  //   price: size.price,
  //   price_after_reduction: size.flash_sale_price,
  //   size: size.size,
  //   color: colorChose.value?.color,
  //   image_url: colorChose.value?.image_url,
  //   total_price: size.flash_sale_price ? size.flash_sale_price * quantity.value : size.price * quantity.value,
  // } as CartItemDetail
  // const carts: CartItemDetail[] = [];
  // carts.push(carttmp);

  // const shop = {
  //   shop_id: productId.value?.shop_id,
  //   shop_name: productId.value?.shop_name,
  //   carts: carts
  // } as ShopCart;
  // const shops: ShopCart[] = [];
  // shops.push(shop);
  // const cartPay = {
  //   shops: shops,
  //   total_quantity: 1,
  //   total_amount: carttmp.total_price
  // } as Cart
  // cart.cartPay = cartPay;
  // router.push({ name: 'payment' });
}

const loadImg = (color: IProductColorResponse) => {
  listImg.value = [];
  index.value = 0;
  if (color) {
    listImg.value.push(color.image_main);
    color.color_images?.forEach(i => {
      listImg.value.push(i.toString());
    })
  }
}

const loadData = async () => {
  const id = route.params.id as string;

  productId.value = await product.getProductByIdStore(id);
  if (productId && productId.value?.colors) {
    colorChose.value = productId.value?.colors.find((cl) => cl.is_main == true);
  }
  if (!colorChose.value && productId.value?.colors) {
    colorChose.value = productId.value?.colors[0];
  }
  loadImg(colorChose.value!);
  sizeChose.value = colorChose.value?.sizes[0];
  url_main.value = colorChose.value?.image_main;

  let result = await product.searchByCategoryIdStore(productId.value?.category_id || "");
  listpProducts.value = result;
  listpProducts.value = result.filter((p) => p._id !== productId.value?._id);

  category.value = await product.getCategoryNameStore(productId.value?.category_id!);
  brand.value = await product.getBrandByIdStore(productId.value?.brand_id!);
  brandRating.value = await product.getRatingOfbrandStore(productId.value?.brand_id!);
  // reviewProduct.value = await review.getReviewsByProductIdStore(id);
  // filterReviews.value = reviewProduct.value?.Reviews;

  // shop.value = await auth.getShopByidStore(productId.value?.shop_id || 3);
  // let shopStore: ProductSummary[] = await product.getProductByShopStore(
  //   productId.value?.shop_id || 3
  // );
  // productOfShop.value = shopStore.filter((p) => p.id !== productId.value?.id);
};

onMounted(async () => {
  await loadData();
  favourite.getFavouriteOfMeStore();
});

watch(quantity, (newVal) => {
  const max = sizeChose.value?.stock ?? Infinity;

  if (newVal < 1) {
    quantity.value = 1;
  } else if (newVal > max) {
    quantity.value = max;
  }
});

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId !== oldId) {
      router.go(0);
    }
  }
);

const getUniqueSizes = () => {
  const getUniqueSizes = new Set<string>();
  productId.value?.colors.forEach((color) => {
    color.sizes.forEach((size) => {
      getUniqueSizes.add(size.size);
    });
  });
  return [...getUniqueSizes].join(" - ");
};

const getStarFill = (starIndex: number, rating: number): number => {
  if (starIndex <= Math.floor(rating)) {
    return 100;
  } else if (starIndex - 1 < rating && rating < starIndex) {
    return (rating - (starIndex - 1)) * 100;
  } else {
    return 0;
  }
};

const handleFilter = async (rating: number | null) => {
  // selectedRating.value = rating;
  // if (!reviewProduct.value) return;

  // if (rating === null) {
  //   filterReviews.value = reviewProduct.value.Reviews;
  // } else {
  //   filterReviews.value = reviewProduct.value.Reviews.filter(
  //     (review) => review.rating === rating
  //   );
  // }
};

const handleIncre = () => {
  indexImage.value++;
  if (indexImage.value >= 4) {
    indexImage.value = -1;
  }
  // Sync for mobile
  if(index.value < listImg.value.length - 1) index.value++;
  else index.value = 0;
};

const hanlderDecre = () => {
  indexImage.value--;
  if (indexImage.value < -1) {
    indexImage.value = 3;
  }
    // Sync for mobile
  if(index.value > 0) index.value--;
  else index.value = listImg.value.length - 1;
};

const handleAddToCart = async (size: IProductSizeResponse) => {
    showNotification.value = false;
    toastText.value = "";
    if (loadingAddToCart.value) return;
    loadingAddToCart.value = true;
    // await cart.addToCartStore(size.id!, quantity.value || 1);
    loadingAddToCart.value = false;
  // if (cart.success) {
  //   showNotification.value = true;
  //   toastText.value = "🛒 Thêm vào giỏ hàng thành công!";
  // } else {
  //   toastText.value = cart.error || "❌ Thêm vào giỏ hàng thất bại!";
  //   showNotification.value = false;
  // }
};

const copiedLink = () => {
  const path = route.fullPath;
  const baseUrl = window.location.origin;
  navigator.clipboard.writeText(baseUrl + path);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1000);
};

// Computed to ensure we always have an image to show
const currentMainImage = computed(() => {
    if(listImg.value && listImg.value.length > 0 && listImg.value[index.value]) {
        return listImg.value[index.value] ;
    }
    return colorChose.value?.image_main;
})

</script>

<template>
  <Header />
  <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900">
    <Notification :text="toastText" :isSuccess="showNotification" />
    <Loading :loading="product.loading" />

    <main v-if="!product.loading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Main Layout: Grid 12 Columns -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 relative">
        
        <!-- Left Column: Gallery (Sticky on Desktop potentially, but usually Info is sticky) -->
        <div class="lg:col-span-6 space-y-6">
          <!-- Main Image Card -->
          <!-- Reduced height on desktop from lg:h-[700px] to lg:h-[500px] -->
          <div class="relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 group aspect-[4/5] lg:aspect-auto lg:h-[670px]">
            <img 
              :src="currentMainImage" 
              class="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105 cursor-zoom-in"
              alt="Main Product Image"
            />
            
            <!-- Floating Navigation (Mobile) -->
            <div class="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between lg:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                <button @click="hanlderDecre" class="w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center text-black hover:bg-black hover:text-white transition-all">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <button @click="handleIncre" class="w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center text-black hover:bg-black hover:text-white transition-all">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>

            <!-- Discount Badge -->
             <div v-if="sizeChose?.sale_price" class="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wide animate-pulse">
                Sale -{{ Math.round((1 - (sizeChose.sale_price / (sizeChose.price || 1))) * 100) }}%
            </div>
          </div>

          <!-- Thumbnails Row -->
          <!-- Changed from grid-cols-5 to grid-cols-6 for smaller thumbnails -->
          <div class="grid grid-cols-6">
            <div 
              v-for="(imgSrc, i) in listImg" 
              :key="i"
              class="aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-300 transform hover:-translate-y-1"
              :class="index === i ? 'border-black ring-2 ring-black/10' : 'border-transparent opacity-60 hover:opacity-100'"
              @click="index = i"
            >
              <img :src="imgSrc" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <!-- Right Column: Info & Actions (Sticky) -->
        <div class="lg:col-span-6 relative">
            <div class="lg:sticky lg:top-28 space-y-8 bg-white p-6 lg:p-8 rounded-3xl shadow-xl border border-gray-100/50">
                
                <!-- Header Info -->
                <div class="space-y-4">
                    <div class="flex justify-between items-start">
                        <!-- Reduced text size from text-3xl lg:text-4xl to text-2xl lg:text-3xl -->
                        <h1 class="text-2xl lg:text-3xl font-black text-gray-900 leading-tight tracking-tight">{{ productId?.name }}</h1>
                        
                        <!-- Wishlist Button -->
                        <button 
                            @click.stop="productId && favourite.toggleFavouriteInstant(productId.product_id_sql)"
                            class="w-10 h-10 flex-shrink-0 rounded-full bg-gray-50 hover:bg-red-50 flex items-center justify-center transition-colors group focus:outline-none focus:ring-0"
                        >
                             <i :class="productId && favourite.isFavourite(productId.product_id_sql) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-gray-400 group-hover:text-red-500'"></i>
                        </button>
                    </div>

                    <div class="flex items-center gap-4 text-sm">
                        <div class="flex text-yellow-400 text-xs">
                             <i class="fa-solid fa-star" v-for="n in 5" :key="n" :class="n <= Math.round(5) ? '' : 'text-gray-200'"></i>
                             <!-- <i class="fa-solid fa-star" v-for="n in 5" :key="n" :class="n <= Math.round(reviewProduct?.average_rating || 5) ? '' : 'text-gray-200'"></i> -->
                        </div>
                        <span class="text-gray-400">|</span>
                        <span class="text-gray-500">Mã SP: <span class="font-mono font-medium text-black">{{ productId?.product_id_sql }}</span></span>
                    </div>

                    <!-- Price Block -->
                    <div class="flex items-end gap-3 pt-2">
                        <!-- Reduced text size from text-4xl to text-3xl -->
                        <span class="text-3xl font-black text-gray-900">
                            {{ formatPrice(sizeChose?.sale_price || sizeChose?.price || 0) }}
                        </span>
                        <span v-if="sizeChose?.sale_price" class="text-lg text-gray-400 line-through mb-1 font-medium">
                            {{ formatPrice(sizeChose?.price || 0) }}
                        </span>
                    </div>
                </div>

                <hr class="border-dashed border-gray-200" />

                <!-- Selectors -->
                <div class="space-y-6">
                    <!-- Color -->
                    <div>
                        <!-- Reduced text size from text-sm font-bold to text-xs font-bold -->
                        <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Màu sắc</h3>
                        <div class="flex flex-wrap gap-3">
                            <div 
                                v-for="(color, i) in productId?.colors" 
                                :key="i"
                                class="group relative w-12 h-12 cursor-pointer rounded-full overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md"
                                :class="colorChose?._id === color._id ? 'ring-2 ring-offset-2 ring-black scale-110' : 'hover:scale-105'"
                                @click="
                                colorChose = color;
                                sizeChose = colorChose?.sizes[0];
                                quantity = 1;
                                loadImg(color);
                                "
                            >
                                <img :src="color.image_main" class="w-full h-full object-cover" />
                                <div v-if="colorChose?._id === color._id" class="absolute inset-0 bg-black/10 flex items-center justify-center">
                                    <i class="fa-solid fa-check text-white text-xs drop-shadow-md"></i>
                                </div>
                            </div>
                        </div>
                        <p class="text-xs text-gray-500 mt-2 font-medium">Đang chọn: <span class="text-black">{{ colorChose?.color }}</span></p>
                    </div>

                    <!-- Size -->
                    <div>
                        <div class="flex justify-between items-center mb-3">
                             <!-- Reduced text size from text-sm font-bold to text-xs font-bold -->
                             <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wide">Kích thước</h3>
                             <span class="text-xs text-blue-600 font-medium cursor-pointer hover:underline underline-offset-2">Bảng quy đổi size</span>
                        </div>
                        <div class="grid grid-cols-4 gap-2">
                            <!-- Reduced py from 3 to 2 -->
                            <button
                                v-for="(size, i) in colorChose?.sizes"
                                :key="i"
                                class="py-2 text-sm font-bold border rounded-xl transition-all duration-200 relative overflow-hidden"
                                :class="size === sizeChose 
                                    ? 'border-black bg-black text-white shadow-lg shadow-black/20 transform scale-105' 
                                    : 'border-gray-200 text-gray-600 hover:border-black hover:text-black bg-white'"
                                @click="sizeChose = size"
                            >
                                {{ size.size }}
                                <span v-if="size === sizeChose" class="absolute top-0 right-0 w-2 h-2 bg-white rounded-bl-md"></span>
                            </button>
                        </div>
                    </div>

                    <!-- Quantity -->
                    <div>
                        <!-- Reduced text size from text-sm font-bold to text-xs font-bold -->
                        <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Số lượng</h3>
                        <div class="flex items-center justify-between bg-gray-50 rounded-xl p-2 border border-gray-200">
                             <div class="flex items-center">
                                <button class="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-black hover:shadow-md transition-all active:scale-95" @click="quantity = Math.max(quantity - 1, 1)">
                                    <i class="fa-solid fa-minus text-xs"></i>
                                </button>
                                <input v-model="quantity" type="number" class="w-16 text-center bg-transparent border-none font-bold text-lg focus:ring-0 outline-none m-0" />
                                <button class="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-black hover:shadow-md transition-all active:scale-95" @click="quantity = Math.min(quantity + 1, sizeChose?.stock || 99)">
                                    <i class="fa-solid fa-plus text-xs"></i>
                                </button>
                             </div>
                             <span class="text-xs font-medium px-4 py-1 bg-white rounded-full border border-gray-100 text-gray-500 shadow-sm" :class="{'text-red-500 bg-red-50 border-red-100': sizeChose?.stock === 0}">
                                {{ sizeChose?.stock === 0 ? 'Hết hàng' : `${sizeChose?.stock} có sẵn` }}
                             </span>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex flex-col gap-3 pt-4">
                     <button 
                        @click="handleOrder(sizeChose!)"
                        :disabled="sizeChose?.stock == 0"
                        class="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg shadow-xl shadow-gray-900/20 hover:bg-black hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                        MUA NGAY
                    </button>
                    <button 
                        @click="handleAddToCart(sizeChose!)"
                        :disabled="sizeChose?.stock == 0 || loadingAddToCart"
                        class="w-full py-4 bg-white text-black border-2 border-black rounded-xl font-bold text-lg hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <i v-if="!loadingAddToCart" class="fa-solid fa-cart-plus"></i>
                        {{ loadingAddToCart ? 'Đang xử lý...' : 'Thêm vào giỏ' }}
                    </button>
                </div>
                
                <!-- Trust Badges -->
                 <div class="grid grid-cols-3 gap-2 pt-4">
                    <div class="flex flex-col items-center text-center gap-1 p-2 bg-gray-50 rounded-lg">
                        <i class="fa-solid fa-shield-halved text-gray-400 mb-1"></i>
                        <span class="text-[10px] font-medium text-gray-600 leading-tight">Chính hãng 100%</span>
                    </div>
                    <div class="flex flex-col items-center text-center gap-1 p-2 bg-gray-50 rounded-lg">
                         <i class="fa-solid fa-rotate-left text-gray-400 mb-1"></i>
                        <span class="text-[10px] font-medium text-gray-600 leading-tight">Đổi trả 7 ngày</span>
                    </div>
                     <div class="flex flex-col items-center text-center gap-1 p-2 bg-gray-50 rounded-lg">
                         <i class="fa-solid fa-truck-fast text-gray-400 mb-1"></i>
                        <span class="text-[10px] font-medium text-gray-600 leading-tight">Giao nhanh 24h</span>
                    </div>
                 </div>

            </div>
        </div>
      </div>

      <!-- Shop Info Section - Redesigned as a Card -->
      <div class="bg-white rounded-2xl p-6 mb-16 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow duration-300">
        <div class="flex items-center gap-6">
            <div class="w-20 h-20 rounded-full border-4 border-gray-50 overflow-hidden shadow-inner">
                <img :src="brand?.logo" class="w-full h-full object-cover" />
            </div>
            <div>
                <div class="flex items-center gap-2 mb-1">
                     <!-- Reduced text size from text-xl to text-lg -->
                     <h3 class="font-bold text-lg text-black">{{ brand?.name }}</h3>
                     <span class="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Official</span>
                </div>
                
                <p class="text-sm text-gray-500 mb-3 max-w-md line-clamp-1">{{ brand?.description }}</p>
                <div class="flex items-center gap-6 text-sm">
                    <div class="flex items-center gap-1.5">
                        <i class="fa-solid fa-star text-yellow-400"></i>
                        <span class="text-black font-bold">{{ brandRating?.average_rating?.toFixed(1) || 'N/A' }}</span>
                        <span class="text-gray-400 text-xs">Rating</span>
                    </div>
                    <div class="w-px h-4 bg-gray-200"></div>
                     <div class="flex items-center gap-1.5">
                        <i class="fa-solid fa-eye text-gray-400"></i>
                        <span class="text-black font-bold">{{ brandRating?.total_reviews }}</span>
                         <span class="text-gray-400 text-xs">Lượt đánh gái</span> 
                    </div>
                </div>
            </div>
        </div>
        <div class="flex gap-3 w-full md:w-auto">
             <button @click="handleOpenBrand(productId?.brand_id!)" class="flex-1 md:flex-none px-8 py-3 bg-black text-white rounded-xl shadow-lg shadow-gray-300 hover:bg-gray-800 hover:-translate-y-0.5 transition-all text-sm font-bold">
                <i class="fa-solid fa-store mr-2"></i>Xem Thương Hiệu
             </button>
             <button class="flex-1 md:flex-none px-8 py-3 bg-white border border-gray-200 text-black rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-bold">
                Chat Ngay
             </button>
        </div>
      </div>

      <!-- Detail & Reviews Tabs -->
      <div class="mb-16 bg-white rounded-3xl shadow-xl border border-gray-120 overflow-hidden">
         <!-- Tabs Header -->
         <div class="flex border-b border-gray-100 bg-gray-50/50">
            <button 
                class="flex-1 py-5 text-center font-bold text-base transition-colors relative rounded-tl-3xl focus:outline-none focus:ring-0"
                :class="!showReview ? 'text-black bg-white' : 'text-gray-400 hover:text-gray-600'"
                @click="showReview = false"
            >
                Chi tiết sản phẩm
                <span v-if="!showReview" class="absolute top-0 left-0 w-full h-1 bg-black"></span>
            </button>
            <button 
                class="flex-1 py-5 text-center font-bold text-base transition-colors relative rounded-tr-3xl focus:outline-none focus:ring-0"
                 :class="showReview ? 'text-black bg-white' : 'text-gray-400 hover:text-gray-600'"
                @click="showReview = true"
            >
                Đánh giá ({{ reviewProduct?.total_reviews || 0 }})
                 <span v-if="showReview" class="absolute top-0 left-0 w-full h-1 bg-black"></span>
            </button>
         </div>

         <!-- Content Area -->
         <div class="p-8 lg:p-12">
            <!-- Product Description Content -->
            <div v-if="!showReview" class="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-fade-in">
                <div class="lg:col-span-2 space-y-6 text-gray-700 leading-loose">
                    <div class="bg-gray-50 p-8 rounded-2xl border border-gray-100">
                        <!-- Reduced text size from text-xl to text-lg -->
                        <h4 class="font-bold text-black text-lg mb-6 flex items-center gap-2">
                            <i class="fa-solid fa-circle-info text-gray-400"></i> Thông số kỹ thuật
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                            <div class="flex justify-between border-b border-gray-200 pb-2"><span class="text-gray-500">Thương hiệu</span> <span class="font-bold text-black">NAVA</span></div>
                            <div class="flex justify-between border-b border-gray-200 pb-2"><span class="text-gray-500">Danh mục</span> <span class="font-bold text-black">{{ category?.category_name }}</span></div>
                            <div class="flex justify-between border-b border-gray-200 pb-2"><span class="text-gray-500">Chất liệu</span> <span class="font-bold text-black">Cotton cao cấp</span></div>
                            <div class="flex justify-between border-b border-gray-200 pb-2"><span class="text-gray-500">Xuất xứ</span> <span class="font-bold text-black">Việt Nam</span></div>
                        </div>
                    </div>
                    
                    <div class="prose max-w-none text-gray-600">
                        <p class="mb-4">Mô tả chi tiết về sản phẩm đang được cập nhật. Sản phẩm này được thiết kế với phong cách hiện đại, phù hợp cho cả đi làm và đi chơi. Chất liệu vải thoáng mát, thấm hút mồ hôi tốt.</p>
                        <p>Hướng dẫn bảo quản: Giặt máy ở nhiệt độ thường, không dùng chất tẩy mạnh, phơi trong bóng râm.</p>
                    </div>

                    <!-- Marketing Images in Description -->
                    <div class="grid grid-cols-3 gap-4 pt-4" >
                        <img v-if="colorChose?.color_images?.[1]" :src="colorChose.color_images[1].toString()" class="rounded-xl w-full h-64 object-cover shadow-sm transition-transform hover:scale-[1.02] duration-500" />
                        <img v-if="colorChose?.color_images?.[2]" :src="colorChose.color_images[2].toString()" class="rounded-xl w-full h-64 object-cover shadow-sm transition-transform hover:scale-[1.02] duration-500" />
                        <img v-if="colorChose?.color_images?.[0]" :src="colorChose.color_images[0].toString()" class="rounded-xl w-full h-64 object-cover shadow-sm transition-transform hover:scale-[1.02] duration-500" />                        
                    </div>
                </div>
                
                <!-- Right Side Banner in Description -->
                <div class="hidden lg:block bg-black text-white rounded-2xl p-8 h-fit sticky top-28">
                    <!-- Reduced text size from text-2xl to text-xl -->
                    <h4 class="text-xl font-bold mb-4">Tại sao chọn NAVA?</h4>
                    <ul class="space-y-4">
                        <li class="flex gap-3">
                            <i class="fa-solid fa-check text-green-400 mt-1"></i>
                            <span class="text-sm text-gray-300">Thiết kế độc quyền, cập nhật xu hướng mới nhất.</span>
                        </li>
                        <li class="flex gap-3">
                            <i class="fa-solid fa-check text-green-400 mt-1"></i>
                            <span class="text-sm text-gray-300">Kiểm tra hàng thoải mái trước khi thanh toán.</span>
                        </li>
                         <li class="flex gap-3">
                            <i class="fa-solid fa-check text-green-400 mt-1"></i>
                            <span class="text-sm text-gray-300">Hỗ trợ đổi size nhanh chóng trong 7 ngày.</span>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Review Section -->
            <div v-else class="space-y-10 animate-fade-in">
                <!-- Rating Summary -->
                <div class="flex flex-col md:flex-row gap-10 bg-gray-50 p-10 rounded-2xl items-center justify-center">
                    <div class="text-center md:border-r md:border-gray-200 md:pr-10">
                        <!-- Reduced text size from text-6xl to text-5xl -->
                        <div class="text-5xl font-black text-gray-900 mb-2">{{ Math.round((reviewProduct?.average_rating ?? 0) * 10) / 10 }}</div>
                        <div class="flex justify-center text-yellow-400 text-xl mb-2">
                             <i class="fa-solid fa-star" v-for="n in 5" :key="n" :class="n <= Math.round(reviewProduct?.average_rating || 0) ? '' : 'text-gray-200'"></i>
                        </div>
                        <div class="text-sm font-medium text-gray-500">Dựa trên {{ reviewProduct?.total_reviews  || 0   }} đánh giá</div>
                    </div>
                    
                    <!-- Filter Buttons -->
                    <div class="flex-1 flex flex-wrap gap-3 justify-center md:justify-start">
                        <button 
                            @click="handleFilter(null)"
                            class="px-6 py-2 rounded-full border transition-all text-sm font-bold shadow-sm"
                            :class="selectedRating === null ? 'border-black bg-black text-white shadow-md transform scale-105' : 'border-gray-200 bg-white text-gray-600 hover:border-black hover:text-black'"
                        >
                            Tất cả
                        </button>
                        <button 
                            v-for="n in 5" :key="n"
                            @click="handleFilter(n)"
                            class="px-6 py-2 rounded-full border transition-all text-sm font-bold shadow-sm"
                            :class="selectedRating === n ? 'border-black bg-black text-white shadow-md transform scale-105' : 'border-gray-200 bg-white text-gray-600 hover:border-black hover:text-black'"
                        >
                            {{ n }} Sao
                        </button>
                    </div>
                </div>

                <!-- Review List -->
                <div class="space-y-6">
                    <div v-if="filterReviews?.length === 0" class="text-center py-12">
                         <div class="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                             <i class="fa-regular fa-comment-dots text-2xl text-gray-400"></i>
                         </div>
                        <p class="text-gray-500 font-medium">Chưa có đánh giá nào cho bộ lọc này.</p>
                    </div>
                    
                    <div v-for="(reviewItem, idx) in filterReviews" :key="idx" class="bg-gray-50 rounded-2xl p-6 transition-transform hover:bg-gray-100 duration-300">
                        <div class="flex items-start gap-4">
                            <img :src="reviewItem.user_image_url" class="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                            <div class="flex-1">
                                <div class="flex justify-between items-start mb-1">
                                    <h5 class="font-bold text-gray-900">{{ reviewItem.user_name }}</h5>
                                    <span class="text-xs font-medium text-gray-400 bg-white px-2 py-1 rounded border border-gray-100">{{ formatDateTime(reviewItem.created_at) }}</span>
                                </div>
                                <div class="flex text-yellow-400 text-xs mb-3">
                                    <i v-for="n in 5" :key="n" class="fa-solid fa-star" :class="n <= Math.round(reviewItem.rating) ? '' : 'text-gray-300'"></i>
                                </div>
                                <p class="text-gray-700 leading-relaxed">{{ reviewItem.comment }}</p>
                                
                                <!-- Review Images -->
                                <div v-if="reviewItem.review_images?.length" class="flex gap-3 mt-4">
                                    <img v-for="(img, i) in reviewItem.review_images" :key="i" :src="img.image_url" class="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-80 transition" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
         </div>
      </div>

      <!-- Related Products -->
      <div v-if="listpProducts && listpProducts.length > 0" class="mb-12">
        <div class="flex items-center justify-between mb-8">
             <h3 class="text-xl font-black text-gray-900 uppercase tracking-tight">Có thể bạn sẽ thích</h3>
             <a href="#" class="text-sm font-bold text-black border-b border-black pb-0.5 hover:opacity-70 transition">Xem tất cả</a>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
            <div 
                v-for="prod in listpProducts.slice(0, 5)" 
                :key="prod._id"
                class="group cursor-pointer rounded-2xl p-4 shadow-md hover:shadow-xl transition-all duration-300"
                @click="router.push({ name: 'product-detail', params: { id: prod.product_id_sql } })"
            >
                <div class="relative aspect-[3/4] overflow-hidden bg-gray-200 rounded-2xl mb-4 shadow-sm border border-gray-100">
                    <img :src="getMainProductImage(prod)" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <!-- Badge -->
                    <span v-if="checkProductSale(prod)" class="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-md tracking-wide">SALE</span>

                    <!-- Quick Action Overlay - FIXED: Added opacity-0 and changed animation logic -->
                    <div class="absolute inset-x-0 bottom-4 flex justify-center gap-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10">
                        <button class="w-10 h-10 bg-white text-black rounded-full shadow-lg hover:bg-black hover:text-white transition-all flex items-center justify-center transform hover:scale-110 focus:outline-none">
                            <i class="fa-solid fa-cart-plus"></i>
                        </button>
                        <button 
                            class="w-10 h-10 bg-white text-black rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-all flex items-center justify-center transform hover:scale-110 focus:outline-none"
                            @click.stop="favourite.toggleFavouriteInstant(prod.product_id_sql)"
                        >
                            <i :class="favourite.isFavourite(prod.product_id_sql) ? 'fa-solid fa-heart text-red-500 hover:text-white' : 'fa-regular fa-heart'"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Info Section - FIXED: Layout & Spacing -->
                <div class="space-y-1">
                    <h4 class="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors" :title="prod.name">
                        {{ prod.name }}
                    </h4>
                    <div class="flex items-center justify-center gap-2 flex-wrap">
                        <span class="text-base  font-black text-red-600">
                            {{ formatPrice(getMinProductPrice(prod) || 0) }}
                        </span>
                        <span v-if="checkProductSale(prod)" class="text-xs text-gray-400 line-through font-medium">
                            {{ formatPrice(getMaxProductPrice(prod) || 0) }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
      </div>
      <Brand
            :show="showBrandModal" 
            :brandId="currentBrandId" 
            @close="showBrandModal = false" 
        />
    </main>
  </div>
  <Footer />
</template>

<style scoped>
/* Custom Scrollbar for image list if needed */
.overflow-x-auto::-webkit-scrollbar {
  height: 4px;
}
.overflow-x-auto::-webkit-scrollbar-thumb {
  background-color: #ddd;
  border-radius: 4px;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
}

/* Remove Number Input Arrows */
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
/* input[type=number] {
  -moz-appearance: textfield;
} */

.cursor-zoom-in {
    cursor: zoom-in;
}
</style>