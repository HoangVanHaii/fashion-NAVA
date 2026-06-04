<script setup lang="ts">
// import bannerImage1 from "../assets/homes/banner.jpg";
// import bannerImage2 from "../assets/homes/banner1.jpg";
// import bannerImage3 from "../assets/homes/banner2.jpg";
// import bannerItem1 from "../assets/homes/banner-item1.jpg";
// import bannerItem2 from "../assets/homes/banner-item2.jpg";
// import bannerItem3 from "../assets/homes/banner-item3.jpg";
// import bannerItem4 from "../assets/homes/banner-item4.jpg";
// import flashSale from "../assets/homes/flash-sale.jpg";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import PoLo from "../assets/homes/PoLoTrangHome.jpg";
import DoDa from "../assets/homes/DoDaTrangHome.jpg";
import {
    checkProductSale,
  formatPrice,
  getMaxProductPrice,
  getMinProductPrice,
} from "../utils/format";
import type { Voucher } from "../interfaces/voucher";
import type { IProductColorResponse, IProductMongoDetail, IProductSizeResponse } from "../interfaces/product";
import type { FlashSale, FlashSaleProductSold } from "../interfaces/flashSale";
import { onBeforeUnmount, onMounted, computed, ref, watch, onUnmounted } from "vue";
import { useProductStore } from "../stores/product";
import { voucherStore } from "../stores/voucher";
import { flashSaleStore } from "../stores/flashSale";
import AddToCart from "../components/AddToCard.vue";
import { useFavouriteStore } from "../stores/favourite";
import { useRouter } from "vue-router";
import { Colors } from "chart.js";
import Loading from "@/components/Loading.vue";
// const favourite = useFavouriteStore();
const router = useRouter();
const loadingHome = ref(false);
// const banners = [bannerImage1, bannerImage2, bannerImage3];
const useProduct = useProductStore();
const useVoucher = voucherStore();
const useFlashSale = flashSaleStore();
const currentIndex = ref(0);
let timer: number = 1;
const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);
const flashSaleHomes = ref<FlashSale | null>(null);
const flashSaleProducts = ref<IProductMongoDetail[]>([]);
const vouchers = ref<Voucher[]>([]);
const totalSolds = ref<FlashSaleProductSold[]>([]);
const productBestSeller = ref<IProductMongoDetail[]>([]);
const productLatests = ref<IProductMongoDetail[]>([]);
const showAll = ref(false);
const showMoreBestSeller = ref(false);
const showMoreNewArrivals = ref(false);
const showFormAdd = ref(false);
import { useAuthStore } from "@/stores/auth";
const userStore = useAuthStore();
const favourite = useFavouriteStore();
const copiedList = ref<boolean[]>([]);

const textTmp = `Tối giản nhưng không đơn điệu – Dòng sản phẩm Polo của Giovanni Outlet chinh phục quý ông bởi sự tinh tế trong từng chi tiết. Chất liệu cotton thượng hạng kết hợp với đường may sắc sảo.`;
const textAoda = `Sở hữu chất liệu cao cấp cùng kỹ thuật chế tác tinh tế, bộ sưu tập đồ da nam Giovanni Outlet thể hiện sự trau chuốt trong từng chi tiết, mang đến trải nghiệm khác biệt.`;

const displayedProducts = computed(() => {
  if ( !flashSaleProducts.value || !flashSaleProducts.value.length) return [];
  return showAll.value
    ? flashSaleProducts.value
    : flashSaleProducts.value.slice(0, 5);
});

const displayedBestSellerProducts = computed(() => {
  if (!productBestSeller.value) return [];
  return showMoreBestSeller.value
    ? productBestSeller.value
    : productBestSeller.value.slice(0, 5);
});
const displayedNewArrivalsProducts = computed(() => {
  if (!productLatests.value) return [];
  return showMoreNewArrivals.value
    ? productLatests.value
    : productLatests.value.slice(0, 5);
});

const btnShowMoreProductSale = () => {
  showAll.value = !showAll.value;
};

const btnShowMoreBestSeller = () => {
  showMoreBestSeller.value = !showMoreBestSeller.value;
};
const btnshowMoreNewArrivals = () => {
  showMoreNewArrivals.value = !showMoreNewArrivals.value;
};
const productDetail = ref<IProductMongoDetail>();
const handleCart = async (product: IProductMongoDetail) => {
  if (product) {
    productDetail.value = product;
    showFormAdd.value = true;
  }
};

onMounted(async () => {
    loadingHome.value = true;
  const [vouchersData, flashSaleData] = await Promise.all([
    useVoucher.getTop4VoucherGlobal(),
    useFlashSale.getFlashSaleHome(),
  ]);
  vouchers.value = vouchersData;
    flashSaleHomes.value = flashSaleData?.flash_sale;
    flashSaleProducts.value = flashSaleData?.products;
  localStorage.setItem(
    "excludeIdHome",
    
    flashSaleHomes.value?.id ? flashSaleHomes.value.id.toString() : ""
  );

  const promises = [
    useProduct.getProductBestSellerStore(20),
    useProduct.getProductLatestStore(20),
  ];
  const [bestSellerData, latestData] = await Promise.all(promises);
        loadingHome.value = false;

  productBestSeller.value = bestSellerData ?? [];
  productLatests.value = latestData ?? [];

  
  if (userStore.isLogin) {
    await favourite.getFavouriteOfMeStore()
    }

  setTime();
  countdown = setInterval(setTime, 1000);
  window.addEventListener('scroll', handleScroll);

});
const productMale = ref<IProductMongoDetail[]>([]);
const productFemale = ref<IProductMongoDetail[]>([]);
const hasFetchedData = ref(false);
const handleScroll = async () => {
    const currentScroll = window.scrollY || document.documentElement.scrollTop;
    if (currentScroll >= 1500 && !hasFetchedData.value) {
        hasFetchedData.value = true;         
        try {
            const [femaleData, maleData] = await Promise.all([
                useProduct.searchByCategoryGenderStore('Nữ'),
                useProduct.searchByCategoryGenderStore('Nam')
            ]);

            productFemale.value = femaleData;
            productMale.value = maleData; 
            
        } catch (error) {
            console.error(error);
        }
    } 
};
onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
});
const getMainProductImage = (product: any): string => {
  if (!product?.colors?.length) return "";

  const mainColor = product.colors.find((c: any) => c.is_main === true);

  return mainColor?.image_main || product.colors[0].image_main || "";
};

// const prevImage = () => {
//   currentIndex.value =
//     (currentIndex.value - 1 + banners.length) % banners.length;
// };
// const nextImage = () => {
//   currentIndex.value =
//     (currentIndex.value + 1 + banners.length) % banners.length;
// };
// const bannerItems = [bannerItem1, bannerItem2, bannerItem3, bannerItem4];
// const startDate = computed(() => flashSaleHomes.value?.start_date);
const endDate = computed(() => flashSaleHomes.value?.end_date);

let countdown: number;
const setTime = () => {
  if (!endDate.value) return;
  const endUtc = new Date(endDate.value);
  const end = new Date(
    endUtc.getUTCFullYear(),
    endUtc.getUTCMonth(),
    endUtc.getUTCDate(),
    23,
    59,
    0
  ).getTime();

  const now = new Date().getTime();
  const distance = end - now;
  if (distance <= 0) {
    hours.value = minutes.value = seconds.value = 0;
    clearInterval(countdown);
    return;
  }
  hours.value = Math.floor(distance / (1000 * 60 * 60));
  minutes.value = Math.floor((distance / (1000 * 60)) % 60);
  seconds.value = Math.floor((distance / 1000) % 60);
};
watch(
  () => flashSaleHomes.value?.end_date,
  () => {
    setTime();
  }
);
const getTotalSold = (product: any): number => {
  let totalSold = 0;

  if (!product.colors) return 0;

  product.colors.forEach((color: any) => {
    if (!color.sizes) return;
    color.sizes.forEach((size: any) => {
      totalSold += size.sale_sold || 0;
    });
  });

  return totalSold;
};
const getTotalStock = (product: any): number => {
  let totalSold = 0;

  if (!product.colors) return 0;

  product.colors.forEach((color: any) => {
    if (!color.sizes) return;
    color.sizes.forEach((size: any) => {
      totalSold += size.sale_sold || 0;
    });
  });

  return totalSold;
};
const copyText = async (text: string, index: number, voucher_id: number) => {
  navigator.clipboard.writeText(text);
  copiedList.value[index] = true;

  setTimeout(() => {
    copiedList.value[index] = false;
  }, 1000);
  //   await voucher.saveVoucherStore(voucher_id);
};
onBeforeUnmount(() => {
  clearInterval(timer);
  clearInterval(countdown);
});
const getDiscountPercent = (
  originalPrice: number,
  flashPrice?: number
): number => {
  if (!flashPrice || flashPrice >= originalPrice) return 0;
  const percent = ((originalPrice - flashPrice) / originalPrice) * 100;
  return Math.round(percent);
};

const checkProductSoldOut = (product: any) => {
  let totalSaleStock = 0;
  let totalSold = 0;

  product.colors.forEach((color: any) => {
    color.sizes.forEach((size: any) => {
      totalSaleStock += size.sale_stock || 0;
      totalSold += size.sale_sold || 0;
    });
  });

  return totalSaleStock === totalSold;
};

const getSoldPercentage = (product: any): number => {
  let totalSaleStock = 0;
  let totalSold = 0;

  product.colors.forEach((color: any) => {
    color.sizes.forEach((size: any) => {
      totalSaleStock += size.sale_stock || 0;
      totalSold += size.sale_sold || 0;
    });
  });

  if (totalSaleStock === 0) return 0; // tránh chia cho 0
  return totalSold / totalSaleStock;
};
</script>

<template>
  <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900">
    <Header />
    <Loading :loading="loadingHome" />
    <AddToCart
      v-if="showFormAdd && productDetail"
      :product="productDetail"
      @close="showFormAdd = false"
    />

    <div>
      <!-- HERO BANNER -->
      <!-- <div class="relative w-full h-[40vh] md:h-[60vh] lg:h-[80vh] overflow-hidden group">
                <div class="absolute inset-0 flex transition-transform duration-700 ease-in-out" :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
                    <img
                        v-for="(banner, idx) in banners"
                        :key="idx"
                        :src="banner"
                        class="w-full h-full object-cover flex-shrink-0"
                        alt="Hero Banner"
                    />
                </div>
                <button @click="prevImage" class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/30 backdrop-blur-sm hover:bg-white text-black rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-white/50">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <button @click="nextImage" class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/30 backdrop-blur-sm hover:bg-white text-black rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-white/50">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
                <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                    <span 
                        v-for="(_, idx) in banners" 
                        :key="idx" 
                        class="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
                        :class="currentIndex === idx ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'"
                        @click="currentIndex = idx"
                    ></span>
                </div>
            </div> -->

      <!-- MAIN CONTAINER -->
      <div
        class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20 pt-[30px]"
      >
        <!-- SUB BANNERS & VOUCHERS -->

        <!-- FLASH SALE SECTION -->
        <div
          v-if="displayedProducts.length > 0"
          class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          <!-- Header Flash Sale -->
          <div
            class="bg-black text-white p-6 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div class="flex items-center gap-4">
              <div
                class="bg-red-600 text-white px-3 py-1 font-black italic text-xl uppercase -skew-x-12"
              >
                Flash Sale
              </div>
              <h3 class="text-lg font-bold hidden md:block">
                {{ flashSaleHomes?.title }}
              </h3>
            </div>

            <!-- Countdown -->
            <div class="flex items-center gap-4">
              <span
                class="text-xs font-bold uppercase tracking-wide text-gray-400"
                >Kết thúc sau:</span
              >
              <div class="flex gap-2">
                <!-- Increased size: w-12 h-12, text-lg -->
                <div
                  class="bg-white text-black w-12 h-12 rounded flex flex-col items-center justify-center leading-none shadow-sm"
                >
                  <span class="font-bold text-lg">{{ hours }}</span>
                  <span class="text-[9px] text-gray-500 uppercase">Giờ</span>
                </div>
                <div
                  class="bg-white text-black w-12 h-12 rounded flex flex-col items-center justify-center leading-none shadow-sm"
                >
                  <span class="font-bold text-lg">{{ minutes }}</span>
                  <span class="text-[9px] text-gray-500 uppercase">Phút</span>
                </div>
                <div
                  class="bg-white text-black w-12 h-12 rounded flex flex-col items-center justify-center leading-none shadow-sm"
                >
                  <span class="font-bold text-lg">{{ seconds }}</span>
                  <span class="text-[9px] text-gray-500 uppercase">Giây</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Products Grid -->
          <div class="p-6 md:p-8">
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <div
                v-for="(prod, idx) in displayedProducts"
                :key="idx"
                class="group cursor-pointer"
                @click="
                  router.push({
                    name: 'product-detail',
                    params: { id: prod.product_id_sql },
                  })
                "
              >
                <div
                  class="relative aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden mb-4 shadow-sm border border-gray-100"
                >
                  <img
                    :src="getMainProductImage(prod)"
                    class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <!-- Discount Badge -->
                  <span
                    v-if="checkProductSale(prod)"
                    class="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md"
                  >
                    -{{
                      getDiscountPercent(
                        getMaxProductPrice(prod)!,
                        getMinProductPrice(prod)!
                      )
                    }}%
                  </span>

                  <!-- Action Buttons Overlay -->
                  <div
                    class="absolute bottom-3 inset-x-3 flex justify-center gap-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                  >
                    <button
                      @click.stop="handleCart(prod)"
                      class="w-9 h-9 bg-white text-black rounded-full shadow-lg flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                    >
                      <i class="fa-solid fa-cart-plus text-sm"></i>
                    </button>
                    
                    <button
                      @click.stop="favourite.toggleFavouriteInstant(prod.product_id_sql)"
                      class="w-9 h-9 bg-white text-black rounded-full shadow-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <i
                        :class="
                          favourite.isFavourite(prod.product_id_sql)
                            ? 'fa-solid fa-heart text-red-500'
                            : 'fa-regular fa-heart text-sm'
                        "
                      ></i>
                    </button>
                  </div>
                </div>

                <div class="space-y-1">
                  <h4
                    class="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors"
                  >
                    {{ prod.name }}
                  </h4>
                  <div class="flex items-center gap-2">
                    <span
                      class="text-red-600 font-black text-base"
                      >{{ formatPrice(getMinProductPrice(prod)!) }}</span
                    >
                    <span
                      v-if="checkProductSale(prod)"
                      class="text-gray-400 text-xs line-through"
                      >{{ formatPrice(getMaxProductPrice(prod)!) }}</span
                    >
                  </div>
                  <!-- Progress Bar -->
                  <div
                    class="relative w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden"
                  >
                    <div
                      class="absolute left-0 top-0 h-full bg-black rounded-full"
                      :style="{
                        width:
                          Math.min(getSoldPercentage(prod) * 100, 100) + '%',
                      }"
                    ></div>
                  </div>
                  <div
                    class="flex justify-between items-center text-[10px] text-gray-500 font-medium mt-1"
                  >
                    <span>Đã bán: {{ getTotalSold(prod) }}</span>
                    <span
                      v-if="checkProductSoldOut(prod)"
                      class="text-red-500 font-bold"
                      >Hết hàng</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-10 text-center">
              <button
                @click="btnShowMoreProductSale"
                class="inline-flex items-center gap-2 px-8 py-3 border border-black text-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all rounded-full"
              >
                {{ showAll ? "Thu gọn" : "Xem tất cả Flash Sale" }}
                <i
                  :class="
                    showAll ? 'fa-solid fa-angle-up' : 'fa-solid fa-arrow-right'
                  "
                ></i>
              </button>
            </div>
          </div>
        </div>
        <div class="space-y-12">
          <!-- Sub Banners -->
          <!-- Vouchers Section Revised -->
          <div v-if="vouchers && vouchers.length >= 4" class="">
            <h2
              class="text-2xl font-bold text-center mb-8 uppercase tracking-widest text-gray-900"
            >
              Mã Giảm Giá Độc Quyền
            </h2>

            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div
                v-for="(v, idx) in vouchers"
                :key="idx"
                class="flex flex-col bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 group h-full border border-gray-100"
              >
                <div class="bg-black p-4 relative text-center">
                  <div
                    class="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-2"
                  >
                    <i class="fa-solid fa-gift text-white text-xs"></i>
                  </div>
                  <h3
                    class="text-white text-sm font-black tracking-wide mb-0.5 leading-none"
                  >
                    VOUCHER
                  </h3>
                  <p class="text-white/70 text-[10px] font-medium">
                    Ưu đãi giới hạn
                  </p>

                  <div
                    class="absolute -bottom-2 -left-2 w-4 h-4 bg-[#FAFAFA] rounded-full z-10"
                  ></div>
                  <div
                    class="absolute -bottom-2 -right-2 w-4 h-4 bg-[#FAFAFA] rounded-full z-10"
                  ></div>
                </div>

                <div class="bg-white relative">
                  <div
                    class="border-b border-dashed border-gray-200 mx-4 mt-0"
                  ></div>
                </div>

                <div
                  class="bg-white p-4 pt-3 flex flex-col items-center flex-1 text-center justify-between"
                >
                  <div class="w-full">
                    <p
                      class="text-red-600 font-black text-xs uppercase tracking-wider mb-1"
                    >
                      {{ v.code }}
                    </p>
                    <p
                      class="text-gray-500 text-[10px] mb-3 line-clamp-2 leading-relaxed px-1"
                    >
                      {{ v.description }}
                    </p>
                  </div>

                  <button
                    @click="copyText(v.code, idx, v.id!)"
                    class="w-full py-2 rounded-lg font-bold text-[10px] transition-all duration-300 shadow-sm border border-transparent"
                    :class="
                      copiedList[idx]
                        ? 'bg-green-50 text-green-600 border-green-200'
                        : 'bg-gray-900 text-white hover:bg-black'
                    "
                  >
                    {{ copiedList[idx] ? "Đã sao chếp" : "Sao chép ngay" }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- BEST SELLERS SECTION -->
        <div v-if="productBestSeller.length > 0">
          <div class="text-center mb-12">
            <h2
              class="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter mb-3"
            >
              Best Sellers
            </h2>
            <p class="text-gray-500 text-sm max-w-2xl mx-auto">
              Những thiết kế được yêu thích nhất, định hình phong cách thời
              thượng cho quý ông hiện đại.
            </p>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <div
              v-for="(prod, idx) in displayedBestSellerProducts"
              :key="idx"
              class="group cursor-pointer"
              @click="
                router.push({
                  name: 'product-detail',
                  params: { id: prod.product_id_sql },
                })
              "
            >
              <div
                class="relative aspect-[3/4] bg-gray-200 rounded-xl overflow-hidden mb-4 shadow-sm hover:shadow-lg transition-all duration-500"
              >
                <img
                  :src="getMainProductImage(prod)"
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div
                  class="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-md tracking-wider"
                >
                  BEST
                </div>

                <!-- Hover Action -->
                <div
                  class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                ></div>
                <div
                  class="absolute bottom-4 inset-x-4 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                >
                  <button
                    @click.stop="handleCart(prod)"
                    class="w-full bg-white text-black font-bold py-3 text-xs uppercase tracking-wider shadow-lg hover:bg-black hover:text-white transition-colors rounded"
                  >
                    Thêm vào giỏ
                  </button>
                </div>
                <!-- Heart Icon -->
                <!--  -->
                <button @click.stop="favourite.toggleFavouriteInstant(prod.product_id_sql)" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur text-black flex items-center justify-center hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shadow-sm">
                    <i :class=" favourite.isFavourite(prod.product_id_sql) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart'"></i>
                </button>
              </div>

              <div class="text-center px-2">
                <p
                  class="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1"
                >
                  NAVA Collection
                </p>
                <h4
                  class="text-sm font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-gray-600 transition-colors"
                >
                  {{ prod.name }}
                </h4>
                <div class="flex items-center justify-center gap-2">
                  <span
                    class="font-bold text-gray-900"
                    >{{ formatPrice(getMinProductPrice(prod)!) }}</span
                  >
                  <span
                    v-if="checkProductSale(prod)"
                    class="text-xs text-gray-400 line-through"
                    >{{ formatPrice(getMaxProductPrice(prod)!) }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <div class="mt-12 text-center">
            <button
              @click="btnShowMoreBestSeller"
              class="text-xs font-bold text-gray-900 border-b-2 border-black pb-1 hover:text-gray-600 hover:border-gray-600 transition-colors uppercase tracking-wide"
            >
              {{ showMoreBestSeller ? "Thu gọn" : "Xem thêm sản phẩm" }}
            </button>
          </div>
        </div>

        <!-- NEW ARRIVALS -->
        <div v-if="productLatests.length > 0">
          <div
            class="flex items-center justify-between mb-10 border-b border-gray-200 pb-4  text-center"
          >
            <h2
              class="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter"
            >
              Sản phẩm mới
            </h2>
            <button
              @click="btnshowMoreNewArrivals"
              class="text-xs font-bold text-gray-500 hover:text-black transition-colors uppercase tracking-wide flex items-center gap-2"
            >
              {{ showMoreNewArrivals ? "Thu gọn" : "Xem tất cả" }}
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <div
              v-for="(prod, idx) in displayedNewArrivalsProducts"
              :key="idx"
              class="group cursor-pointer"
              @click="
                router.push({
                  name: 'product-detail',
                  params: { id: prod.product_id_sql },
                })
              "
            >
              <div
                class="relative aspect-[3/4] bg-white rounded-xl overflow-hidden mb-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <img
                  :src="getMainProductImage(prod)"
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div
                  class="absolute top-3 left-3 bg-black text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-md tracking-wider"
                >
                  NEW
                </div>

                <!-- Action Buttons Overlay -->
                <div
                  class="absolute bottom-3 right-3 flex flex-col gap-2 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                >
                  <button
                    @click.stop="handleCart(prod)"
                    class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                  >
                    <i class="fa-solid fa-cart-plus text-sm"></i>
                  </button>
                  <button @click.stop="favourite.toggleFavouriteInstant(prod.product_id_sql)" class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                        <i :class=" favourite.isFavourite(prod.product_id_sql) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-sm'"></i>
                    </button>
                </div>
              </div>
              <h4
                class="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors px-1"
              >
                {{ prod.name }}
              </h4>
              <div
                class="text-gray-900 font-bold mt-1 px-1"
                
              >
                {{ formatPrice(getMinProductPrice(prod || 0) || 0) }}
              </div>
            </div>
          </div>
        </div>
        <!-- MARKETING SECTION (Editorial Style) -->
        <div class="space-y-24">
          <!-- Section 1 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div
              class="order-2 md:order-1 h-[500px] md:h-[600px] rounded-2xl overflow-hidden shadow-2xl group"
            >
              <img
                :src="PoLo"
                class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
            </div>
            <div class="order-1 md:order-2 text-center md:text-left md:pl-12">
              <span
                class="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] mb-4 block"
                >Bộ sưu tập mới</span
              >
              <h2
                class="text-5xl md:text-6xl font-black text-gray-900 mb-8 leading-none tracking-tighter"
              >
                POLO<br />SIGNATURE
              </h2>
              <p
                class="text-gray-600 leading-loose mb-10 max-w-md mx-auto md:mx-0 text-sm"
              >
                {{ textTmp }}
              </p>
              <button
                @click="router.push('/CategoryGender?gender=Nam&name=Áo')"
                class="px-10 py-4 bg-black text-white font-bold uppercase text-xs tracking-[0.2em] hover:bg-gray-800 transition-colors rounded-full"
              >
                Khám phá ngay
              </button>
            </div>
          </div>

          <!-- Section 2 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div class="text-center md:text-right md:pr-12">
              <span
                class="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] mb-4 block"
                >Đẳng cấp quý ông</span
              >
              <h2
                class="text-5xl md:text-6xl font-black text-gray-900 mb-8 leading-none tracking-tighter"
              >
                LEATHER<br />GOODS
              </h2>
              <p
                class="text-gray-600 leading-loose mb-10 max-w-md mx-auto md:ml-auto md:mr-0 text-sm"
              >
                {{ textAoda }}
              </p>
              <button
                @click="router.push('/CategoryGender?gender=Nam&name=Ví')"
                class="px-10 py-4 bg-black text-white font-bold uppercase text-xs tracking-[0.2em] hover:bg-gray-800 transition-colors rounded-full"
              >
                Mua ngay
              </button>
            </div>
            <div
              class="h-[500px] md:h-[600px] rounded-2xl overflow-hidden shadow-2xl group"
            >
              <img
                :src="DoDa"
                class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
            </div>
          </div>
        </div>

        <div v-if="productLatests.length > 0">
          <div
            class="flex items-center justify-between mb-10 border-b border-gray-200 pb-4"
          >
            <h2
              class="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter"
            >
              Dành cho nữ
            </h2>
            <button
              @click="router.push({ name: 'CategoryGender', query: { gender: 'Nữ' } })"
              class="text-xs font-bold text-gray-500 hover:text-black transition-colors uppercase tracking-wide flex items-center gap-2"
            >
              {{ showMoreNewArrivals ? "Thu gọn" : "Xem tất cả" }}
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <div
              v-for="(prod, idx) in productFemale"
              :key="idx"
              class="group cursor-pointer"
              @click="
                router.push({
                  name: 'product-detail',
                  params: { id: prod.product_id_sql },
                })
              "
            >
              <div
                class="relative aspect-[3/4] bg-white rounded-xl overflow-hidden mb-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <img
                  :src="getMainProductImage(prod)"
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div
                  class="absolute top-3 left-3 bg-black text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-md tracking-wider"
                >
                  FEMALE
                </div>

                <!-- Action Buttons Overlay -->
                <div
                  class="absolute bottom-3 right-3 flex flex-col gap-2 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                >
                  <button
                    @click.stop="handleCart(prod)"
                    class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                  >
                    <i class="fa-solid fa-cart-plus text-sm"></i>
                  </button>
                  <button @click.stop="favourite.toggleFavouriteInstant(prod.product_id_sql)" class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                        <i :class=" favourite.isFavourite(prod.product_id_sql) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-sm'"></i>
                    </button>
                </div>
              </div>
              <h4
                class="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors px-1"
              >
                {{ prod.name }}
              </h4>
              <div
                class="text-gray-900 font-bold mt-1 px-1"
              >
                {{ formatPrice(getMinProductPrice(prod)!) }}
              </div>
            </div>
          </div>
        </div>
        <!-- Dành cho nam -->
        <div v-if="productLatests.length > 0">
          <div
            class="flex items-center justify-between mb-10 border-b border-gray-200 pb-4"
          >
            <h2
              class="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter"
            >
              Dành cho Nam
            </h2>
            <button
              @click="router.push({ name: 'CategoryGender', query: { gender: 'Nam' } })"
              class="text-xs font-bold text-gray-500 hover:text-black transition-colors uppercase tracking-wide flex items-center gap-2"
            >
              {{ showMoreNewArrivals ? "Thu gọn" : "Xem tất cả" }}
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <div
              v-for="(prod, idx) in productMale"
              :key="idx"
              class="group cursor-pointer"
              @click="
                router.push({
                  name: 'product-detail',
                  params: { id: prod.product_id_sql },
                })
              "
            >
              <div
                class="relative aspect-[3/4] bg-white rounded-xl overflow-hidden mb-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <img
                  :src="getMainProductImage(prod)"
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div
                  class="absolute top-3 left-3 bg-black text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-md tracking-wider"
                >
                  MALE
                </div>

                <!-- Action Buttons Overlay -->
                <div
                  class="absolute bottom-3 right-3 flex flex-col gap-2 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                >
                  <button
                    @click.stop="handleCart(prod)"
                    class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                  >
                    <i class="fa-solid fa-cart-plus text-sm"></i>
                  </button>
                  <button @click.stop="favourite.toggleFavouriteInstant(prod.product_id_sql)" class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                        <i :class=" favourite.isFavourite(prod.product_id_sql) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-sm'"></i>
                    </button>
                </div>
              </div>
              <h4
                class="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors px-1"
              >
                {{ prod.name }}
              </h4>
              <div
                class="text-gray-900 font-bold mt-1 px-1"
              >
                {{ formatPrice(getMinProductPrice(prod)!) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- End Main Container -->
    </div>
  </div>
  <Footer />
</template>

<style scoped>
/* Minimal custom CSS, mostly relying on Tailwind */
/* .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    } */
</style>
