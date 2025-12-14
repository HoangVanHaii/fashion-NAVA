<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useReviewStore } from "../stores/reviewStore";
import type { OrderItem } from '../interfaces/order'; 
// import Notification from "../components/Notification.vue";
// import { getImage } from "../utils/format"; 
import logoDefault from '../assets/logo.svg';
const props = defineProps<{
  orderItem: OrderItem
}>();

const emit = defineEmits(["close", "refresh"]); 

const reviewStore = useReviewStore();

const existingReview = ref<any>(null); 
const isReadonly = ref(false);
const textToast = ref("");
const showNotification = ref(false);
const comment = ref("");
const rating = ref(5); 
const reviewImages = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);

onMounted(async () => {
    if (!props.orderItem.id) {
        console.error("Order Item ID is missing");
        return;
    }
    const res = await reviewStore.getReviewsByOrderItemIdOfMeStore(props.orderItem.id);
    console.log('da goi of me')
    if (res && Array.isArray(res) && res.length > 0) {
        existingReview.value = res[0];
        isReadonly.value = true;
        
        rating.value = existingReview.value.rating || 5;
        comment.value = existingReview.value.comment || "";
    } else {
        isReadonly.value = false;
    }
});

const handleClose = () => {
  emit("close");
};

const ratingTextColor = (r: number) => r >= 4 ? '#f6a700' : '#333';
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

const selectRating = (r: number) => {
    if (!isReadonly.value) rating.value = r;
};

const getImageUrl = (file: File) => window.URL.createObjectURL(file);

const openFileDialog = () => {
    fileInput.value?.click();
};

const isMaxImages = computed(() => reviewImages.value.length >= 4);

const handleUpload = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files) {
        const files = Array.from(target.files);
        const remainingSlots = 4 - reviewImages.value.length; 
        if (remainingSlots <= 0) return;
        reviewImages.value.push(...files.slice(0, remainingSlots));
    }
    if (target.value) target.value = ''; 
};

const removeImage = (index: number) => {
    reviewImages.value.splice(index, 1);
};

const handleSubmit = async () => {
    console.log(">>> BƯỚC 1: Đã bấm nút Hoàn Thành"); 
    console.log(">>> Dữ liệu hiện tại:", {
        id: props.orderItem.id,
        comment: comment.value,
        rating: rating.value,
        images: reviewImages.value.length
    });

    textToast.value = "";
    
    if (!props.orderItem.id) {
        console.error(">>> LỖI: Không tìm thấy ID sản phẩm (props.orderItem.id bị thiếu)");
        textToast.value = "Lỗi: Không có ID sản phẩm";
        showNotification.value = true; // Hiện thông báo lên
        return;
    }
    if (!comment.value || !comment.value.trim()) {
        console.warn(">>> CẢNH BÁO: Chưa nhập nội dung comment");
        textToast.value = "Bạn ơi, nhập nội dung đánh giá nhé!";
        showNotification.value = true; // Bắt buộc hiện thông báo
        setTimeout(() => showNotification.value = false, 3000);
        return;
    }

    try {
        console.log(">>> BƯỚC 2: Đang gọi API gửi dữ liệu...");
        
        await reviewStore.createReviewStore({
            order_item_id: props.orderItem.id, 
            rating: rating.value,
            comment: comment.value,
            files: reviewImages.value 
        });

        console.log(">>> BƯỚC 3: API thành công!");
        textToast.value = "Đánh giá thành công!";
        showNotification.value = true;

        // Reset form
        comment.value = "";
        rating.value = 5;
        reviewImages.value = [];

        setTimeout(() => {
            emit("refresh"); 
            handleClose();
        }, 1500);

    } catch (error: any) {
        console.error(">>> BƯỚC 3 (LỖI): Gọi API thất bại", error);
        
        const message = error.response?.data?.message || error.message || "Có lỗi xảy ra";
        textToast.value = "Lỗi: " + message;
        showNotification.value = true;
    }
};
</script>

<template>
  <div v-if="reviewStore.loading" class="loading-overlay">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: #ee4d2d;"></i>
  </div>
  
  <Notification :text="textToast" :isSuccess="showNotification" />

  <div class="review-overlay">
    <div class="review-modal">
      <h3>{{ isReadonly ? 'Đánh Giá Của Bạn' : 'Đánh Giá Sản Phẩm' }}</h3>

      <div class="header">
        <!-- <img :src="getImage(props.orderItem.image)" alt="Product" /> -->
         <img :src="logoDefault" alt="Logo mặc định" />
        
        <div class="species">
          <span>{{ props.orderItem.product_name }}</span>
          <span v-if="props.orderItem.color || props.orderItem.size">
             Phân loại: {{ props.orderItem.color }} {{ props.orderItem.size ? `, ${props.orderItem.size}` : '' }}
          </span>
        </div>
      </div>

      <div class="quality">
        <span>Chất lượng sản phẩm</span>
        <div class="star">
          <i 
            v-for="i in 5" 
            :key="i" 
            class="fa-solid fa-star star-item"
            :class="{ 
              filled: i <= rating, 
              outlined: i > rating 
            }"
            @click="selectRating(i)"
          ></i>
          <span :style="{ color: ratingTextColor(rating) }">
            {{ ratingText(rating) }}
          </span>
        </div>
      </div>

      <div class="comment-section">
        <textarea 
          v-if="!isReadonly"
          v-model="comment" 
          placeholder="Hãy chia sẻ nhận xét cho sản phẩm này bạn nhé!">
        </textarea>
        
        <div v-else class="review-text">
          {{ existingReview?.comment }}
        </div>

        <div v-if="isReadonly && existingReview?.images && existingReview.images.length > 0" class="btn-upload">
          <div class="preview-images">
            <div v-for="(img, index) in existingReview.images" :key="index" class="preview-item">
              <!-- <img :src="getImage(img.secure_url || img.image_url)" /> -->
            </div>
          </div>
        </div>

        <div v-if="!isReadonly" class="btn-upload">
          <button 
            @click="openFileDialog" 
            :disabled="isMaxImages"
            :style="{ opacity: isMaxImages ? 0.5 : 1, cursor: isMaxImages ? 'not-allowed' : 'pointer' }"
          >
            <i class="fa-solid fa-camera"></i>
            <span>Thêm hình ảnh</span>
          </button>

          <div class="preview-images">
            <div v-for="(img, index) in reviewImages" :key="index" class="preview-item">
              <img :src="getImageUrl(img)" />
              <button class="remove-btn" @click="removeImage(index)">×</button>
            </div>
          </div>
        </div>

        <input 
          type="file" 
          multiple 
          accept="image/*" 
          ref="fileInput" 
          style="display:none" 
          @change="handleUpload"
        />
      </div>

      <div class="footer">
        <button @click="handleClose">{{ isReadonly ? 'Đóng' : 'Trở lại' }}</button>
        <button v-if="!isReadonly" @click="handleSubmit" class="submit-btn">Hoàn Thành</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex; justify-content: center; align-items: center; z-index: 2000;
}
.review-modal {
    background-color: white; padding: 24px; border-radius: 8px;
    max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
.review-modal h3 { font-size: 20px; font-weight: 600; color: #333; margin-bottom: 16px; }
.header { display: flex; gap: 12px; margin-bottom: 20px; }
.header img { width: 80px; height: 80px; border-radius: 4px; object-fit: cover; border: 1px solid #eee; }
.species { display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.species span:first-child { font-weight: 500; color: #333; }
.species span:last-child { font-size: 14px; color: gray; }
.quality { display: flex; align-items: center; gap: 20px; margin-bottom: 16px; }
.star { display: flex; align-items: center; gap: 8px; }
.star-item { font-size: 24px; cursor: pointer; transition: all 0.2s; color: #ddd; }
.star-item.filled { color: #f6a700; }
.star-item:hover { transform: scale(1.15); }
.comment-section { background-color: #f9f9f9; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
.comment-section textarea { width: 100%; height: 100px; border: 1px solid #ddd; border-radius: 6px; padding: 12px; outline: none; resize: none; font-family: inherit; box-sizing: border-box; }
.comment-section textarea:focus { border-color: #ee4d2d; background: white; }
.review-text { min-height: 60px; white-space: pre-wrap; color: #333; }
.btn-upload { display: flex; align-items: center; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
.btn-upload button { display: flex; align-items: center; gap: 8px; border: 1px solid #ee4d2d; color: #ee4d2d; background-color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
.btn-upload button:hover:not(:disabled) { background-color: #fef0f0; }
.preview-images { display: flex; gap: 8px; flex-wrap: wrap; }
.preview-item { position: relative; width: 60px; height: 60px; }
.preview-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
.preview-item .remove-btn { position: absolute; top: -5px; right: -5px; width: 16px; height: 16px; background: rgba(0,0,0,0.6); color: white; border-radius: 50%; border: none; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.footer { display: flex; justify-content: flex-end; gap: 12px; }
.footer button { padding: 8px 20px; border-radius: 4px; border: 1px solid #ddd; background: white; cursor: pointer; }
.footer button:hover { background: #f5f5f5; }
.footer button.submit-btn { background-color: #ee4d2d; color: white; border: none; }
.footer button.submit-btn:hover { background-color: #d73211; }
.loading-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.8); z-index: 2001; display: flex; justify-content: center; align-items: center; }
</style>