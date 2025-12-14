<script setup lang="ts">
    import SideBarEmployee from './SideBarEmployee.vue';
// import { computed, onMounted, ref } from 'vue';
// // import { flashSaleSellerStore } from '../../stores/sellers/flashSaleStore';
// import { formatDateTime, formatPrice } from '../../utils/format';
// import ConfirmDialog from '../../components/ConfirmDialog.vue';
// import Notification from '../../components/Notification.vue';
// // import { userStore } from '../../stores/sellers/userStore';
// // import type { ShopToDoSummary, ShopStatistic } from '../../interfaces/user';
// import Loading from '../../components/Loading.vue';
// import FlashSaleDetail from './FlashSaleDetail.vue';

// const shopToDoSummary = ref<ShopToDoSummary | null>(null);
// const shopStatistic = ref<ShopStatistic | null>(null);
// const shopSeller = userStore();
// const toastText = ref("");
// const showConfirmDialog = ref(false);
// const isNotification = ref<boolean>(false);
// const idChoose = ref<number | null>(null);
// const useFlashSale = flashSaleSellerStore();
// const loading = ref(false);
// const showTimeFilter = ref(false);
// const selectedTimeFilter = ref('Hôm nay');

// // Flash Sale Detail Modal State
// const showFlashSaleModal = ref(false);
// const selectedFlashSaleId = ref<number | null>(null);

// // Info Tooltip States
// const showInfoRevenue = ref(false);

// // Mock Data for Online/Offline split (Since interface might not have it yet)
// const ordersOnline = computed(() => Math.floor((shopStatistic.value?.totalOrder || 0) * 0.65)); // Giả lập 65%
// const ordersOffline = computed(() => Math.ceil((shopStatistic.value?.totalOrder || 0) * 0.35));  // Giả lập 35%
// // Mock Data for Completed Orders in Todo
// const completedOrders = computed(() => Math.floor((shopStatistic.value?.totalOrder || 0)));

// onMounted(async () => {
//     loading.value = true;
//     await useFlashSale.getFlashSaleSellerHome("active");
//     shopToDoSummary.value = await shopSeller.getShopTodoSummaryStore();
//     shopStatistic.value = await shopSeller.getShopStatisticStore();
//     loading.value = false;
// })

// const handleShowFormConfirm = (id: number) => {
//     idChoose.value = id;
//     toastText.value = "";
//     showConfirmDialog.value = true;
// }

// const handleCancelConfirm = () => {
//     showConfirmDialog.value = false;
// }

// const handleCancelFlashSale = async () => {
//     showConfirmDialog.value = false;
//     if (idChoose.value) {
//         loading.value = true;
//         await useFlashSale.cancelAllFlashSaleItemStore(idChoose.value)
//         useFlashSale.$patch((state) => {
//             const index = state.flashSaleHome.findIndex(item => item.id! === idChoose.value)
//             if (index !== -1) {
//                 state.flashSaleHome[index]!.shop_has_sale = false;
//             }
//         })
//         loading.value = false;
        
//         if (useFlashSale.isSuccess) {
//             isNotification.value = true;
//             toastText.value = 'Đã hủy tất cả sản phẩm trong Flash Sale';
//         } else {
//             isNotification.value = false;
//             toastText.value = 'Không thể hủy sản phẩm'
//         }
//     }
// }

// // Hàm mở Modal chi tiết Flash Sale
// const viewFlashSaleDetail = (id: number) => {
//     selectedFlashSaleId.value = id;
//     showFlashSaleModal.value = true;
// }

// const getStatusBadgeColor = (status: string) => {
//     switch(status) {
//         case 'active': return 'bg-green-100 text-green-700 border-green-200';
//         case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-200';
//         case 'expired': return 'bg-gray-100 text-gray-600 border-gray-200';
//         default: return 'bg-gray-50 text-gray-500 border-gray-200';
//     }
// }

// const getStatusLabel = (status: string) => {
//      switch(status) {
//         case 'active': return 'Đang diễn ra';
//         case 'upcoming': return 'Sắp diễn ra';
//         case 'expired': return 'Đã kết thúc';
//         default: return status;
//     }
// }

</script>

<template>
    <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900 flex h-screen overflow-hidden">
        <!-- <Loading :loading="loading" />
        
        <ConfirmDialog 
            v-if="showConfirmDialog"
            :message="'Bạn có chắc chắn hủy hết sản phẩm trong Flash Sale này?'"
            @close="handleCancelConfirm"
            @confirm="handleCancelFlashSale"
        />
        <FlashSaleDetail 
            :show="showFlashSaleModal" 
            :flashSaleId="selectedFlashSaleId"
            @close="showFlashSaleModal = false"
        />
        <Notification 
            :text="toastText"
            :isSuccess="isNotification" 
        /> -->

        <!-- Sidebar -->
        <SideBarEmployee />
        <!-- Main Content -->
      
    </div>
</template>

<style scoped>
/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
}

/* Page Scrollbar */
.custom-page-scroll::-webkit-scrollbar {
  width: 8px;
}
.custom-page-scroll::-webkit-scrollbar-track {
  background: #FAFAFA;
}
.custom-page-scroll::-webkit-scrollbar-thumb {
  background-color: #d4d4d4;
  border-radius: 10px;
}
</style>