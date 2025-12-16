<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import SideBarProfile from "@/components/SideBarProfile.vue";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";

// --- State ---
const showNavbar = ref(true);

// Danh sách thông báo (Mặc định rỗng để hiện Empty State)
const notifications = ref<any[]>([]); 

// --- Lifecycle ---
const handleResize = () => {
  showNavbar.value = window.innerWidth > 1024;
};

onMounted(() => {
  handleResize();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => window.removeEventListener("resize", handleResize));

// --- Actions (Demo) ---
const markAllAsRead = () => {
    // Logic đánh dấu đã đọc (nếu có thông báo)
};
</script>

<template>
  <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900 pt-[26px]">
    <Header />
    
    <main class=" pb-20">
        <div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col lg:flex-row gap-8 items-start">
                
                <div class="w-full lg:w-[280px] flex-shrink-0">
                    <SideBarProfile
                        v-model:show-menu="showNavbar"
                        :show-detail="false"
                        :show-address="false"
                        :show-favourite="false"
                        :show-notification="true" 
                        :show-order="false"
                        :show-profile="false"
                        :show-register-seller="false"
                        :show-reset-password="false"
                        :show-voucher="false"
                    />
                </div>

                <div class="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in min-h-[600px] flex flex-col">
                    
                    <div class="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <i class="fa-solid fa-bell text-red-500"></i> Thông báo
                            </h1>
                            <p class="text-sm text-gray-500 mt-1">Cập nhật tin tức, khuyến mãi và trạng thái đơn hàng</p>
                        </div>
                        
                        <button 
                            v-if="notifications.length > 0"
                            @click="markAllAsRead"
                            class="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                            Đánh dấu đã đọc tất cả
                        </button>
                    </div>

                    <div class="p-8 bg-gray-50 flex-1">
                        
                        <div v-if="notifications.length === 0" class="flex flex-col items-center justify-center h-96 text-center animate-fade-in">
                            <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100 relative group">
                                <i class="fa-regular fa-bell text-4xl text-gray-300 group-hover:scale-110 transition-transform duration-300"></i>
                                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div class="w-12 h-0.5 bg-gray-300 rotate-45 rounded-full border-2 border-white"></div>
                                </div>
                            </div>
                            
                            <h3 class="text-lg font-bold text-gray-900 mb-2">Không có thông báo nào</h3>
                            <p class="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                                Hiện tại bạn chưa có thông báo mới. <br>
                                Các cập nhật về đơn hàng và khuyến mãi sẽ xuất hiện tại đây.
                            </p>
                            
                            <button 
                                class="mt-6 px-6 py-2.5 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-all shadow-md hover:shadow-lg active:scale-95"
                                @click="$router.push('/')"
                            >
                                Tiếp tục mua sắm
                            </button>
                        </div>

                        <div v-else class="space-y-3">
                            <div 
                                v-for="(item, index) in notifications" 
                                :key="index"
                                class="bg-white p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer flex gap-4"
                            >
                                </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>