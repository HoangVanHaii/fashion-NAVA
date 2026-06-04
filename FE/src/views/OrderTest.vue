<script setup lang="ts">
import { ref } from 'vue';
import ReviewModal from '../components/ReviewModal.vue'; 
import type { OrderItem } from '../interfaces/order'; // Import interface chuẩn

// 1. Tạo biến để bật/tắt Modal
const showModal = ref(false);

// 2. Tạo DỮ LIỆU GIẢ (Mock Data) chuẩn Interface
// Lưu ý: ID phải là dạng UUID String để không bị lỗi Backend validation
const dummyOrderItem = ref<OrderItem>({
    id: 1, // Phải là UUID chuẩn (String)
    order_id:1,
    product_name: "Áo Thun Hải Đăng",
    color: "Trắng",
    size: "XL",
    // Sửa image_url -> image (khớp interface)
    image: "https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lzsl3ck5678252", 
    
    // Các trường bắt buộc khác của Interface (dù không hiển thị cũng phải có để không lỗi Type)
    quantity: 1,
    price: 350000,
    size_id_mongo: "mongo_size_id_1",
    product_id_sql:1
});

// Hàm mở modal
const openReview = () => {
    showModal.value = true;
};

// Hàm khi đóng modal
const handleClose = () => {
    showModal.value = false;
    console.log("Đã đóng Modal");
};

// Hàm reload (được gọi khi emit 'refresh')
const handleRefresh = () => {
    console.log("Submit thành công -> Reload lại list");
    // Code gọi lại API lấy danh sách đơn hàng ở đây
};
</script>

<template>
    <div class="h-screen flex flex-col justify-center items-center bg-gray-100 gap-4">
        <h1 class="text-2xl font-bold">Trang Test Component Review</h1>
        
        <div class="p-4 bg-white rounded shadow text-left">
           <p><strong>Sản phẩm:</strong> {{ dummyOrderItem.product_name }}</p>
           <p><strong>ID (UUID):</strong> {{ dummyOrderItem.id }}</p>
        </div>

        <button 
            @click="openReview"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
            Mở Modal Đánh Giá (Test)
        </button>

        <ReviewModal 
            v-if="showModal"
            :orderItem="dummyOrderItem"
            @close="handleClose"
            @refresh="handleRefresh"
        />
    </div>
</template>