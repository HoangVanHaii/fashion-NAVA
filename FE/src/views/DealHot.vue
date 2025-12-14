<script setup lang="ts">
    import { ref, onMounted, computed } from "vue";
    import type { FlashSale } from "../interfaces/flashSale";
    import { checkProductSale, formatPrice, getMaxProductPrice, getMinProductPrice } from "../utils/format";
    import { flashSaleStore } from "../stores/flashSale";
    import type { IProductMongoDetail } from "../interfaces/product";
    import { useProductStore } from "../stores/product";
    import AddToCart from "../components/AddToCard.vue";
    import { useRouter } from "vue-router";
    import Loading from "@/components/Loading.vue";
    import Header from "@/components/Header.vue";
    import Footer from "@/components/Footer.vue";
import { useFavouriteStore } from "../stores/favourite";
import { useAuthStore } from "@/stores/auth";
import  type { FavouriteDetail } from "../interfaces/favourite";
const userStore = useAuthStore();
    
    const favourite = useFavouriteStore();
    const router = useRouter();
    const flashSale1 = ref<FlashSale | null>(null);
    const flashSale2 = ref<FlashSale | null>(null);
    const useFlashSale = flashSaleStore();
    const useProduct = useProductStore();
    
    const showFormAdd = ref(false);
    const showMoreHotDeal1 = ref(false);
    const showMoreHotDeal2 = ref(false);
const loading = ref(false);
    
    onMounted(async () => {
        loading.value = true;
        let excludeIds = localStorage.getItem("excludeIdHome") || "";
        localStorage.removeItem("excludeIds");
        const ids = excludeIds ? excludeIds.split(",") : [];
    
        excludeIds = ""//////x///
        flashSale1.value = await useFlashSale.getFlashSaleHotDeal1NotIN(excludeIds);
        if (flashSale1.value && flashSale1.value.ID) {
            const id = flashSale1.value.ID.toString();
    
            if (!ids.includes(id)) {
                ids.push(id);
                excludeIds = ids.join(",");
                localStorage.setItem("excludeIds", ids.join(","));
            }
        }
        excludeIds = ''/////////////
        flashSale2.value = await useFlashSale.getFlashSaleHotDeal2NotIN(excludeIds);
        if (userStore.isLogin) {
            await favourite.getFavouriteOfMeStore();
            
        }
        loading.value = false;
    });
    
    const productDetail = ref<IProductMongoDetail>();
    const handleCart = async (product: IProductMongoDetail) => {
    if (product) {
        productDetail.value = product;
        showFormAdd.value = true;
    }
    };
    
    const getDiscountPercent = (
        originalPrice: number,
        flashPrice?: number
    ): number => {
        if (!flashPrice || flashPrice >= originalPrice) return 0;
        const percent = ((originalPrice - flashPrice) / originalPrice) * 100;
        return Math.round(percent);
    };
    
    const displayedProductHotDeal1 = computed<IProductMongoDetail[]>(() => {
        if (!flashSale1.value) return [];
        return showMoreHotDeal1.value
            ? flashSale1.value.Products
            : flashSale1.value.Products.slice(0, 10); // Show 10 initially to fill 2 rows of 5
    });
    const displayedProductHotDeal2 = computed<IProductMongoDetail[]>(() => {
        if (!flashSale2.value) return [];
        return showMoreHotDeal2.value
            ? flashSale2.value.Products
            : flashSale2.value.Products.slice(0, 10);
    });
    const getMainProductImage = (product: any): string => {
  if (!product?.colors?.length) return "";

  const mainColor = product.colors.find((c: any) => c.is_main === true);

  return mainColor?.image_main || product.colors[0].image_main || "";
};
    
    const btnShowMoreHotDeal1 = () => {
        showMoreHotDeal1.value = !showMoreHotDeal1.value;
    };
    const btnShowMoreHotDeal2 = () => {
        showMoreHotDeal2.value = !showMoreHotDeal2.value;
    };
    </script>
    
    <template>
        <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900">
            <Header />
            <Loading :loading="loading" />
            <AddToCart 
                v-if="showFormAdd && productDetail" 
                :product="productDetail" 
                @close="showFormAdd = false" 
            />
    
            <main class="pb-20">
    
                <!-- Page Title -->
                <div class="text-center mb-12 mt-4">
                    <h1 class="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter mb-3">
                        HOT DEALS
                    </h1>
                    <p class="text-gray-500 text-sm max-w-2xl mx-auto">
                        Săn ngay những ưu đãi tốt nhất trong tháng. Số lượng có hạn.
                    </p>
                </div>
    
                <div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
                    
                    <!-- DEAL SECTION 1 -->
                    <div v-if="flashSale1" class="space-y-8 animate-fade-in">
                        <!-- Section Header -->
                        <div class="flex items-end justify-between border-b-2 border-black pb-4">
                            <div class="flex flex-col md:flex-row md:items-end gap-2 md:gap-4">
                                <h2 class="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight leading-none">
                                    {{ flashSale1.title }}
                                </h2>
                                <span class="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-1 w-fit">
                                    Limited Offer
                                </span>
                            </div>
                            <div class="hidden md:block text-xs font-bold text-gray-400 uppercase tracking-widest">
                                Ends Soon
                            </div>
                        </div>
    
                        <!-- Products Grid -->
                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            <div 
                                v-for="(product, index) in displayedProductHotDeal1" 
                                :key="index"
                                class="group cursor-pointer"
                                @click="router.push({ name: 'product-detail', params: { id: product.product_id_sql } })"
                            >
                                <div class="relative aspect-[3/4] bg-white rounded-xl overflow-hidden mb-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                                    <img :src="getMainProductImage(product)" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    
                                    <!-- Badges -->
                                    <div class="absolute top-3 left-3 flex flex-col gap-1">
                                        <span class="bg-black text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-md tracking-wider">HOT</span>
                                        <span v-if="checkProductSale(product)" class="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-md tracking-wider">
                                            -{{ getDiscountPercent(getMaxProductPrice(product || 0)!, getMinProductPrice(product || 0)!) }}%
                                        </span>
                                    </div>
    
                                    <!-- Action Buttons -->
                                    <div class="absolute bottom-3 right-3 flex flex-col gap-2 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                        <button @click.stop="handleCart(product)" class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-black hover:text-white transition-colors">
                                            <i class="fa-solid fa-cart-plus text-sm"></i>
                                        </button>
                                        <!--  -->
                                        <button @click.stop="favourite.toggleFavouriteInstant(product.product_id_sql)" class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                                            <i :class="favourite.isFavourite(product.product_id_sql) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-sm'"></i>
                                            <!--  -->
                                        </button>
                                    </div>
                                </div>
    
                                <div class="px-1">
                                    <h4 class="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors mb-1">{{ product.name }}</h4>
                                    <div class="flex items-center gap-2">
                                        <span class="text-red-600 font-black text-base">{{ formatPrice(getMinProductPrice(product)!) }}</span>
                                        <span v-if="checkProductSale(product)" class="text-gray-400 text-xs line-through font-medium">{{ formatPrice(getMaxProductPrice(product)!) }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
    
                        <!-- Load More -->
                        <div class="text-center pt-4">
                            <button 
                                @click="btnShowMoreHotDeal1" 
                                class="inline-flex items-center gap-2 px-10 py-3 border-2 border-black text-black text-xs font-bold uppercase tracking-[0.15em] hover:bg-black hover:text-white transition-all rounded-full"
                            >
                                {{ showMoreHotDeal1 ? "Thu gọn" : "Xem thêm" }}
                                <i :class="showMoreHotDeal1 ? 'fa-solid fa-angle-up' : 'fa-solid fa-arrow-right'"></i>
                            </button>
                        </div>
                    </div>
    
                    <!-- DEAL SECTION 2 -->
                    <div v-if="flashSale2" class="space-y-8 animate-fade-in">
                        <!-- Section Header -->
                        <div class="flex items-end justify-between border-b-2 border-black pb-4">
                            <div class="flex flex-col md:flex-row md:items-end gap-2 md:gap-4">
                                <h2 class="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight leading-none">
                                    {{ flashSale2.title }}
                                </h2>
                                <span class="bg-black text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-1 w-fit">
                                    Trending Now
                                </span>
                            </div>
                        </div>
    
                        <!-- Products Grid -->
                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            <div 
                                v-for="(product, index) in displayedProductHotDeal2" 
                                :key="index"
                                class="group cursor-pointer"
                                @click="router.push({ name: 'product-detail', params: { id: product.product_id_sql } })"
                            >
                                <div class="relative aspect-[3/4] bg-white rounded-xl overflow-hidden mb-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                                    <img :src="getMainProductImage(product)" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    
                                    <!-- Badges -->
                                    <div class="absolute top-3 left-3 flex flex-col gap-1">
                                        <span v-if="checkProductSale(product)" class="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-md tracking-wider">
                                            -{{ getDiscountPercent(getMaxProductPrice(product || 0)!, getMinProductPrice(product || 0)!) }}%
                                        </span>
                                    </div>
    
                                    <!-- Action Buttons -->
                                    <div class="absolute bottom-3 right-3 flex flex-col gap-2 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                        <button @click.stop="handleCart(product)" class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-black hover:text-white transition-colors">
                                            <i class="fa-solid fa-cart-plus text-sm"></i>
                                        </button>
                                        <!-- favourite.toggleFavouriteInstant(product.id) -->
                                        <button @click.stop="favourite.toggleFavouriteInstant(product.product_id_sql)" class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                                            <i :class="favourite.isFavourite(product.product_id_sql) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-sm'"></i>
                                            <!-- favourite.isFavourite(product.id) -->
                                        </button>
                                    </div>
                                </div>
    
                                <div class="px-1">
                                    <h4 class="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors mb-1">{{ product.name }}</h4>
                                    <div class="flex items-center gap-2">
                                        <span class="text-red-600 font-black text-base">{{ formatPrice(getMinProductPrice(product)!) }}</span>
                                        <span v-if="checkProductSale(product)" class="text-gray-400 text-xs line-through font-medium">{{ formatPrice(getMaxProductPrice(product)!) }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
    
                        <!-- Load More -->
                        <div class="text-center pt-4">
                            <button 
                                @click="btnShowMoreHotDeal2" 
                                class="inline-flex items-center gap-2 px-10 py-3 border-2 border-black text-black text-xs font-bold uppercase tracking-[0.15em] hover:bg-black hover:text-white transition-all rounded-full"
                            >
                                {{ showMoreHotDeal2 ? "Thu gọn" : "Xem thêm" }}
                                <i :class="showMoreHotDeal2 ? 'fa-solid fa-angle-up' : 'fa-solid fa-arrow-right'"></i>
                            </button>
                        </div>
                    </div>
    
                    <!-- Empty State -->
                    <div v-if="!flashSale1 && !flashSale2 && !loading" class="text-center py-20">
                        <div class="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i class="fa-solid fa-tags text-3xl text-gray-400"></i>
                        </div>
                        <h4 class="text-xl font-bold text-gray-900 uppercase tracking-wide mb-2">Chưa có ưu đãi</h4>
                        <p class="text-gray-500 text-sm">Hiện tại chưa có chương trình ưu đãi nào đang diễn ra. Vui lòng quay lại sau!</p>
                    </div>
    
                </div>
            </main>
          </div>
          <Footer />
    </template>
    
    <style scoped>
    .animate-fade-in {
        animation: fadeIn 0.5s ease-out forwards;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    </style>