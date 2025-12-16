<script setup lang="ts">
import { useRouter } from 'vue-router';

const props = defineProps<{
    stats: any[]; 
    currentBranch: string; 
}>();

const router = useRouter();

const getPercentage = (count: number, total: number) => {
    return total === 0 ? '0%' : `${((count / total) * 100).toFixed(0)}%`;
};

const handleImageError = (e: Event) => {
    (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Img';
};
const goToDetail = (productId: string) => {
    router.push({
        name: 'ProductReviewDetail', 
        params: { product_id: productId },
        query: { branch: props.currentBranch } 
    });
};
</script>

<template>
    <div class="overflow-x-auto bg-white rounded-xl shadow border border-gray-200 custom-scrollbar">
        <table class="min-w-[1000px] w-full divide-y divide-gray-200 table-fixed">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[120px]">
                        Ảnh
                    </th>
                    
                    <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Thông Tin Sản Phẩm
                    </th>
                    
                    <th class="px-2 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-[100px]">
                        Điểm TB
                    </th>
                    
                    <th class="px-2 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-[100px]">
                        Reviews
                    </th>
                    
                    <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[260px]">
                        Phân Bổ Sao
                    </th>
                    
                    <th class="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-[120px]">
                        Chi tiết
                    </th>
                </tr>
            </thead>

            <tbody class="divide-y divide-gray-200">
                <tr 
                    v-for="item in stats" 
                    :key="item.product_id" 
                    class="hover:bg-indigo-50/30 transition duration-150 ease-in-out group"
                >
                    <td class="px-6 py-4 whitespace-nowrap align-middle">
                        <div class="flex-shrink-0 h-20 w-20">
                            <img 
                                :src="item.product_image && item.product_image !== 'default-product.png' ? item.product_image : 'https://placehold.co/100x100?text=No+Img'" 
                                alt="Product"
                                class="h-20 w-20 rounded-lg object-cover border border-gray-200 shadow-sm group-hover:scale-105 transition-transform duration-200"
                                @error="handleImageError"
                            />
                        </div>
                    </td>

                    <td class="px-6 py-4 align-middle">
                        <div class="flex flex-col pr-4">
                            <span class="text-sm font-semibold text-gray-900 line-clamp-2" :title="item.product_name">
                                {{ item.product_name }}
                            </span>
                            <span class="text-xs text-gray-400 mt-1 font-mono truncate">
                                ID: {{ String(item.product_id).toUpperCase() }}
                            </span>
                        </div>
                    </td>

                    <td class="px-2 py-4 whitespace-nowrap text-center align-middle">
                        <div class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold bg-yellow-100 text-yellow-800">
                            {{ item.avg_star || '0.0' }}
                            <i class="fa-solid fa-star ml-1 text-yellow-500 text-xs"></i>
                        </div>
                    </td>

                    <td class="px-2 py-4 whitespace-nowrap text-center text-sm text-gray-600 font-medium align-middle">
                        {{ item.total_reviews }}
                    </td>

                    <td class="px-6 py-4 align-middle">
                        <div class="flex flex-col space-y-1.5 w-full">
                            <div v-for="star in [5, 4, 3, 2, 1]" :key="star" class="flex items-center text-xs">
                                <span class="w-3 text-gray-500 font-medium mr-1">{{ star }}</span>
                                <i class="fa-solid fa-star text-[10px] text-gray-300 mr-2"></i>
                                
                                <div class="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        :class="[
                                            'h-1.5 rounded-full transition-all duration-500',
                                            star >= 4 ? 'bg-green-500' : (star === 3 ? 'bg-yellow-400' : 'bg-red-400')
                                        ]"
                                        :style="{ width: getPercentage(item[`total_${star}_star`], item.total_reviews) }"
                                    ></div>
                                </div>
                                <span class="ml-2 w-8 text-right text-gray-400 tabular-nums">
                                    {{ getPercentage(item[`total_${star}_star`], item.total_reviews) }}
                                </span>
                            </div>
                        </div>
                    </td>

                    <td class="px-6 py-4 whitespace-nowrap text-center align-middle">
                        <button 
                            @click="goToDetail(item.product_id)" 
                            class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-indigo-600 hover:text-white transition-all duration-200 shadow-sm outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            title="Xem chi tiết"
                        >
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
        
        <div v-if="stats.length === 0" class="flex flex-col items-center justify-center py-12 text-gray-500">
            <div class="bg-gray-100 p-4 rounded-full mb-3">
                <i class="fa-regular fa-folder-open text-3xl text-gray-400"></i>
            </div>
            <p class="font-medium">Chưa có dữ liệu đánh giá nào.</p>
            <p class="text-sm text-gray-400 mt-1">Vui lòng chọn chi nhánh khác hoặc kiểm tra lại sau.</p>
        </div>
    </div>
</template>

<style scoped>
/* Scrollbar riêng cho bảng */
.custom-scrollbar::-webkit-scrollbar {
  height: 8px; /* Chiều cao cho scrollbar ngang */
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #d1d5db; 
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #9ca3af; 
}
</style>