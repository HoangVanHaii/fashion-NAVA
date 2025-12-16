import { defineStore } from "pinia";
import { ref } from "vue";
import type { CreateReviewPayload, ProductStat } from "../interfaces/review";
import { 
    createReview, 
    getReviewsByOrderItemIdOfMe, 
    getAllProductStats, 
    getAllProductStatsCentral, 
    getTopDiscussedByProduct, 
    
    getReviewsByProductIdGuest,
    getReviewsByProductId,
    deleteChildReview,
    addChildReview, 
    updateChildReview,
    deleteReview
} from "../services/review";

export const useReviewStore = defineStore('review', () => {
    const loading = ref(false);
    const currentBranch = ref<string>('');
    const error = ref<string | null>(null);
    
    const dashboardTab = ref<string>('stats'); 

    const branchStats = ref<ProductStat[]>([]);
    const centralStats = ref<ProductStat[]>([]);
    
    // --- GIỮ LẠI BIẾN CŨ ---
    const currentProductReviews = ref<any>(null);
    const topDiscussedReviews = ref<any[]>([]);

    // --- THÊM BIẾN MỚI CHO LOGIC MỚI ---
    const reviews = ref<any[]>([]);       
    const total_reviews = ref<number>(0); 
    const average_rating = ref<number>(0);

    // --- SỬA HÀM NÀY ---
    const getReviewsByProductIdStore = async (product_id: string, branch_code?: string) => {
        loading.value = true;
        error.value = null;
        try {
            const token = localStorage.getItem("accessToken");
            let res;

            if (token) {
                try {
                    // 1. Cố gắng gọi API User trước
                    res = await getReviewsByProductId(product_id, branch_code);
                } catch (authError: any) {
                    // 2. Nếu lỗi 401 (Hết hạn) hoặc 403 (Token rác) -> Chuyển sang gọi Guest
                    if (authError.response && (authError.response.status === 401 || authError.response.status === 403)) {
                        console.warn("Token hết hạn/lỗi, tự động chuyển sang chế độ Guest...");
                        
                        // (Tùy chọn) Xóa token rác đi để lần sau đỡ phải check lại
                        // localStorage.removeItem("accessToken"); 
                        // userStore.logout(); // Nếu có store user

                        // Gọi API Guest cứu cánh
                        res = await getReviewsByProductIdGuest(product_id, branch_code);
                    } else {
                        // Nếu lỗi khác (500 Server, 404 Not found...) thì ném lỗi ra ngoài như thường
                        throw authError;
                    }
                }
            } else {
                // Không có token thì gọi Guest luôn
                res = await getReviewsByProductIdGuest(product_id, branch_code);
            }

            // Cập nhật State (Đoạn này giữ nguyên)
            if (res.success && res.data) {
                currentProductReviews.value = res.data; 
                
                reviews.value = res.data.reviews || [];
                total_reviews.value = res.data.total_reviews || 0;
                average_rating.value = res.data.average_rating || 0;
            } else {
                currentProductReviews.value = null;
                reviews.value = [];
            }
            
            return res.data;

        } catch (err: any) {
            console.error(`Failed to fetch reviews for product ${product_id}:`, err);
            error.value = err.response?.data?.message || "Lấy chi tiết đánh giá thất bại.";
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

                // Update cho list cũ
                if (currentProductReviews.value && currentProductReviews.value.reviews) {
                    removeChildFromList(currentProductReviews.value.reviews);
                }
                
                // Update cho list mới (quan trọng cho UI mới)
                removeChildFromList(reviews.value);

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
    const mustbeLogin = ref(false);
    const replyReviewStore = async (parentId: string, comment: string, user: any, files?: File[]) => {
        try {
            console.log("🚀 Đang gọi API reply cho ID:", parentId);
            
            const res = await addChildReview(parentId, comment, files);
            
            if (res.success) {
                console.log("✅ API thành công, Response:", res);
                const createdChild = res.review?.child_reviews?.slice(-1)[0]; 
                const newChildId = createdChild?._id || Date.now().toString();
                const newReply = {
                    _id: newChildId,
                    comment: comment,
                    user_id: user.id,
                    user: {
                        id: user.id,
                        name: user.name,
                        avatar: user.avatar
                    },
                    createdAt: new Date().toISOString(),
                    images: createdChild?.images || [], 
                    videos: createdChild?.videos || []
                };

                const addReplyToList = (list: any[]) => {
                    const parent = list.find((r: any) => 
                        r._id === parentId || 
                        r.mongodb_id === parentId || 
                        r.review_id_sql === parentId
                    );
                    
                    if (parent) {
                        if (!parent.child_reviews) parent.child_reviews = [];
                        
                        parent.child_reviews.push(newReply);
                        return true;
                    }
                    return false;
                };

                addReplyToList(reviews.value);
                if(topDiscussedReviews.value.length) addReplyToList(topDiscussedReviews.value);
                
                return true;
            }
            return false;
        } catch (err: any) {
            console.error("❌ Lỗi Reply Store:", err);
            const status = err.response?.status;
            if(status == 401) {
                mustbeLogin.value = true;
            }
            alert(err.response?.data?.message || "Lỗi khi gửi phản hồi");
            return false;
        }
    };
    const editChildReviewStore = async (parentId: string, childId: string, comment: string, files?: File[]) => {
        try {
            // 🔥 CHÚ Ý: Cần truyền files vào updateChildReview nếu có logic upload ảnh khi sửa
            const res = await updateChildReview(parentId, childId, comment, files); 
            
            if (res.success) {
                // Lấy review cha sau khi update từ response (nếu có)
                const updatedParentReview = res.review; 

                // Hàm cập nhật mảng local
                const updateList = (list: any[]) => {
                    const parent = list.find((r: any) => r.review_id_sql === parentId || r._id === parentId);
                    if (parent && parent.child_reviews) {
                        const child = parent.child_reviews.find((c: any) => c._id === childId);
                        
                        if (child) {
                            child.comment = comment;
                            
                            // Nếu Backend trả về parent review đã cập nhật, ta tìm child tương ứng
                            if (updatedParentReview && updatedParentReview.child_reviews) {
                                const newChildData = updatedParentReview.child_reviews.find((c: any) => c._id === childId);
                                
                                // 🔥 CẬP NHẬT ẢNH VÀ VIDEO MỚI (nếu có)
                                if (newChildData) {
                                    child.images = newChildData.images || [];
                                    child.videos = newChildData.videos || [];
                                }
                            }
                        }
                    }
                };
                
                updateList(reviews.value);
                if (topDiscussedReviews.value.length > 0) updateList(topDiscussedReviews.value);
                
                return true; // Trả về true để Vue đóng form
            }
            return false;
        } catch (err: any) {
            console.error("Update failed:", err);
            alert(err.response?.data?.message || "Cập nhật thất bại.");
            return false; // Trả về false khi lỗi
        }
    };
    const resetReviewState = () => {
        reviews.value = [];
        total_reviews.value = 0;
        average_rating.value = 0;
        currentProductReviews.value = null;
        error.value = null;
    }

    const deleteReviewStore = async (reviewIdSql: string, mongoId: string) => {
        loading.value = true;
        error.value = null;
        try {
            const res = await deleteReview(reviewIdSql, mongoId);
            return res; // Trả về kết quả để component xử lý (alert/toast)
        } catch (err: any) {
            console.error("Failed to delete review:", err);
            error.value = err.response?.data?.message || "Xóa đánh giá thất bại.";
            throw err;
        } finally {
            loading.value = false;
        }
    };

    return {
        loading,
        error,
        currentBranch,
        dashboardTab, 
        
        branchStats,
        centralStats,
        
        // Export cũ
        currentProductReviews,
        topDiscussedReviews,

        // Export mới (cho ProductDetail mới)
        reviews,
        total_reviews,
        average_rating,

        createReviewStore,
        getReviewsByOrderItemIdOfMeStore,
        getAllProductStatsStore,
        getCentralProductStatsStore,
        getTopDiscussedByProductStore,
        getReviewsByProductIdStore,
        deleteChildReviewStore,
        resetReviewState,
        replyReviewStore,
        editChildReviewStore,
        mustbeLogin,
        deleteReviewStore
    };
});