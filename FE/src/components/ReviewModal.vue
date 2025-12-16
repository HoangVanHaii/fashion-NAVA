<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useReviewStore } from "../stores/reviewStore";
import type { OrderItem } from '../interfaces/order'; 
import Loading from "../components/Loading.vue";
import Notification from "../components/Notification.vue";

const props = defineProps<{
  orderItem: OrderItem
}>();

const emit = defineEmits(["close", "refresh"]); 
const reviewStore = useReviewStore();

// State
const existingReview = ref<any>(null); 
const isReadonly = ref(false); // Trạng thái chỉ xem
const textToast = ref("");
const showNotification = ref(false);

// Form Data
const comment = ref("");
const rating = ref(5); 
const reviewImages = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);

// Helper lấy ID
const getItemId = () => props.orderItem.order_item_id || props.orderItem.id;

onMounted(async () => {
    const id = getItemId();
    if (!id) {
        console.error("Order Item ID is missing");
        return;
    }
    
    // Lấy review cũ
    const res = await reviewStore.getReviewsByOrderItemIdOfMeStore(id);
    
    if (res && Array.isArray(res) && res.length > 0) {
        // CÓ REVIEW -> Chế độ xem
        existingReview.value = res[0];
        isReadonly.value = true;
        
        // Fill sẵn dữ liệu cũ để lỡ user bấm Sửa thì có cái để sửa
        rating.value = existingReview.value.rating || 5;
        comment.value = existingReview.value.comment || "";
    } else {
        // KHÔNG CÓ -> Chế độ tạo mới
        isReadonly.value = false;
    }
});

const handleClose = () => {
  emit("close");
};

// --- LOGIC CHỈNH SỬA (Đã khôi phục) ---
const startEdit = () => {
    isReadonly.value = false; // Mở khóa form
};

const cancelEdit = () => {
    // Nếu đang sửa cái cũ -> Reset lại data cũ & Khóa lại
    if (existingReview.value) {
        rating.value = existingReview.value.rating;
        comment.value = existingReview.value.comment;
        reviewImages.value = []; // Xóa ảnh mới chọn (nếu có)
        isReadonly.value = true;
    } else {
        // Nếu là tạo mới -> Đóng modal luôn
        handleClose();
    }
};
// -------------------------------------

const ratingText = (r: number) => {
    switch(r) {
        case 1: return "Tệ";
        case 2: return "Không hài lòng";
        case 3: return "Bình thường";
        case 4: return "Hài lòng";
        case 5: return "Tuyệt vời";
        default: return "";
    }
};

const ratingTextColor = (r: number) => r >= 4 ? '#f6a700' : '#333';

const selectRating = (r: number) => {
    if (!isReadonly.value) rating.value = r;
};

const getImageUrl = (file: File) => window.URL.createObjectURL(file);
const openFileDialog = () => fileInput.value?.click();
const isMaxImages = computed(() => reviewImages.value.length >= 4);

const handleUpload = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files) {
        const files = Array.from(target.files);
        const remainingSlots = 4 - reviewImages.value.length; 
        if (remainingSlots <= 0) return;
        reviewImages.value.push(...files.slice(0, remainingSlots));
    }
    target.value = ''; 
};

const removeImage = (index: number) => reviewImages.value.splice(index, 1);

// --- LOGIC XÓA ---
const handleDelete = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa đánh giá này không?")) return;

    try {
        if (existingReview.value) {
            await reviewStore.deleteReviewStore(
                existingReview.value.review_id_sql, 
                existingReview.value._id
            );
            textToast.value = "Đã xóa đánh giá!";
            showNotification.value = true;
            setTimeout(() => { emit("refresh"); handleClose(); }, 1000);
        }
    } catch (error: any) {
        textToast.value = "Lỗi xóa: " + (error.response?.data?.message || "Thất bại");
        showNotification.value = true;
    }
};

// --- LOGIC SUBMIT ---
const handleSubmit = async () => {
    const id = getItemId();
    textToast.value = "";
    
    if (!id) {
        textToast.value = "Lỗi: Không tìm thấy ID sản phẩm";
        showNotification.value = true; 
        return;
    }
    if (!comment.value || !comment.value.trim()) {
        textToast.value = "Bạn ơi, nhập nội dung đánh giá nhé!";
        showNotification.value = true; 
        setTimeout(() => showNotification.value = false, 3000);
        return;
    }
    
    try {
        // Store tự handle FormData
        await reviewStore.createReviewStore({
            order_item_id: id, 
            rating: rating.value,
            comment: comment.value,
            files: reviewImages.value 
        });

        textToast.value = existingReview.value ? "Cập nhật thành công!" : "Đánh giá thành công!";
        showNotification.value = true;

        setTimeout(() => {
            emit("refresh"); 
            handleClose();
        }, 1500);

    } catch (error: any) {
        const message = error.response?.data?.message || error.message || "Có lỗi xảy ra";
        textToast.value = "Lỗi: " + message;
        showNotification.value = true;
    }
};
</script>

<template>
  <div v-if="reviewStore.loading" class="loading-overlay">
      <Loading :loading="true" />
  </div>
  
  <Notification :text="textToast" :isSuccess="showNotification" />

  <div class="review-overlay" @click.self="handleClose">
    <div class="review-modal scale-in-center">
      
      <div class="modal-header">
        <h3>{{ existingReview ? (isReadonly ? 'Đánh Giá Của Bạn' : 'Chỉnh Sửa Đánh Giá') : 'Đánh Giá Sản Phẩm' }}</h3>
        <button class="close-icon" @click="handleClose">
            <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body custom-scrollbar">
        <div class="product-info-card">
            <div class="img-wrapper">
                <img :src="props.orderItem.image" alt="Product" />
            </div>
            <div class="info-content">
                <span class="prod-name">{{ props.orderItem.product_name }}</span>
                <span class="prod-variant" v-if="props.orderItem.color || props.orderItem.size">
                    Phân loại: {{ props.orderItem.color }} {{ props.orderItem.size ? `, ${props.orderItem.size}` : '' }}
                </span>
            </div>
        </div>

        <div class="rating-section">
            <span class="label">Chất lượng sản phẩm</span>
            <div class="star-group">
                <i 
                    v-for="i in 5" :key="i" 
                    class="fa-solid fa-star star-icon"
                    :class="{ 
                        'filled': i <= rating, 
                        'outlined': i > rating,
                        'readonly': isReadonly
                    }"
                    @click="selectRating(i)"
                ></i>
            </div>
            <span class="rating-text" :style="{ color: ratingTextColor(rating) }">
                {{ ratingText(rating) }}
            </span>
        </div>

        <div class="comment-section">
            <div v-if="isReadonly" class="review-text-readonly">
                {{ existingReview?.comment }}
            </div>
            
            <textarea 
                v-else
                v-model="comment" 
                placeholder="Hãy chia sẻ nhận xét chi tiết cho sản phẩm này bạn nhé!"
                class="review-textarea"
            ></textarea>

            <div v-if="existingReview?.images?.length" class="image-area">
                <p class="img-label">Ảnh đã đăng:</p>
                <div class="preview-list">
                    <div v-for="(img, index) in existingReview.images" :key="index" class="preview-item">
                        <img :src="img.secure_url || img.url || img" />
                    </div>
                </div>
            </div>

            <div v-if="!isReadonly" class="image-area">
                <div class="upload-controls">
                    <button 
                        class="btn-upload"
                        @click="openFileDialog" 
                        :disabled="isMaxImages"
                        :class="{ 'disabled': isMaxImages }"
                    >
                        <i class="fa-solid fa-camera"></i>
                        <span>Thêm ảnh</span>
                        <span class="count">({{ reviewImages.length }}/4)</span>
                    </button>

                    <div class="preview-list">
                        <div v-for="(img, index) in reviewImages" :key="index" class="preview-item new-img">
                            <img :src="getImageUrl(img)" />
                            <button class="remove-btn" @click="removeImage(index)">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <input type="file" multiple accept="image/*" ref="fileInput" class="hidden" @change="handleUpload"/>
            </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="footer-left">
            <button v-if="existingReview" class="btn-delete" @click="handleDelete">
                <i class="fa-regular fa-trash-can"></i> Xóa đánh giá
            </button>
        </div>

        <div class="footer-right">
            <template v-if="isReadonly">
                <button class="btn btn-secondary" @click="handleClose">Đóng</button>
                <button class="btn btn-primary" @click="startEdit">Chỉnh sửa</button>
            </template>

            <template v-else>
                <button class="btn btn-secondary" @click="cancelEdit">
                    {{ existingReview ? 'Hủy bỏ' : 'Trở lại' }}
                </button>
                <button class="btn btn-primary" @click="handleSubmit">
                    {{ existingReview ? 'Lưu thay đổi' : 'Hoàn thành' }}
                </button>
            </template>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* --- ANIMATION --- */
.scale-in-center { animation: scale-in 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
@keyframes scale-in { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

/* --- LAYOUT --- */
.hidden { display: none; }
.review-overlay {
    position: fixed; inset: 0; z-index: 2000;
    background-color: rgba(0, 0, 0, 0.6); backdrop-filter: blur(2px);
    display: flex; justify-content: center; align-items: center;
}

.review-modal {
    background: #fff; width: 95%; max-width: 600px; max-height: 90vh;
    border-radius: 4px; /* Bo góc ít cho style vuông vức */
    display: flex; flex-direction: column;
    box-shadow: 0 15px 40px rgba(0,0,0,0.2);
    overflow: hidden;
}

/* --- HEADER --- */
.modal-header {
    padding: 16px 24px; border-bottom: 1px solid #eee;
    display: flex; justify-content: space-between; align-items: center;
}
.modal-header h3 { font-size: 18px; font-weight: 700; color: #000; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
.close-icon {
    background: transparent; border: none; font-size: 20px; color: #999; cursor: pointer; transition: color 0.2s;
}
.close-icon:hover { color: #000; }

/* --- BODY --- */
.modal-body { padding: 24px; overflow-y: auto; }

/* Product Card */
.product-info-card {
    display: flex; gap: 16px; padding: 12px;
    background: #f9f9f9; border: 1px solid #eee; border-radius: 4px;
    margin-bottom: 24px;
}
.img-wrapper { width: 56px; height: 56px; border: 1px solid #e5e7eb; overflow: hidden; }
.img-wrapper img { width: 100%; height: 100%; object-fit: cover; }
.info-content { display: flex; flex-direction: column; justify-content: center; }
.prod-name { font-weight: 600; font-size: 14px; color: #000; margin-bottom: 4px; }
.prod-variant { font-size: 12px; color: #666; }

/* Rating */
.rating-section {
    display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 24px;
}
.label { font-size: 13px; font-weight: 600; color: #333; }
.star-group { display: flex; gap: 8px; }
.star-icon { font-size: 32px; color: #e5e7eb; cursor: pointer; transition: transform 0.2s, color 0.2s; }
.star-icon.filled { color: #facc15; } /* Vàng */
.star-icon:not(.readonly):hover { transform: scale(1.15); }
.rating-text { font-size: 14px; font-weight: 600; height: 20px; }

/* Comment Box */
.comment-section { display: flex; flex-direction: column; gap: 12px; }
.review-textarea {
    width: 100%; height: 120px; padding: 12px;
    border: 1px solid #ddd; border-radius: 4px;
    font-size: 14px; outline: none; resize: none; font-family: inherit;
    transition: border-color 0.2s;
}
.review-textarea:focus { border-color: #000; }
.review-text-readonly {
    background: #f9f9f9; padding: 16px; border-radius: 4px;
    color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap;
    border: 1px dashed #ccc;
}

/* Upload Area */
.image-area { margin-top: 8px; }
.img-label { font-size: 12px; font-weight: 600; color: #666; margin-bottom: 8px; }
.upload-controls { display: flex; flex-wrap: wrap; gap: 10px; }

.btn-upload {
    width: 80px; height: 80px; border: 1px dashed #000;
    background: #fff; border-radius: 4px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: #000; cursor: pointer; transition: background 0.2s;
}
.btn-upload:hover { background: #f5f5f5; }
.btn-upload.disabled { opacity: 0.5; cursor: not-allowed; border-color: #ccc; color: #ccc; }
.btn-upload i { font-size: 20px; margin-bottom: 4px; }
.btn-upload span { font-size: 9px; font-weight: 600; }
.btn-upload .count { font-size: 9px; margin-top: 2px; }

.preview-list { display: flex; gap: 10px; flex-wrap: wrap; }
.preview-item {
    width: 80px; height: 80px; position: relative;
    border: 1px solid #eee; overflow: hidden;
}
.preview-item img { width: 100%; height: 100%; object-fit: cover; }
.remove-btn {
    position: absolute; top: 2px; right: 2px; width: 18px; height: 18px;
    background: rgba(0,0,0,0.6); color: white; border-radius: 50%;
    display: flex; justify-content: center; align-items: center;
    border: none; cursor: pointer; font-size: 10px; transition: background 0.2s;
}
.remove-btn:hover { background: #ee4d2d; }

/* --- FOOTER --- */
.modal-footer {
    padding: 16px 24px; border-top: 1px solid #eee; background: #fff;
    display: flex; justify-content: space-between; align-items: center;
}
.footer-right { display: flex; gap: 12px; margin-left: auto; }

/* Buttons */
.btn {
    padding: 10px 24px; border-radius: 2px; font-size: 13px; font-weight: 600; text-transform: uppercase;
    cursor: pointer; border: 1px solid transparent; transition: all 0.2s; letter-spacing: 0.5px;
}
/* Nút Trắng (Secondary) */
.btn-secondary { background: #fff; border-color: #ddd; color: #333; }
.btn-secondary:hover { border-color: #000; color: #000; }

/* Nút Đen (Primary) */
.btn-primary { background: #000; color: #fff; border-color: #000; }
.btn-primary:hover { background: #333; border-color: #333; }

/* Nút Xóa (Style text đỏ nhẹ nhàng) */
.btn-delete {
    background: transparent; border: none; color: #ef4444;
    font-size: 13px; font-weight: 500; cursor: pointer;
    display: flex; align-items: center; gap: 6px; padding: 8px 0;
    transition: color 0.2s;
}
.btn-delete:hover { color: #dc2626; text-decoration: underline; }

/* Custom Scroll */
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #ddd; border-radius: 10px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #ccc; }

.loading-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.7); z-index: 2001; display: flex; justify-content: center; align-items: center; }
</style> 