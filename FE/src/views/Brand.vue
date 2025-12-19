<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
// import AddToCart from "../components/AddToCart.vue";
import Loading from "../components/Loading.vue";
import Notification from "@/components/Notification.vue";
// import { useProductStore } from "../stores/productStore";
// import { useAuthStore } from "../stores/authStore";
import { useFavouriteStore } from "../stores/favourite";
import { getImage, formatPrice, formatDateTime, getMinProductPrice, getMaxProductPrice, getTotalSold, getMainProductImage, checkProductSale } from "../utils/format";
import type { IProductMongoDetail} from "../interfaces/product";
import { useProductStore } from "@/stores/product";


// Interface cho Brand/Shop
export interface IBrandResponse {
    brand_id: string;
    name: string;
    description: string | null;
    logo: string;
    status: string;
    created_at: Date;
    shop_name?: string; 
    rating?: number;
    visit_count?: number;
    id?: number;
}

// Props nhận từ trang cha
const props = defineProps<{
    show: boolean;
    brandId:string;
}>();

const emit = defineEmits(['close']);

const router = useRouter();
const productStore = useProductStore();
// const brandStore = useAuthStore();
const favouriteStore = useFavouriteStore();

const loading = ref(false);
const showFormAdd = ref(false);
const productDetail = ref<IProductMongoDetail>();
const brand = ref<IBrandResponse | null>(null);
const products = ref<IProductMongoDetail[]>([]);
const showNotification = ref(false);
const toastText = ref("");

// Tabs State
const currentTab = ref<'all' | 'sale'>('all');

// Hàm lấy dữ liệu khi mở Modal
const fetchData = async () => {
    if (!props.brandId) return;
    loading.value = true;
    try {
        const [brandRes, productsRes] = await Promise.all([
            productStore.getBrandByIdStore(props.brandId),
            productStore.getProductByBrandIdStore(props.brandId),
        ]);
        
        brand.value = brandRes as unknown as IBrandResponse; 
        products.value = productsRes || [];

        const token = localStorage.getItem('accessToken');
        if (token) {
            await favouriteStore.getFavouriteOfMeStore();
        }
    } catch (e) {
        console.error("Failed to load brand data", e);
    } finally {
        loading.value = false;
    }
};

// Watch prop show để load dữ liệu
watch(() => props.show, (newVal) => {
    if (newVal && props.brandId) {
        fetchData();
    }
});

const handleClose = () => {
    emit('close');
};

const handleCart = async (id: string) => {
    // productDetail.value = await productStore.getProductByIdStore(id);
    // if (productDetail.value) {
    //     showFormAdd.value = true;
    // }
    toastText.value = 'Thêm vào giỏ thành công'
    showNotification.value = true;
};

const displayedProducts = computed(() => {
    if (currentTab.value === 'sale') {
        return products.value.filter(p => (p.colors[0]?.sizes[0]?.sale_price || 0) > 0);
    }
    return products.value;
});
</script>

<template>
  <teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[9999] flex items-center justify-center p-4" @click="handleClose">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"></div>

        <!-- Notification & Loading (Local Scope) -->
        <div class="relative z-[10001]">
            <Notification :text="toastText" :isSuccess="showNotification" />
        </div>
        
        <!-- Modal Content -->
        <div 
            class="relative w-full max-w-6xl bg-[#FAFAFA] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-scale-in" 
            @click.stop
        >
            <Loading :loading="loading" />
            
            <!-- Close Button -->
            <button @click="handleClose" class="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/20 hover:bg-white backdrop-blur text-white hover:text-black flex items-center justify-center transition-all shadow-sm">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>

            <!-- Body (Scrollable) -->
            <div class="flex-1 overflow-y-auto custom-page-scroll">
                
                <!-- Brand Header Info -->
                <div class="bg-white border-b border-gray-100 relative">
                    <!-- Cover Image -->
                    <div class="h-20 bg-gradient-to-r from-gray-900 to-gray-800 relative">
                        <div class="absolute inset-0 bg-black/20"></div>
                        <!-- Decorative Pattern -->
                        <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    </div>
                    
                    <div class="px-6 pb-6 md:px-10 md:pb-8 flex flex-col md:flex-row items-end gap-6 -mt-16 relative z-10">
                        <!-- Avatar -->
                        <div class="w-32 h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden flex-shrink-0">
                            <img :src="'https://picsum.photos/200/200?random=' + brand?.id" class="w-full h-full object-cover" />
                        </div>
                        
                        <!-- Info -->
                        <div class="flex-1 text-center md:text-left mt-[60px] md:pt-0">
                            <h1 class="text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">{{ brand?.shop_name || brand?.name }}</h1>
                            <div class="flex flex-wrap items-center justify-center md:justify-start gap-y-2 gap-x-6 text-sm text-gray-600 bg-white/80 backdrop-blur-sm p-2 rounded-lg inline-flex shadow-sm border border-gray-100">
                                <span class="flex items-center gap-1.5"><i class="fa-solid fa-box-open text-gray-400"></i> Sản phẩm: <b class="text-black">{{ products.length }}</b></span>
                                <span class="w-px h-3 bg-gray-300"></span>
                                <span class="flex items-center gap-1.5"><i class="fa-solid fa-star text-yellow-500"></i> Đánh giá: <b class="text-black">{{ brand?.rating || '0.0' }}</b></span>
                                <span class="w-px h-3 bg-gray-300"></span>
                                <span class="flex items-center gap-1.5"><i class="fa-regular fa-calendar text-gray-400"></i> Tham gia: <b class="text-black">{{ brand?.created_at ? formatDateTime(brand.created_at).split(' ')[0] : 'N/A' }}</b></span>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex gap-3 mb-2 md:mb-4">
                            <button class="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95 flex items-center gap-2">
                                <i class="fa-solid fa-plus"></i> Theo dõi
                            </button>
                            <button class="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all">
                                <i class="fa-regular fa-comment-dots text-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Content Container -->
                <div class="px-6 py-8 md:px-10">
                    
                    <!-- Products Section -->
                    <div class="mb-8">
                        <!-- Filter Tabs -->
                        <div class="flex items-center gap-6 mb-8 border-b border-gray-200">
                            <button 
                                @click="currentTab = 'all'"
                                class="pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors relative top-[2px]"
                                :class="currentTab === 'all' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'"
                            >
                                Tất cả sản phẩm
                            </button>
                            <button 
                                @click="currentTab = 'sale'"
                                class="pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors relative top-[2px]"
                                :class="currentTab === 'sale' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'"
                            >
                                Đang giảm giá
                            </button>
                        </div>

                        <!-- Products Grid -->
                        <div v-if="displayedProducts.length > 0" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            <div 
                                v-for="(prod, idx) in displayedProducts" 
                                :key="idx"
                                class="group cursor-pointer"
                                @click="router.push({ name: 'product-detail', params: { id: prod.product_id_sql } })"
                            >
                                <div class="relative aspect-[3/4] bg-white rounded-xl overflow-hidden mb-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                                    <img :src="getMainProductImage(prod)" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    
                                    <!-- Badges -->
                                    <div class="absolute top-3 left-3 flex flex-col gap-1">
                                        <span v-if="checkProductSale(prod)" class="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-md tracking-wider">SALE</span>
                                    </div>

                                    <!-- Action Buttons -->
                                    <div class="absolute bottom-3 right-3 flex flex-col gap-2 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                        <button @click.stop="handleCart(prod.product_id_sql)" class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-black hover:text-white transition-colors">
                                            <i class="fa-solid fa-cart-plus text-sm"></i>
                                        </button>
                                        <button @click.stop="favouriteStore.toggleFavouriteInstant(prod.product_id_sql)" class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                                            <i :class="favouriteStore.isFavourite(prod.product_id_sql) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-sm'"></i>
                                        </button>
                                    </div>
                                </div>

                                <div class="px-1">
                                    <h4 class="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors mb-1">{{ prod.name }}</h4>
                                    <div class="flex items-center gap-2">
                                        <span class="text-red-600 font-black text-base">{{ formatPrice(getMinProductPrice(prod) || 0) }}</span>
                                        <span v-if="prod.colors[0]?.sizes[0]?.sale_price" class="text-gray-400 text-xs line-through font-medium">{{ formatPrice(getMaxProductPrice(prod) || 0) }}</span>
                                    </div>
                                    <div class="flex items-center gap-1 mt-1">
                                        <div class="flex text-[10px] text-yellow-400">
                                            <i class="fa-solid fa-star" v-for="n in 5" :class="n <= Math.round(5) ? '' : 'text-gray-200'"></i>
                                        </div>
                                        <span class="text-[10px] text-gray-400">({{ getTotalSold(prod) }} đã bán)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Empty State -->
                        <div v-else class="py-20 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                            <i class="fa-solid fa-box-open text-4xl mb-3 opacity-30"></i>
                            <p class="text-sm">Chưa có sản phẩm nào trong danh mục này.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add To Cart Modal (Nested) -->
        <AddToCart
            v-if="showFormAdd && productDetail"
            :product="productDetail"
            @close="showFormAdd = false" 
        />
    </div>
  </teleport>
</template>

<style scoped>
.animate-scale-in {
    animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

.custom-page-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-page-scroll::-webkit-scrollbar-track {
  background: #FAFAFA;
}
.custom-page-scroll::-webkit-scrollbar-thumb {
  background: #d4d4d4;
  border-radius: 10px;
}
</style>