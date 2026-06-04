<script setup lang="ts">
import Header from "../components/Header.vue";
import Footer from "../components/Footer.vue"; // Added Footer
import type { IProductMongoDetail } from "../interfaces/product";
import { ref, onMounted, computed, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProductStore } from "../stores/product";
import { useCategoryStore } from "../stores/category";
import { getMinProductPrice, getMaxProductPrice, checkProductSale, formatPrice, getMainProductImage } from "../utils/format";
import AddToCart from "../components/AddToCard.vue";
import { useFavouriteStore } from "../stores/favourite";
import Loading from "../components/Loading.vue";
import { useAuthStore } from "@/stores/auth";
const userStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const product = useProductStore();
const category = useCategoryStore();
const productGender = ref<IProductMongoDetail[]>([]);
const listCategory = ref<any[]>([]);
const selectedSort = ref("name-asc");
const showSortDropdown = ref(false);
const selectedCategories = ref<number[]>([]);
const showFormAdd = ref(false);
const loadingPage = ref(false);
const favourite = useFavouriteStore();
const showMobileFilter = ref(false); // State for mobile filter drawer

const sortOptions = [
    { label: "Tên A → Z", value: "name-asc" },
    { label: "Tên Z → A", value: "name-desc" },
    { label: "Giá thấp → cao", value: "price-asc" },
    { label: "Giá cao → thấp", value: "price-desc" },
    { label: "Bán chạy nhất", value: "bestseller" },
];

onMounted(async () => {
const gender = route.query.gender as string;
loadingPage.value = true;
productGender.value = await product.searchByCategoryGenderStore(gender);
listCategory.value = await category.getCategoryNameStore(gender);

if (userStore.isLogin) {
        favourite.getFavouriteOfMeStore();
    
}
loadingPage.value = false;
});

const handleCategoryChange = (category_id: number) => {
    if (selectedCategories.value.filter((c) => c === category_id).length > 0) {
    selectedCategories.value = selectedCategories.value.filter((c) => c !== category_id);
    } else {
    selectedCategories.value.push(category_id);
    }
};


const filteredProducts = computed(() => {
    let filtered = [...productGender.value];
    if (selectedCategories.value.length > 0) {
        filtered = filtered.filter(
            (p) => p.category_id && selectedCategories.value.includes(p.category_id)
    );
    }

    return sortProducts(filtered, selectedSort.value);
});

const sortProducts = (products: IProductMongoDetail[], sortKey: string) => {
    return products.sort((a, b) => {
    const nameA = (a.name ?? "").toString();
    const nameB = (b.name ?? "").toString();
    const priceA = Number(getMinProductPrice(a) ?? 0);
    const priceB = Number(getMinProductPrice(b) ?? 0);
    const rand1 = Math.random();
    const rand2 = Math.random();
    const soldA = Number(rand1);
    const soldB = Number( rand2);

    switch (sortKey) {
        case "name-asc": return nameA.localeCompare(nameB);
        case "name-desc": return nameB.localeCompare(nameA);
        case "price-asc": return priceA - priceB;
        case "price-desc": return priceB - priceA;
        case "bestseller": return soldB - soldA;
        default: return 0;
    }
    });
};

const handleSortChange = (value: string) => {
    selectedSort.value = value;
    showSortDropdown.value = false;
};

const isCategorySelected = (category_id: number) => {
    return selectedCategories.value.filter((c) => c === category_id).length > 0;
};

const clearAllFilters = () => {
    selectedCategories.value = [];
};

const productDetail = ref<IProductMongoDetail>();
const handleCart = async (product: IProductMongoDetail) => {
    if (product) {
        productDetail.value = product
    showFormAdd.value = true;
    }
};
</script>
    
    <template>
      <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900">
        <Header />
        <Loading :loading="loadingPage" />
        <AddToCart
          v-if="showFormAdd && productDetail"
          :product="productDetail"
          @close="showFormAdd = false"
        />
    
        <main class="pb-20 min-h-screen">
            <div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
                
                <!-- Breadcrumb & Toolbar -->
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pt-6">
                    <div>
                        <!-- <nav class="flex items-center text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                            <a href="/" class="hover:text-black transition-colors">Trang chủ</a>
                            <i class="fa-solid fa-chevron-right text-[10px] mx-3"></i>
                            <span class="text-black font-bold">{{ route.query.gender }}</span>
                        </nav> -->
                        <h1 class="text-3xl font-black text-gray-900 uppercase tracking-tight drop-shadow-sm">
                            Thời trang {{ route.query.gender }}
                            <span class="text-lg font-normal text-gray-500 ml-2 lowercase align-middle">({{ filteredProducts.length }} sản phẩm)</span>
                        </h1>
                    </div>
    
                    <div class="flex items-center gap-3">
                        <!-- Mobile Filter Button -->
                        <button 
                            @click="showMobileFilter = true"
                            class="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold hover:border-black transition-all shadow-md hover:shadow-lg"
                        >
                            <i class="fa-solid fa-filter"></i> Bộ lọc
                            <span v-if="selectedCategories.length" class="bg-black text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{{ selectedCategories.length }}</span>
                        </button>
    
                        <!-- Sort Dropdown -->
                        <div class="relative">
                            <button 
                                @click="showSortDropdown = !showSortDropdown"
                                class="flex items-center gap-3 px-5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium min-w-[180px] justify-between hover:border-black transition-all shadow-md hover:shadow-lg"
                            >
                                <span class="text-gray-500">Sắp xếp: <span class="text-black font-bold">{{ sortOptions.find(o => o.value === selectedSort)?.label }}</span></span>
                                <i class="fa-solid fa-chevron-down text-xs transition-transform duration-300" :class="{'rotate-180': showSortDropdown}"></i>
                            </button>
                            
                            <!-- Dropdown Menu -->
                            <div v-if="showSortDropdown" class="absolute top-full right-0 mt-2 w-full bg-white border border-gray-100 rounded-lg shadow-2xl z-20 py-2 overflow-hidden animate-fade-in">
                                <div 
                                    v-for="option in sortOptions" 
                                    :key="option.value"
                                    @click="handleSortChange(option.value)"
                                    class="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer transition-colors"
                                    :class="selectedSort === option.value ? 'font-bold text-black bg-gray-50' : 'text-gray-600'"
                                >
                                    {{ option.label }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
    
                <div class="flex gap-8 items-start">
                    <!-- DESKTOP SIDEBAR FILTER -->
                    <!-- Updated shadow -->
                    <aside class="hidden lg:block w-64 flex-shrink-0 sticky top-28">
                        <div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100/50">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="font-bold text-lg text-gray-900">Danh mục</h3>
                                <button 
                                    v-if="selectedCategories.length > 0" 
                                    @click="clearAllFilters"
                                    class="text-xs text-red-500 font-bold hover:underline"
                                >
                                    Xóa hết
                                </button>
                            </div>
                            
                            <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                <label 
                                    v-for="category in listCategory" 
                                    :key="category.category_id"
                                    class="flex items-center gap-3 cursor-pointer group py-1.5"
                                >
                                    <div class="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            class="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-black checked:border-black transition-all shadow-sm"
                                            :checked="isCategorySelected(category.category_id)"
                                            @change="handleCategoryChange(category.category_id)"
                                        />
                                        <i class="fa-solid fa-check text-white text-xs absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none"></i>
                                    </div>
                                    <span 
                                        class="text-sm text-gray-600 group-hover:text-black transition-colors"
                                        :class="{'font-bold text-black': isCategorySelected(category.category_id)}"
                                    >
                                        {{ category.category_name }}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </aside>
    
                    <!-- PRODUCT GRID -->
                    <div class="flex-1">
                        <!-- Filters Tags (Shown above grid) -->
                        <!-- <div v-if="selectedCategories.length > 0" class="flex flex-wrap gap-2 mb-6">
                            <div v-for="cat in selectedCategories" :key="cat" class="px-3 py-1 bg-black text-white text-xs font-bold rounded-full flex items-center gap-2 shadow-md">
                                {{ cat }}
                                <i @click="handleCategoryChange(cat)" class="fa-solid fa-xmark cursor-pointer hover:text-gray-300"></i>
                            </div>
                        </div> -->
    
                        <div v-if="filteredProducts.length > 0" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                            <div 
                                v-for="(prod, index) in filteredProducts" 
                                :key="index"
                                class="group cursor-pointer"
                                @click="router.push({ name: 'product-detail', params: { id: prod.product_id_sql } })"
                            >
                                <!-- Updated Product Card Shadow & Hover effect -->
                                <div class="relative aspect-[3/4] bg-white rounded-xl overflow-hidden mb-3 shadow-md hover:shadow-2xl transition-all duration-500 border border-gray-100 transform hover:-translate-y-1">
                                    <img :src="getMainProductImage(prod)" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    
                                    <!-- Badges -->
                                    <div class="absolute top-2 left-2 flex flex-col gap-1">
                                        <span v-if="checkProductSale(prod)" class="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md tracking-wider">SALE</span>
                                    </div>
    
                                    <!-- Action Buttons -->
                                    <div class="absolute bottom-3 right-3 flex flex-col gap-2 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                        <button @click.stop="handleCart(prod)" class="w-9 h-9 bg-white text-black rounded-full shadow-lg flex items-center justify-center hover:bg-black hover:text-white transition-colors">
                                            <i class="fa-solid fa-cart-plus text-sm"></i>
                                        </button>
                                        <!-- favourite.toggleFavouriteInstant(prod.id) -->
                                        <button @click.stop="favourite.toggleFavouriteInstant(prod.product_id_sql)" class="w-9 h-9 bg-white text-black rounded-full shadow-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                                            <i :class="favourite.isFavourite(prod.product_id_sql) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-sm'"></i>
                                            <!-- favourite.isFavourite(prod.id) -->
                                        </button>
                                    </div>
                                </div>
    
                                <div class="px-1">
                                    <p class="text-[10px] text-gray-400 uppercase font-bold mb-0.5 line-clamp-1">{{ prod.category_id }}</p>
                                    <h4 class="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors mb-1" :title="prod.name">{{ prod.name }}</h4>
                                    <div class="flex items-center gap-2">
                                        <span class="text-red-600 font-black text-base drop-shadow-sm">{{ getMinProductPrice(prod) }}</span>
                                        <span v-if="checkProductSale(prod)" class="text-gray-400 text-xs line-through font-medium">{{ formatPrice(getMaxProductPrice(prod)!) }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
    
                        <!-- Empty State -->
                        <div v-else class="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
                            <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <i class="fa-solid fa-box-open text-2xl text-gray-400"></i>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 mb-1">Không tìm thấy sản phẩm</h3>
                            <p class="text-gray-500 text-sm mb-6">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
                            <button @click="clearAllFilters" class="px-6 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl">
                                Xóa bộ lọc
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    
        <!-- MOBILE FILTER DRAWER (Overlay) -->
        <div v-if="showMobileFilter" class="fixed inset-0 z-[60] lg:hidden">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showMobileFilter = false"></div>
            
            <!-- Drawer -->
            <div class="absolute right-0 top-0 bottom-0 w-[80%] max-w-[320px] bg-white shadow-2xl p-6 animate-slide-in">
                <div class="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                    <h3 class="text-xl font-black uppercase">Bộ lọc</h3>
                    <button @click="showMobileFilter = false" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
    
                <div class="space-y-4 overflow-y-auto max-h-[calc(100vh-150px)]">
                    <h4 class="font-bold text-gray-900">Danh mục</h4>
                    <div class="space-y-3">
                        <label 
                            v-for="category in listCategory" 
                            :key="category.category_id"
                            class="flex items-center gap-3 cursor-pointer py-1"
                        >
                            <div class="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    class="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-black checked:border-black transition-all"
                                    :checked="isCategorySelected(category.category_id)"
                                    @change="handleCategoryChange(category.category_id)"
                                />
                                <i class="fa-solid fa-check text-white text-xs absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none"></i>
                            </div>
                            <span class="text-sm text-gray-700">{{ category.category_name }}</span>
                        </label>
                    </div>
                </div>
    
                <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
                    <div class="flex gap-3">
                        <button @click="clearAllFilters" class="flex-1 py-3 border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors">Xóa</button>
                        <button @click="showMobileFilter = false" class="flex-[2] py-3 bg-black text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors shadow-lg">Xem {{ filteredProducts.length }} kết quả</button>
                    </div>
                </div>
            </div>
        </div>
    
        <Footer />
      </div>
    </template>
    
    <style scoped>
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: #e5e7eb;
      border-radius: 4px;
    }
    .custom-scrollbar:hover::-webkit-scrollbar-thumb {
      background-color: #d1d5db;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
    .animate-slide-in {
        animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
        animation: fadeIn 0.2s ease-out forwards;
    }
    </style>