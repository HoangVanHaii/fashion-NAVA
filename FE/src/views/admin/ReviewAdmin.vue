<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useReviewStore } from '@/stores/reviewStore';
import BranchSelector from '@/components/BranchSelector.vue';
import ProductStatsTable from '@/components/ProductStatsTable.vue';
import Navbar from '@/components/admin/Navbar.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter(); 
const reviewStore = useReviewStore();
const auth = useAuthStore();


const isAdmin = computed(() => auth.user?.role === 'admin');
const userBranchCode = computed(() => auth.user?.branch);

const activeTab = ref(reviewStore.dashboardTab || 'stats'); 

const selectedBranch = ref(userBranchCode.value);
const searchQuery = ref(''); 

watch(activeTab, (newTab) => {
    reviewStore.dashboardTab = newTab;
});

const fetchStats = async () => {
    await reviewStore.getAllProductStatsStore();
};

const filteredProducts = computed(() => {
    const source = (selectedBranch.value === 'CENTRAL' && isAdmin.value) 
        ? reviewStore.centralStats 
        : reviewStore.branchStats;

    if (!searchQuery.value) return source;
    
    const lowerSearch = searchQuery.value.toLowerCase().trim();
    return source.filter(p => 
        (p.product_name && p.product_name.toLowerCase().includes(lowerSearch)) || 
        (p.product_id && String(p.product_id).toLowerCase().includes(lowerSearch))
    );
});

const goToDetail = (productId: number) => {
    router.push({
        name: 'ProductReviewDetail',
        params: { product_id: productId },
        query: { branch: selectedBranch.value } 
    });
};

const handleBranchChange = (newBranch: string) => {
    selectedBranch.value = newBranch;
};

watch(selectedBranch, (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) fetchStats();
}, { immediate: false });

onMounted(() => {
    if (!isAdmin.value) selectedBranch.value = userBranchCode.value;
    
    // Đồng bộ lại tab từ store lần nữa cho chắc chắn
    activeTab.value = reviewStore.dashboardTab;
    
    fetchStats();
});
</script>

<template>
    <div class="flex h-screen bg-[#F3F4F6] font-sans overflow-hidden">
        
        <Navbar />

        <div class="flex-1 h-full overflow-y-auto p-6 bg-gray-50">
            
            <h1 class="text-3xl font-bold text-gray-800 mb-6">📊 Dashboard Quản Lý Đánh Giá</h1>

            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6 flex items-center justify-between flex-wrap gap-4">
                <div class="flex items-center gap-4">
                    <span class="text-lg font-semibold text-gray-700">Đang xem:</span>
                    <BranchSelector v-if="isAdmin" :modelValue="selectedBranch || 'DN'" @update:modelValue="handleBranchChange" :allowCentral="true" />
                    <span v-else class="text-xl font-extrabold text-indigo-600 px-3 py-1 bg-indigo-50 rounded-lg">Chi nhánh {{ userBranchCode }}</span>
                </div>
                <div class="text-gray-600 text-sm">Quyền truy cập: <span class="font-bold text-indigo-600">{{ isAdmin ? 'Admin' : 'Nhân viên' }}</span></div>
            </div>

            <div class="mb-6 border-b border-gray-200">
                <nav class="flex space-x-6">
                    <button @click="activeTab = 'stats'" 
                        :class="['pb-3 px-1 font-medium text-sm transition-all border-b-2', activeTab === 'stats' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300']">
                        Thống Kê Tổng Quan
                    </button>
                    <button @click="activeTab = 'management'" 
                        :class="['pb-3 px-1 font-medium text-sm transition-all border-b-2', activeTab === 'management' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300']">
                        Quản Lý Review Chi Tiết
                    </button>
                </nav>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-lg min-h-[500px] relative border border-gray-100">
                <div v-if="reviewStore.loading" class="absolute inset-0 bg-white/80 flex items-center justify-center z-20 rounded-xl backdrop-blur-sm">
                    <div class="flex flex-col items-center">
                        <i class="fa-solid fa-circle-notch fa-spin text-indigo-600 text-4xl mb-3"></i>
                        <span class="text-gray-600 font-medium">Đang tải dữ liệu...</span>
                    </div>
                </div>
                
                <div v-if="activeTab === 'stats'">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-gray-800">Tổng Hợp Đánh Giá</h2>
                    </div>
                    <ProductStatsTable :stats="filteredProducts" :currentBranch="selectedBranch || 'DN'" />
                </div>

                <div v-else-if="activeTab === 'management'">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-6 border-b border-gray-100">
                        <div>
                            <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <i class="fa-solid fa-list-check text-indigo-500"></i> Danh sách sản phẩm
                            </h2>
                            <p class="text-sm text-gray-500 mt-1">Chọn sản phẩm để xem chi tiết và phản hồi khách hàng.</p>
                        </div>
                        
                        <div class="relative w-full md:w-80 group">
                            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                <i class="fa-solid fa-magnifying-glass"></i>
                            </span>
                            <input v-model="searchQuery" type="text" 
                                class="w-full py-2 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm" 
                                placeholder="Tìm nhanh tên hoặc ID..." 
                            />
                        </div>
                    </div>

                    <div v-if="filteredProducts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <div v-for="product in filteredProducts" :key="product.product_id" 
                            class="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden"
                            @click="goToDetail(product.product_id)"
                        >
                            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>

                            <div class="flex gap-4 mb-3">
                                <div class="relative">
                                    <img :src="product.product_image && product.product_image !== 'default-product.png' ? product.product_image : 'https://placehold.co/100?text=SP'" 
                                        class="w-16 h-16 object-cover rounded-lg border border-gray-100 group-hover:scale-105 transition-transform bg-gray-50" 
                                    />
                                    <div class="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-gray-100" v-if="product.total_reviews > 0">
                                         <div class="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                            <i class="fa-solid fa-check text-[10px] text-green-600"></i>
                                         </div>
                                    </div>
                                </div>
                                <div class="flex-1 overflow-hidden flex flex-col justify-center">
                                    <h3 class="font-bold text-gray-800 text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors mb-1" :title="product.product_name">
                                        {{ product.product_name }}
                                    </h3>
                                    <p class="text-[10px] text-gray-400 truncate font-mono bg-gray-50 px-1.5 py-0.5 rounded inline-block w-fit">
                                        {{ product.product_id }}
                                    </p>
                                </div>
                            </div>
                            
                            <div class="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <div class="flex items-center text-yellow-500">
                                        <span class="font-bold text-sm mr-1">{{ product.avg_star }}</span>
                                        <i class="fa-solid fa-star text-xs"></i>
                                    </div>
                                    <span class="text-gray-300">|</span>
                                    <span class="text-xs font-medium text-gray-500">{{ product.total_reviews }} reviews</span>
                                </div>
                                <i class="fa-solid fa-chevron-right text-gray-300 text-xs group-hover:text-indigo-600 group-hover:translate-x-1 transition-all"></i>
                            </div>
                        </div>
                    </div>

                    <div v-else class="flex flex-col items-center justify-center py-20">
                        <div class="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mb-4 animate-bounce-slow">
                            <i class="fa-solid fa-magnifying-glass text-indigo-300 text-3xl"></i>
                        </div>
                        <h3 class="text-lg font-bold text-gray-700 mb-1">Không tìm thấy sản phẩm</h3>
                        <p class="text-gray-500 text-sm max-w-xs text-center">Chúng tôi không tìm thấy kết quả nào cho từ khóa "<strong>{{ searchQuery }}</strong>".</p>
                        <button @click="searchQuery = ''" class="mt-4 text-indigo-600 font-medium hover:underline text-sm">
                            Xóa bộ lọc & Xem tất cả
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes bounce-slow {
  0%, 100% { transform: translateY(-5%); }
  50% { transform: translateY(5%); }
}
.animate-bounce-slow {
  animation: bounce-slow 3s infinite;
}
</style>