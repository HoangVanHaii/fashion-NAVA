import { defineStore } from "pinia";
import { ref } from "vue";
import type { CreateReviewPayload, ProductStat, IReview } from "../interfaces/review";
import { 
    createReview, 
    getReviewsByOrderItemIdOfMe, 
    getAllProductStats, 
    getAllProductStatsCentral, 
    getTopDiscussedByProduct, 
    getReviewsByProductId, 
    deleteChildReview 
} from "../services/review";

export const useReviewStore = defineStore('review', () => {
    const loading = ref(false);
    const currentBranch = ref<string>('');
    const error = ref<string | null>(null);
    
    // [MỚI] State lưu Tab hiện tại của Dashboard (Mặc định là 'stats')
    const dashboardTab = ref<string>('stats'); 

    const branchStats = ref<ProductStat[]>([]);
    const centralStats = ref<ProductStat[]>([]);
    
    const currentProductReviews = ref<any>(null);
    const topDiscussedReviews = ref<any[]>([]);

    const getReviewsByProductIdStore = async (product_id: string, branch_code?: string) => {
        loading.value = true;
        error.value = null;
        try {
            const res = await getReviewsByProductId(product_id, branch_code);
            currentProductReviews.value = res.data; 
            return res.data;
        } catch (err: any) {
            console.error(`Failed to fetch reviews for product ${product_id}:`, err);
            error.value = err.response?.data?.message || "Lấy chi tiết đánh giá thất bại.";
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const getTopDiscussedByProductStore = async (product_id: string) => {
        loading.value = true;
        error.value = null;
        topDiscussedReviews.value = [];
        try {
            const res = await getTopDiscussedByProduct(product_id);
            if (res.success) {
                topDiscussedReviews.value = res.data; 
            }
            return res.data;
        } catch (err: any) {
            console.error(`Failed to fetch top discussed reviews:`, err);
            error.value = err.response?.data?.message || "Lấy reviews sôi nổi thất bại.";
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const createReviewStore = async (payload: CreateReviewPayload) => {
        loading.value = true;
        error.value = null;
        try {
            const data = await createReview(payload);
            return data;
        } catch (err: any) {
            console.error("Failed to create review:", err);
            error.value = err.response?.data?.message || "Tạo đánh giá thất bại.";
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const getReviewsByOrderItemIdOfMeStore = async (order_item_id: string) => {
        loading.value = true;
        try {
            const res = await getReviewsByOrderItemIdOfMe(order_item_id);
            return res.data;
        } catch (error) {
            console.error("Failed to fetch my review by order_item_id:", error);
            throw error;
        } finally {
            loading.value = false;
        }
    };

    const getAllProductStatsStore = async (branch_code: string) => {
        loading.value = true;
        error.value = null;
        try {
            const res = await getAllProductStats(branch_code);
            branchStats.value = res.data; 
        } catch (err: any) {
            console.error("Failed to fetch branch stats:", err);
            error.value = err.response?.data?.message || "Lấy thống kê chi nhánh thất bại.";
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const getCentralProductStatsStore = async () => {
        loading.value = true;
        error.value = null;
        try {
            const res = await getAllProductStatsCentral();
            centralStats.value = res.data; 
        } catch (err: any) {
            console.error("Failed to fetch central stats:", err);
            error.value = err.response?.data?.message || "Lấy thống kê toàn hệ thống thất bại.";
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const deleteChildReviewStore = async (parentId: string, childId: string) => {
        try {
            const res = await deleteChildReview(parentId, childId);

            if (res.success) {
                const removeChildFromList = (list: any[]) => {
                    if (!list) return;
                    const parent = list.find((r: any) => r.review_id_sql === parentId || r._id === parentId);
                    
                    if (parent && parent.child_reviews) {
                        parent.child_reviews = parent.child_reviews.filter((c: any) => c._id !== childId);
                        if (typeof parent.reply_count === 'number') {
                            parent.reply_count = Math.max(0, parent.reply_count - 1);
                        }
                    }
                };

                if (currentProductReviews.value && currentProductReviews.value.reviews) {
                    removeChildFromList(currentProductReviews.value.reviews);
                }

                if (topDiscussedReviews.value && topDiscussedReviews.value.length > 0) {
                    removeChildFromList(topDiscussedReviews.value);
                }

                alert("Đã xóa phản hồi thành công!");
            }
        } catch (err: any) {
            console.error("Failed to delete child review:", err);
            alert(err.response?.data?.message || "Xóa phản hồi thất bại.");
        }
    };

    return {
        loading,
        error,
        currentBranch,
        dashboardTab, // [QUAN TRỌNG] Export biến này ra
        
        branchStats,
        centralStats,
        
        currentProductReviews,
        topDiscussedReviews,

        createReviewStore,
        getReviewsByOrderItemIdOfMeStore,
        getAllProductStatsStore,
        getCentralProductStatsStore,
        getTopDiscussedByProductStore,
        getReviewsByProductIdStore,
        deleteChildReviewStore
    };
});