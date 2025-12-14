<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useReviewStore } from '../stores/reviewStore';

const props = defineProps<{
    productId: string;
}>();

const reviewStore = useReviewStore();
const activeFilter = ref('all'); 

onMounted(async () => {
    if (props.productId) {
        await reviewStore.getReviewsByProductIdStore(props.productId);
    }
});

const reviewData = computed(() => reviewStore.currentProductReviews);
const rawReviews = computed(() => reviewData.value?.reviews || []);

const stats = computed(() => ({
    total: reviewData.value?.total_reviews || 0,
    avg: reviewData.value?.average_rating || 0,
    star_counts: reviewData.value?.star_counts || {}
}));

const filteredReviews = computed(() => {
    let list = rawReviews.value;
    
    if (activeFilter.value === 'with_image') {
        list = list.filter((r: any) => r.images && r.images.length > 0);
    } else if (activeFilter.value === '5_star') {
        list = list.filter((r: any) => r.rating == 5);
    } else if (activeFilter.value === 'low_star') {
        list = list.filter((r: any) => r.rating <= 3);
    }
    
    return list;
});

const getPercentage = (star: number) => {
    if (!stats.value.total) return '0%';
    const count = stats.value.star_counts?.[star] || 0;
    return `${((count / stats.value.total) * 100).toFixed(0)}%`;
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
};
</script>

<template>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
        <h2 class="text-xl font-bold text-gray-800 mb-6">Đánh Giá Sản Phẩm</h2>

        <div class="flex flex-col md:flex-row gap-8 mb-8 border-b border-gray-100 pb-8">
            <div class="flex flex-col items-center justify-center min-w-[150px]">
                <div class="text-5xl font-extrabold text-indigo-600 mb-2">
                    {{ stats.avg.toFixed(1) }}<span class="text-2xl text-gray-400">/5</span>
                </div>
                <div class="flex items-center gap-1 mb-2">
                    <i v-for="n in 5" :key="n" class="fa-solid fa-star text-lg" 
                       :class="n <= Math.round(stats.avg) ? 'text-yellow-400' : 'text-gray-200'"></i>
                </div>
                <div class="text-sm text-gray-500 font-medium">({{ stats.total }} đánh giá)</div>
            </div>

            <div class="flex-1 space-y-2">
                <div v-for="star in [5, 4, 3, 2, 1]" :key="star" class="flex items-center gap-3 text-sm">
                    <span class="w-8 font-medium text-gray-600">{{ star }} sao</span>
                    <div class="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-yellow-400 rounded-full" 
                             :style="{ width: getPercentage(star) }"></div>
                    </div>
                    <span class="w-10 text-right text-gray-400 text-xs">{{ getPercentage(star) }}</span>
                </div>
            </div>
        </div>

        <div class="flex flex-wrap gap-2 mb-6">
            <button 
                @click="activeFilter = 'all'"
                :class="['px-4 py-2 rounded-full text-sm font-medium border transition-all', 
                    activeFilter === 'all' ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-gray-200 text-gray-600 hover:border-gray-300']"
            >
                Tất cả
            </button>
            <button 
                @click="activeFilter = 'with_image'"
                :class="['px-4 py-2 rounded-full text-sm font-medium border transition-all', 
                    activeFilter === 'with_image' ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-gray-200 text-gray-600 hover:border-gray-300']"
            >
                Có hình ảnh
            </button>
            <button 
                @click="activeFilter = '5_star'"
                :class="['px-4 py-2 rounded-full text-sm font-medium border transition-all', 
                    activeFilter === '5_star' ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-gray-200 text-gray-600 hover:border-gray-300']"
            >
                5 Sao
            </button>
        </div>

        <div v-if="reviewStore.loading" class="text-center py-10">
            <i class="fa-solid fa-spinner fa-spin text-3xl text-indigo-500"></i>
        </div>

        <div v-else-if="filteredReviews.length === 0" class="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <p class="text-gray-500">Chưa có đánh giá nào phù hợp bộ lọc.</p>
        </div>

        <div v-else class="space-y-6">
            <div v-for="review in filteredReviews" :key="review.review_id_sql || review._id" class="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <img :src="review.user?.avatar || 'https://placehold.co/50x50?text=User'" class="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        <div>
                            <div class="text-sm font-bold text-gray-900">{{ review.user?.name || 'Khách hàng ẩn danh' }}</div>
                            <div class="flex items-center text-xs text-yellow-400 mt-0.5">
                                <i v-for="n in 5" :key="n" class="fa-solid fa-star" :class="n <= review.rating ? '' : 'text-gray-200'"></i>
                            </div>
                        </div>
                    </div>
                    <span class="text-xs text-gray-400">{{ formatDate(review.created_at || review.createdAt) }}</span>
                </div>

                <div class="pl-13 ml-13"> <p class="text-gray-700 text-sm leading-relaxed mb-3">{{ review.comment }}</p>
                    
                    <div v-if="review.images && review.images.length" class="flex gap-2 mb-4 overflow-x-auto pb-2">
                        <img 
                            v-for="(img, idx) in review.images" 
                            :key="idx" 
                            :src="img.secure_url || img" 
                            class="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-90"
                        />
                    </div>

                    <div v-if="review.child_reviews && review.child_reviews.length > 0" class="bg-gray-50 rounded-lg p-4 mt-3 border border-gray-200">
                        <div v-for="reply in review.child_reviews" :key="reply._id" class="text-sm">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-bold text-indigo-600 text-xs uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Shop Phản Hồi</span>
                                <span class="text-xs text-gray-400">{{ formatDate(reply.createdAt) }}</span>
                            </div>
                            <p class="text-gray-600">{{ reply.comment }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>