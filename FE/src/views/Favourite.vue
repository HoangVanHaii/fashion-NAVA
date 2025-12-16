<script setup lang="ts">
import Header from "../components/Header.vue";
import SideBarProfile from "@/components/SideBarProfile.vue";
import Loading from "../components/Loading.vue";
import Notification from "@/components/Notification.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import Footer from "@/components/Footer.vue";
import { ref, onMounted, onUnmounted } from "vue";
import { checkProductSale, formatPrice, getMainProductImage, getMaxProductPrice, getMinProductPrice } from "../utils/format";
import { useRouter } from "vue-router";
import { useFavouriteStore } from "../stores/favourite";

const showFormConfirm = ref(false);
const favourite = useFavouriteStore();
const showNotification = ref<boolean>(false);
const toastText = ref<string>("");
const router = useRouter();
const favouriteDelete_id = ref<string | null>(null);
const showNavbar = ref<boolean>(true);

onMounted(async () => {
  handleResize();
  await favourite.getFavouriteOfMeStore();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
});

const handleResize = () => {
  showNavbar.value = window.innerWidth > 1024;
};

const handleRefresh = () => {
  // router.go(0); // Thay vì reload trang, gọi lại hàm lấy dữ liệu sẽ mượt hơn
  favourite.getFavouriteOfMeStore();
};

const handleDelete = async () => {
  showNotification.value = false;
  toastText.value = "";
  showFormConfirm.value = false;
  if (favouriteDelete_id.value) {
    await favourite.deleteFavouriteStore(favouriteDelete_id.value);
    if (!favourite.error) {
      showNotification.value = true;
      toastText.value = "Đã xóa khỏi mục yêu thích";
      // Refresh list locally
      await favourite.getFavouriteOfMeStore();
    } else {
      toastText.value = "Xóa thất bại";
      showNotification.value = true;
    }
  }
};

const confirmDelete = (id: string) => {
    favouriteDelete_id.value = id;
    showFormConfirm.value = true;
}
</script>

<template>
  <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900 pt-[10px]">
    <Header />
    <ConfirmDialog
        v-if="showFormConfirm && favouriteDelete_id"
        :message="'Bạn có chắc chắn muốn bỏ sản phẩm này khỏi danh sách yêu thích?'"
        @close="showFormConfirm = false"
        @confirm="handleDelete"
    />
    <Notification :text="toastText" :isSuccess="showNotification" />
    <Loading :loading="favourite.loading" />

    <main class="pb-20 ">
        <div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start mt-4">
                <!-- Sidebar -->
                <div class="w-full lg:w-[280px] flex-shrink-0 lg:sticky lg:top-[130px] z-10">
                    <SideBarProfile
                        v-model:show-menu="showNavbar"
                        :show-detail="false"
                        :show-address="false"
                        :show-favourite="true"
                        :show-notification="false"
                        :show-order="false"
                        :show-profile="false"
                        :show-register-seller="false"
                        :show-reset-password="false"
                        :show-voucher="false"
                    />
                </div>

                <!-- Main Content -->
                <div class="flex-1 w-full min-w-0   pb-[10px]">
                    
                    <!-- Search Bar (Sticky) -->
                    <div class="sticky top-[114px] z-20 bg-[#FAFAFA] pb-4 pt-1">
                        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                            <div class="relative">
                                <input
                                    v-model="favourite.searchText"
                                    type="text"
                                    placeholder="Tìm kiếm sản phẩm yêu thích..."
                                    class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                                />
                                <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Favourites List (Scrollable) -->
                    <!-- UPDATED: Changed max-h-[700px] to max-h-[calc(100vh-240px)] to fit screen exactly -->
                    <div class="space-y-6 max-h-[calc(100vh-240px)] pb-[12px] overflow-y-auto custom-scrollbar pr-2">
                        
                        <!-- Empty State -->
                        <div v-if="!favourite.searchFilteredFavourite || favourite.searchFilteredFavourite.length === 0" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                            <div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="fa-regular fa-heart text-4xl text-gray-300"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-2">Chưa có sản phẩm yêu thích</h3>
                            <p class="text-gray-500 mb-8 text-sm">Hãy khám phá thêm sản phẩm và thả tim nhé!</p>
                            <div class="flex justify-center gap-4">
                                <button @click="router.push('/')" class="px-8 py-3 bg-black text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors shadow-lg">
                                    Khám phá ngay
                                </button>
                                <button v-if="favourite.listFavourite?.length != 0" @click="handleRefresh" class="px-6 py-3 border border-gray-300 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
                                    <i class="fa-solid fa-rotate-right"></i> Tải lại
                                </button>
                            </div>
                        </div>

                        <!-- Shop Group Loop -->
                        <div 
                            v-for="(favour, index) in favourite.searchFilteredFavourite" 
                            :key="index" 
                            class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
                        >
                            <!-- Shop Header -->
                            <!-- <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between sticky top-0 z-10">
                                <div class="flex items-center gap-3 cursor-pointer hover:text-black transition-colors">
                                    <div class="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500">
                                        <i class="fa-solid fa-store text-xs"></i>
                                    </div>
                                    <span class="font-bold text-sm text-gray-900">Nava </span>
                                    <i class="fa-solid fa-chevron-right text-[10px] text-gray-400"></i>
                                </div>
                            </div> -->

                            <!-- Products List -->
                            <div class="divide-y divide-gray-50 pb-[10px]">
                                <div class="p-6 flex flex-col sm:flex-row gap-4 sm:items-center hover:bg-gray-50/30 transition-colors group">
                                    
                                    <!-- Image -->
                                    <div v-if="favour.colors" class="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 cursor-pointer relative"  
                                         @click="router.push({ name: 'product-detail', params: { id: favour.product_id_sql } })">
                                        <img :src="getMainProductImage(favour)" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    </div>

                                    <!-- Info -->
                                    <div class="flex-1 min-w-0 flex flex-col justify-between py-1">
                                        <div>
                                            <h4 class="text-base font-bold text-gray-900 line-clamp-2 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
                                                @click="router.push({ name: 'product-detail', params: { id: favour?.product_id_sql } })">
                                                {{ favour.name }}
                                            </h4>
                                            <div class="flex flex-wrap gap-2 mb-2">
                                                <!-- <span class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded" v-if="favour.colors.length ">{{ product.color }}</span>
                                                <span class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded" v-if="product.size">{{ product.size }}</span> -->
                                            </div>
                                        </div>
                                        
                                        <div class="flex items-center gap-3 mt-1" v-if="favour.colors">
                                             <span class="text-lg font-black text-red-600">{{ formatPrice(getMinProductPrice(favour) || 0) }}</span>
                                             <span v-if="checkProductSale(favour)" class="text-xs text-gray-400 line-through">{{ formatPrice(getMaxProductPrice(favour) || 0) }}</span>
                                        </div>
                                    </div>

                                    <!-- Actions -->
                                    <div class="flex sm:flex-col items-center sm:items-end gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                                        <button 
                                            @click="router.push({ name: 'product-detail', params: { id: favour.product_id_sql } })"
                                            class="flex-1 sm:flex-none px-5 py-2.5 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-all shadow-md active:scale-95 whitespace-nowrap w-full sm:w-[120px] flex justify-center"
                                        >
                                            Xem chi tiết
                                        </button>
                                        
                                        <button 
                                            @click="confirmDelete(favour.product_id_sql)"
                                            class="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 text-gray-500 rounded-lg text-xs font-bold hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all whitespace-nowrap w-full sm:w-[120px] flex justify-center items-center gap-2"
                                        >
                                            <i class="fa-solid fa-trash-can"></i> Bỏ thích
                                        </button>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </main>
  </div>
  <Footer />
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
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
</style>