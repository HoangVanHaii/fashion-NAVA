<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useReviewStore } from '../stores/reviewStore';

const route = useRoute();
const router = useRouter();
const reviewStore = useReviewStore();

const productId = route.params.product_id as string;
const branchCode = computed(() => (route.query.branch as string) || '');

const filterMode = ref<'latest' | 'discussed'>('latest');

onMounted(async () => {
    if (productId) {
        await reviewStore.getReviewsByProductIdStore(productId, branchCode.value);
    }
});

const reviewData = computed(() => reviewStore.currentProductReviews);
const reviews = computed(() => {
    if (filterMode.value === 'discussed') {
        return reviewStore.topDiscussedReviews || [];
    }
    return reviewData.value?.reviews || [];
});

const stats = computed(() => ({
    total: reviewData.value?.total_reviews || 0,
    avg: reviewData.value?.average_rating || 0
}));

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
    });
};

const goBack = () => router.back();

const changeFilter = async (mode: 'latest' | 'discussed') => {
    if (mode === filterMode.value) return; 
    filterMode.value = mode; 
    
    if (mode === 'discussed') {
        await reviewStore.getTopDiscussedByProductStore(productId);
    } else {
        await reviewStore.getReviewsByProductIdStore(productId, branchCode.value);
    }
};

const replyingToId = ref<string | null>(null);
const replyContent = ref('');

const openReplyBox = (reviewId: string) => {
    if (replyingToId.value === reviewId) {
        replyingToId.value = null; 
    } else {
        replyingToId.value = reviewId;
        replyContent.value = ''; 
    }
};

const submitReply = async (reviewId: string) => {
    if (!replyContent.value.trim()) return alert("Vui lòng nhập nội dung!");
    if (confirm("Bạn có chắc muốn gửi câu trả lời này?")) {
        alert(`[TEST] Đã gửi trả lời cho review ${reviewId}:\n"${replyContent.value}"`);
        replyingToId.value = null; 
    }
};

const handleDeleteReply = async (parentMongoId: string, childId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa vĩnh viễn câu trả lời này không?")) {
        await reviewStore.deleteChildReviewStore(parentMongoId, childId);
    }
};

</script>

<template>
    <div class="p-6 bg-gray-50 min-h-screen">
        
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
                <button 
                    @click="goBack"
                    class="p-2 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm"
                >
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h1 class="text-2xl font-bold text-gray-800">Chi Tiết Đánh Giá</h1>
                    <p class="text-sm text-gray-500 mt-1">
                        Dữ liệu chi nhánh: 
                        <span class="font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded">
                            {{ branchCode || 'Mặc định' }}
                        </span>
                    </p>
                </div>
            </div>
        </div>

        <div v-if="reviewStore.loading" class="h-64 flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100">
            <i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-500 mb-4"></i>
            <p class="text-gray-500 font-medium">Đang tải dữ liệu...</p>
        </div>

        <div v-else>
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 flex items-center gap-8">
                <div class="flex flex-col items-center justify-center pr-8 border-r border-gray-100 min-w-[150px]">
                    <span class="text-5xl font-extrabold text-gray-800">{{ stats.avg }}</span>
                    <div class="flex items-center text-yellow-400 text-sm my-2 gap-1">
                        <i v-for="n in 5" :key="n" class="fa-solid fa-star" :class="n <= Math.round(stats.avg) ? '' : 'text-gray-200'"></i>
                    </div>
                    <span class="text-gray-500 text-sm font-medium">{{ stats.total }} đánh giá</span>
                </div>

                <div class="flex-1">
                    <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Sản phẩm đang xem</h3>
                    <div class="flex items-center gap-2">
                        <span class="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-md font-mono text-sm border border-gray-200">
                            ID: {{ productId }}
                        </span>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-gray-700 flex items-center gap-2">
                    Danh sách đánh giá
                    <span class="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{{ reviews.length }}</span>
                </h3>
                
                <div class="bg-white border border-gray-200 p-1 rounded-lg flex text-sm shadow-sm">
                    <button 
                        @click="changeFilter('latest')"
                        :class="['px-4 py-1.5 rounded-md transition-all font-medium', filterMode === 'latest' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50']"
                    >
                        Mới nhất
                    </button>
                    <button 
                        @click="changeFilter('discussed')"
                        :class="['px-4 py-1.5 rounded-md transition-all font-medium flex items-center gap-2', filterMode === 'discussed' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50']"
                    >
                        <i class="fa-solid fa-fire" :class="filterMode === 'discussed' ? 'text-orange-500' : 'text-gray-400'"></i> 
                        Sôi nổi nhất
                    </button>
                </div>
            </div>

            <div class="space-y-4">
                <div 
                    v-for="review in reviews" 
                    :key="review.review_id_sql || review._id" 
                    class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 transition hover:shadow-md"
                >
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex items-center gap-3">
                            <img 
                                :src="review.user?.avatar || 'https://placehold.co/50x50?text=U'" 
                                alt="User Avatar" 
                                class="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm"
                            />
                            <div>
                                <h4 class="text-sm font-bold text-gray-900">{{ review.user?.name || 'Người dùng ẩn danh' }}</h4>
                                <p class="text-xs text-gray-400">{{ formatDate(review.created_at || review.createdAt) }}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-100">
                            <span class="font-bold text-yellow-700 mr-1.5">{{ review.rating }}</span>
                            <i class="fa-solid fa-star text-yellow-400 text-xs"></i>
                        </div>
                    </div>

                    <div class="pl-13 ml-13 mb-4 border-l-2 border-gray-50 pl-4">
                        <p class="text-gray-700 text-base leading-relaxed mb-3">
                            {{ review.comment || 'Khách hàng không để lại bình luận.' }}
                        </p>
                        
                        <div v-if="review.images && review.images.length" class="flex gap-2 mb-3 flex-wrap">
                            <img 
                                v-for="(img, idx) in review.images" 
                                :key="idx" 
                                :src="img.secure_url || img" 
                                class="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                            />
                        </div>
                    </div>

                    <div v-if="review.child_reviews && review.child_reviews.length > 0" class="ml-13 mb-4 space-y-3">
                        <div 
                            v-for="reply in review.child_reviews" 
                            :key="reply._id" 
                            class="bg-indigo-50/60 p-4 rounded-lg border-l-4 border-indigo-500 ml-4 relative group"
                        >
                            <div class="absolute -top-2 left-4 w-4 h-4 bg-indigo-50 border-t border-l border-indigo-100 transform rotate-45"></div>

                            <div class="flex justify-between items-start mb-2">
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs shadow-sm">
                                        <i class="fa-solid fa-store"></i>
                                    </div>
                                    <span class="font-bold text-sm text-indigo-700">Cửa hàng phản hồi</span>
                                    <span class="text-xs text-gray-400">• {{ formatDate(reply.createdAt) }}</span>
                                </div>
                                
                                <button 
                                    @click="handleDeleteReply(review._id || review.review_id_sql, reply._id)"
                                    class="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                                    title="Xóa câu trả lời này"
                                >
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                            
                            <p class="text-gray-700 text-sm pl-8">
                                {{ reply.comment }}
                            </p>
                            
                            <div v-if="reply.images && reply.images.length > 0" class="flex gap-2 mt-2 pl-8">
                                <img 
                                    v-for="(childImg, cIdx) in reply.images" 
                                    :key="cIdx" 
                                    :src="childImg.secure_url || childImg" 
                                    class="w-16 h-16 object-cover rounded border border-indigo-100"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="border-t border-gray-100 pt-4 mt-2">
                        
                        <div class="flex justify-end gap-3" v-if="replyingToId !== (review.review_id_sql || review._id)">
                            <button 
                                @click="openReplyBox(review.review_id_sql || review._id)"
                                class="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded shadow-sm transition-colors flex items-center"
                            >
                                <i class="fa-solid fa-reply mr-2"></i> Trả lời
                            </button>
                        </div>

                        <div v-else class="mt-3 bg-gray-50 p-4 rounded-lg border border-gray-200 animate-fade-in-down">
                            <div class="flex justify-between items-center mb-2">
                                <label class="block text-sm font-bold text-gray-700">Phản hồi của cửa hàng:</label>
                                <button @click="replyingToId = null" class="text-gray-400 hover:text-gray-600">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                            
                            <textarea 
                                v-model="replyContent"
                                rows="3"
                                class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 border outline-none"
                                placeholder="Nhập nội dung trả lời khách hàng..."
                            ></textarea>
                            
                            <div class="mt-3 flex justify-end gap-2">
                                <button 
                                    @click="replyingToId = null" 
                                    class="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
                                >
                                    Hủy bỏ
                                </button>
                                <button 
                                    @click="submitReply(review.review_id_sql || review._id)" 
                                    class="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    <i class="fa-regular fa-paper-plane mr-1"></i> Gửi phản hồi
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                <div v-if="reviews.length === 0" class="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <div class="bg-gray-50 p-4 rounded-full mb-3">
                        <i class="fa-regular fa-comments text-4xl text-gray-300"></i>
                    </div>
                    <p class="text-gray-500 font-medium">
                        Chưa có đánh giá nào {{ filterMode === 'discussed' ? 'sôi nổi' : '' }} cho sản phẩm này.
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.animate-fade-in-down {
    animation: fadeInDown 0.3s ease-out;
}
@keyframes fadeInDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>