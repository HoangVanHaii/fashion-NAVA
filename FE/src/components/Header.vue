<script setup lang="ts">
import { ref, computed, onBeforeMount, onMounted, onBeforeUnmount } from "vue";
import { useRouter, useRoute } from "vue-router"; // Added useRoute
// import { useCartStore } from "../stores/cartStore";
// import { useCategoryStore } from "../stores/categoryStore";
// import type { ProductSummary } from "../interfaces/product";
// import logo from "../assets/logo.jpg";
// import { getImage } from "../utils/format";
// import Notification from "./Notification.vue";
// import { formatPrice } from "../utils/format";
// import { useUserStore } from "../stores/userStore";
// import { useProductStore } from "../stores/productStore";

// const productStore = useProductStore();
// const cart = useCartStore();
// const category = useCategoryStore();
const router = useRouter();
const route = useRoute(); // Initialize route
// const products = ref<ProductSummary[]>([]);
const searchQuery = ref("");
const showNamDropdown = ref(false);
const showNuDropdown = ref(false);
const showPhuKienDropdown = ref(false);
const showFormSearch = ref(false);
const categoryMale = ref<string[]>([]);
const categoryFemale = ref<string[]>([]);
const searchBarRef = ref<HTMLElement | null>(null);
const showFormUser = ref(false);
const isLogin = ref(false);
const showMenuPhone = ref(false);
const isLogOut = ref(false); 
const MenuPhone = ref<HTMLElement | null>(null);

const isScrolled = ref(false); 
const lastScrollY = ref(0);    

// const u = useUserStore();

// const listSearch = computed<ProductSummary[]>(() => {
//   const normalize = (s: string) =>
//     s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

//   const query = normalize(searchQuery.value.toLowerCase().trim());
//   if (!query) return products.value;

//   return products.value.filter(p =>
//     normalize(p.name.toLowerCase()).includes(query)
//   );
// });

// Helper function to check active route
const isActive = (path: string, queryParam?: string, queryValue?: string) => {
    if (queryParam && queryValue) {
        return route.path === path && route.query[queryParam] === queryValue;
    }
    // Special case for Home to handle both / and /home
    if (path === '/home' && route.path === '/') return true;
    // Special case for Phu Kien (check prefix)
    if (path === '/phu-kien' && route.path.startsWith('/phu-kien')) return true;
    
    return route.path === path;
}

// onBeforeMount(async () => {
//     isLogin.value = localStorage.getItem("user_id") ? true : false;
//     if (localStorage.getItem('accessToken')) {
//         isLogOut.value = false;
//         await u.fetchProfile();
//         await cart.getCartCountStore();
//     }
//     else {
//         isLogOut.value = true;
//     }
//   categoryMale.value = await category.getCategoryNameStore("Nam");
//   categoryFemale.value = await category.getCategoryNameStore("Nữ");
  
//   isLogin.value = localStorage.getItem("user_id") ? true : false;
  
//   products.value = await productStore.getAllProductActiveStore();
// });

const toastText = ref("");
const showNotification = ref<boolean>(false);

const goToCart = () => {
    toastText.value = "";
    showNotification.value = false;
    const login = localStorage.getItem('accessToken') ? true : false;
    if (!login) {
        setTimeout(() => {
            toastText.value = "❌ Vui lòng đăng nhập để thêm vào giỏ hàng!";
            showNotification.value = true;
        }, 0) 
        setTimeout(() => {
            router.push({
                path: '/auth/login',
                query: {
                    redirect: "/cart/cartOfme" 
                }
            })
        }, 2000);
    }
    else {
        router.push("/cart/cartOfme");
    }
};

const goToLogin = () => {
  router.push("/auth/login");
};
const goToRegister = () => {
  router.push("/auth/register");
};

const goToLogout = async() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user_id");
    localStorage.removeItem("avatar");
    isLogin.value = false;
    // u.avatar = '';
    isLogOut.value = true
    // cart.resetCartCount();
    router.push("/home");   
};


const goToProfile = () => {
  router.push("/profile/me");
};

const getDiscountPercent = (
  originalPrice: number,
  flashPrice?: number
): number => {
  if (!flashPrice || flashPrice >= originalPrice) return 0;
  const percent = ((originalPrice - flashPrice) / originalPrice) * 100;
  return Math.round(percent);
};

// Updated Logic for Smart Sticky Header
const handleScroll = () => {
    const currentScrollY = window.scrollY;

    // 1. If at the very top (or bounce effect), always show full header
    if (currentScrollY <= 0) {
        isScrolled.value = false;
        lastScrollY.value = 0;
        return;
    }

    // 2. Determine scroll direction
    if (currentScrollY > lastScrollY.value && currentScrollY > 100) {
        // Scrolling DOWN and past 50px -> Hide Hotline/Compact Header
        isScrolled.value = true;
    } else if (currentScrollY < lastScrollY.value) {
        // Scrolling UP -> Show Hotline/Full Header immediately
        isScrolled.value = false;
    }

    // Update last position
    lastScrollY.value = currentScrollY;
};

const handleSearchClickOutside = (event: Event) => {
  if (
    searchBarRef.value &&
    !searchBarRef.value.contains(event.target as Node)
  ) {
    showFormSearch.value = false;
    searchQuery.value = "";
  }
  if (MenuPhone.value && !MenuPhone.value.contains(event.target as Node)) {
    showMenuPhone.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleSearchClickOutside);
  window.addEventListener("scroll", handleScroll);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleSearchClickOutside);
  window.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <Notification :text="toastText" :isSuccess="showNotification" />
  
  <!-- Main Header Container -->
  <header class="fixed top-0 left-0 w-full z-50 bg-white shadow-md font-sans transition-all duration-300">
    
    <!-- Top Bar - Hotline -->
    <!-- Added conditional classes for height/opacity transition -->
    <div 
        class="bg-black text-white text-xs transition-all duration-300 ease-in-out overflow-hidden"
        :class="isScrolled ? 'max-h-0 opacity-0' : 'max-h-10 py-2 opacity-100'"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div class="flex items-center space-x-3">
          <span>Hotline: 0000000 (8h-12h, 13h-17h)</span>
          <span class="text-gray-500">|</span>
          <span class="hover:text-gray-300 cursor-pointer transition-colors">Liên hệ</span>
        </div>
        <div class="hover:text-gray-300 cursor-pointer transition-colors flex items-center gap-2">
           <i class="fa-solid fa-bell"></i>
           <span>Thông báo của tôi</span>
        </div>
      </div>
    </div>

    <!-- Main Navigation -->
    <div class="border-b border-gray-100 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Adjusted height based on scroll -->
        <div 
            class="flex justify-between items-center transition-all duration-300 ease-in-out"
            :class="isScrolled ? 'h-16' : 'h-20'"
        >
            
            <!-- Mobile Menu Button & Logo -->
            <div class="flex items-center gap-4 lg:hidden">
                <i class="fa-solid fa-bars text-2xl cursor-pointer hover:text-gray-600" 
                   @click.stop="showMenuPhone = !showMenuPhone"
                   ref="MenuPhone">
                </i>
            </div>

            <!-- Logo -->
            <div class="flex-shrink-0 cursor-pointer" @click="router.push('/')">
                <!-- Logo scales down slightly on scroll -->
                <!-- <img 
                    :src="logo" 
                    alt="NAVA" 
                    class="w-auto object-contain transition-all duration-300" 
                    :class="isScrolled ? 'h-10' : 'h-12'"
                /> -->
            </div>

            <!-- Desktop Navigation -->
            <nav class="hidden lg:flex items-center space-x-8">
                <a href="/home" 
                   class="text-sm font-bold uppercase tracking-wide transition-colors"
                   :class="isActive('/home') || isActive('/') ? 'text-red-600' : 'text-gray-900 hover:text-gray-500'">
                   Trang chủ
                </a>
                <a href="/deal-hot" 
                   class="text-sm font-bold uppercase tracking-wide transition-colors"
                   :class="isActive('/deal-hot') ? 'text-red-600' : 'text-gray-900 hover:text-gray-500'">
                   Ưu đãi Hot
                </a>

                <!-- Dropdown Nam -->
                <div class="relative group" @mouseenter="showNamDropdown = true" @mouseleave="showNamDropdown = false">
                    <a href="/category-gender?gender=Nam" 
                       class="text-sm font-bold uppercase tracking-wide transition-colors flex items-center gap-1"
                       :class="isActive('/category-gende', 'gender', 'Nam') ? 'text-red-600' : 'text-gray-900 hover:text-gray-500'">
                        Nam <span class="text-[10px] mt-0.5">▼</span>
                    </a>
                    <div v-if="showNamDropdown" class="absolute top-full left-0 w-48 bg-white border border-gray-100 shadow-xl rounded-b-md py-2 animate-fade-in-up">
                        <a v-for="nameCateMen in categoryMale" 
                           :key="nameCateMen"
                           :href="`/category-gender?gender=Nam&name=${nameCateMen}`"
                           class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
                           {{ nameCateMen }}
                        </a>
                    </div>
                </div>

                <!-- Dropdown Nu -->
                <div class="relative group" @mouseenter="showNuDropdown = true" @mouseleave="showNuDropdown = false">
                    <a href="/category-gender?gender=Nữ" 
                       class="text-sm font-bold uppercase tracking-wide transition-colors flex items-center gap-1"
                       :class="isActive('/category-gender', 'gender', 'Nữ') ? 'text-red-600' : 'text-gray-900 hover:text-gray-500'">
                        Nữ <span class="text-[10px] mt-0.5">▼</span>
                    </a>
                    <div v-if="showNuDropdown" class="absolute top-full left-0 w-48 bg-white border border-gray-100 shadow-xl rounded-b-md py-2 animate-fade-in-up">
                        <a v-for="nameCateFemale in categoryFemale" 
                           :key="nameCateFemale"
                           :href="`/category-gender?gender=Nữ&name=${nameCateFemale}`"
                           class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
                           {{ nameCateFemale }}
                        </a>
                    </div>
                </div>

                <!-- Dropdown Phu Kien -->
                <div class="relative group" @mouseenter="showPhuKienDropdown = true" @mouseleave="showPhuKienDropdown = false">
                    <a href="/phu-kien" 
                       class="text-sm font-bold uppercase tracking-wide transition-colors flex items-center gap-1"
                       :class="isActive('/phu-kien') ? 'text-red-600' : 'text-gray-900 hover:text-gray-500'">
                        Phụ kiện <span class="text-[10px] mt-0.5">▼</span>
                    </a>
                    <div v-if="showPhuKienDropdown" class="absolute top-full left-0 w-48 bg-white border border-gray-100 shadow-xl rounded-b-md py-2 animate-fade-in-up">
                         <a href="/phu-kien/tui" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black">Túi xách</a>
                         <a href="/phu-kien/giay" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black">Giày dép</a>
                         <a href="/phu-kien/non" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black">Nón</a>
                    </div>
                </div>
            </nav>

            <!-- Icons & Search -->
            <div class="flex items-center gap-6">
                <!-- Search Bar -->
                <div class="relative hidden md:block" ref="searchBarRef">
                    <div class="flex items-center border border-gray-200 rounded-full px-4 py-2 focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all w-64 bg-gray-50">
                        <input 
                            v-model="searchQuery"
                            type="text" 
                            placeholder="Tìm kiếm..." 
                            class="bg-transparent border-none outline-none text-sm w-full placeholder-gray-400 text-gray-900"
                            @focus="showFormSearch = true"
                        />
                        <i class="fa-solid fa-magnifying-glass text-gray-400"></i>
                    </div>

                    <!-- Search Results -->
                    <div v-if="showFormSearch" class="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-100 shadow-2xl rounded-lg overflow-hidden max-h-[80vh] overflow-y-auto z-50 animate-fade-in">
                        <div class="p-3 bg-gray-50 border-b border-gray-100 font-semibold text-xs text-gray-500 uppercase tracking-wider text-center">
                            Kết quả tìm kiếm
                        </div>
                        <!-- <div v-if="listSearch.length === 0" class="p-4 text-center text-sm text-gray-500">
                            Không tìm thấy sản phẩm nào.
                        </div>
                        <div v-else class="divide-y divide-gray-50">
                            <div v-for="product in listSearch" :key="product.id" 
                                 class="flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors gap-3 group"
                                 @click="router.push({ name: 'product-detail', params: { id: product.id } })">
                                <div class="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                                    <img :src="getImage(product.thumbnail || '')" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
                                     <span v-if="getDiscountPercent(product.max_price, product.flash_price) > 0" class="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-1 rounded-bl-md">
                                        -{{ getDiscountPercent(product.max_price, product.flash_price) }}%
                                     </span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs text-gray-400 mb-0.5 uppercase tracking-wide">NAVA</p>
                                    <h4 class="text-sm font-medium text-gray-900 truncate">{{ product.name }}</h4>
                                    <div class="flex items-baseline gap-2 mt-1">
                                        <span class="text-sm font-bold text-red-600">
                                            {{ product.flash_price ? formatPrice(product.flash_price) : formatPrice(product.min_price) }}
                                        </span>
                                        <span v-if="product.flash_price" class="text-xs text-gray-400 line-through">
                                            {{ formatPrice(product.max_price) }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div> -->
                    </div>
                </div>

                <!-- Cart -->
                <!-- <div class="relative cursor-pointer group" @click="goToCart">
                    <i class="fa-solid fa-cart-shopping text-xl text-gray-800 group-hover:text-black transition-colors"></i>
                    <span v-if="cart.cartCount.length > 0" class="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                        {{ cart.cartCount.length }}
                    </span>
                </div> -->

                <!-- User -->
                <div class="relative group" @mouseenter="showFormUser = true" @mouseleave="showFormUser = false">
                    <!-- <div class="w-8 h-8 rounded-full border border-gray-300 overflow-hidden cursor-pointer flex items-center justify-center hover:border-black transition-colors">
                        <img v-if="u.avatar && !isLogOut" :src="getImage(u.avatar)" class="w-full h-full object-cover" alt="" />
                        <i v-else class="fa-solid fa-user text-gray-500 text-sm"></i>
                    </div> -->

                    <!-- User Dropdown -->
                    <div v-if="showFormUser" class="absolute top-full right-0  w-48 bg-white border border-gray-100 shadow-xl rounded-lg overflow-hidden z-50 animate-fade-in-up">
                        <div v-if="!isLogin" class="p-2 space-y-2">
                             <button @click="goToLogin" class="w-full block text-center py-2 px-4 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors">
                                Đăng nhập
                             </button>
                             <button @click="goToRegister" class="w-full block text-center py-2 px-4 border border-black text-black text-sm font-medium rounded hover:bg-gray-50 transition-colors">
                                Đăng ký
                             </button>
                        </div>
                        <div v-else class="py-1">
                            <div @click="goToProfile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black cursor-pointer transition-colors">
                                <i class="fa-regular fa-id-card mr-2"></i> Hồ sơ
                            </div>
                            <div @click="goToLogout" class="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors">
                                <i class="fa-solid fa-arrow-right-from-bracket mr-2"></i> Đăng xuất
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>

    <!-- Mobile Menu Overlay -->
    <div v-if="showMenuPhone" class="lg:hidden absolute top-full left-0 w-full bg-white border-b border-gray-200 shadow-xl z-40 animate-fade-in">
        <div class="flex flex-col p-4 space-y-4">
            <a href="/home" class="text-base font-medium text-gray-900 border-b border-gray-100 pb-2">Trang chủ</a>
            <a href="/deal-hot" class="text-base font-medium text-red-600 border-b border-gray-100 pb-2">Ưu đãi cực hot</a>
            <a href="/category-gender?gender=Nam" class="text-base font-medium text-gray-900 border-b border-gray-100 pb-2">Nam</a>
            <a href="/category-gender?gender=Nữ" class="text-base font-medium text-gray-900 border-b border-gray-100 pb-2">Nữ</a>
            <a href="/category-gender?gender=Nữ" class="text-base font-medium text-gray-900">Phụ kiện</a>
             <!-- Mobile Search -->
            <div class="relative mt-4">
                 <input 
                    v-model="searchQuery"
                    type="text" 
                    placeholder="Tìm kiếm..." 
                    class="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none"
                    @focus="showFormSearch = true"
                />
            </div>
        </div>
    </div>
  </header>
  <!-- Spacer to prevent content overlap with fixed header -->
  <div class="h-28"></div>
</template>

<style scoped>
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.animate-fade-in-up {
    animation: fadeInUp 0.2s ease-out forwards;
}

.animate-fade-in {
    animation: fadeIn 0.2s ease-out forwards;
}
</style>