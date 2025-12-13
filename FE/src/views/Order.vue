<script setup lang="ts">
import Header from "../components/Header.vue";
import SideBarProfile from "@/components/SideBarProfile.vue";
import Loading from "../components/Loading.vue";
import Footer from "@/components/Footer.vue";
import Notification from "@/components/Notification.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import OrderDetail from "./OrderDetail.vue";
import { ref, onMounted, onUnmounted, computed } from "vue";
import { formatPrice } from "../utils/format";
import { useRouter } from "vue-router";
import { useOrderEmployeeStore } from "@/stores/order";
import { useAuthStore } from "@/stores/auth";
import type { GetOrder } from "../interfaces/order";

const showOrderDetail = ref<boolean>(false);
const selectedOrder = ref<string | null>(null)
const showFormConfirm = ref(false);
const router = useRouter();
const order = useOrderEmployeeStore();
const auth = useAuthStore();
const listShopName = ref<string[]>([]);
const textToast = ref<string>("");
const showNotification = ref<boolean>(false);
const orderCancel_id = ref<string>('');
const showNavbar = ref<boolean>(true);

// Trạng thái hiển thị thanh tìm kiếm
const showSearch = ref(true);
const lastScrollPosition = ref(0);

// Order Status Tabs
// const orderStatuses = [
//   { label: 'Tất cả', value: 'Tất cả' },
//   { label: 'Chờ xác nhận', value: 'pending' },
//   { label: 'Chờ lấy hàng', value: 'confirmed' },
//   { label: 'Đang giao', value: 'shipped' },
//   { label: 'Hoàn thành', value: 'completed' },
//   { label: 'Đã hủy', value: 'cancelled' },
// ];

const activeTab = computed({
    get: () => order.selectedStatus,
    set: (val) => order.selectedStatus = val
});

// Xử lý cuộn trong main content
const mainContentRef = ref<HTMLElement | null>(null);

const handleScrollUI = () => {
  if (!mainContentRef.value) return;
  const currentScrollPosition = mainContentRef.value.scrollTop;
  
  if (currentScrollPosition < 0) return;

  // Chỉ kích hoạt khi cuộn một khoảng nhất định
  if (Math.abs(currentScrollPosition - lastScrollPosition.value) < 100) return;

  // Cuộn xuống -> Ẩn search, Cuộn lên -> Hiện search
  showSearch.value = currentScrollPosition < lastScrollPosition.value || currentScrollPosition < 100;
  
  lastScrollPosition.value = currentScrollPosition;
};

onMounted(async () => {
  handleResize();
  const orders = await order.getOrderOfMeStore();
//   if (orders) {
//     listShopName.value = []; 
//     for (let i = 0; i < orders.length; i++) {
//       const o = orders[i];
//       const productId = o.items[0]?.product_id;
//       const shopName = await auth.getShopNameStore(productId || 4);
//       listShopName.value.push(shopName);
//     }
//   }
  window.addEventListener("resize", handleResize);
  
  // Thêm scroll listener cho main content
  if (mainContentRef.value) {
    mainContentRef.value.addEventListener("scroll", handleScrollUI);
  }
});

onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
    if (mainContentRef.value) {
      mainContentRef.value.removeEventListener("scroll", handleScrollUI);
    }
});

const handleResize = () => {
  showNavbar.value = window.innerWidth > 1024;
};

const handleRefresh = () => {
  router.go(0);
};

const handleCancelled = async () => {
    showFormConfirm.value = false;
    if (orderCancel_id.value) {
        await order.changeStatusStore(orderCancel_id.value, 'cancelled');
        if (order.error) {
          textToast.value = "Không thể hủy đơn hàng";
          showNotification.value = true;
        } else {
          textToast.value = "Hủy đơn hàng thành công";
          showNotification.value = true;
          const orders = await order.getOrderOfMeStore();
             if (orders) {
                listShopName.value = []; 
                for (let i = 0; i < orders.length; i++) {
                const o = orders[i];
                const productId = o.items[0]?.product_id;
                const shopName = await auth.getShopNameStore(productId || 4);
                listShopName.value.push(shopName);
                }
            }
        }
    }
};

const handleReOrder = async (getOrder: GetOrder, shop_name: string) => {
  // Implementation
}

const showReviewForm = ref(false);
const handleReview = (item: GetOrder) => {
  // Implementation
};

const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        'pending': 'Chờ xác nhận',
        'confirmed': 'Chờ lấy hàng',
        'shipped': 'Đang giao hàng',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
    };
    return map[status] || status;
};

const viewDetail = (id: string) => {
    showOrderDetail.value = true;
    selectedOrder.value = id;
}

const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
        'pending': 'text-blue-600 bg-blue-50 border-blue-100',
        'confirmed': 'text-yellow-600 bg-yellow-50 border-yellow-100',
        'shipped': 'text-purple-600 bg-purple-50 border-purple-100',
        'completed': 'text-green-600 bg-green-50 border-green-100',
        'cancelled': 'text-red-600 bg-red-50 border-red-100'
    };
    return map[status] || 'text-gray-600 bg-gray-50 border-gray-100';
};
</script>

<template>
  <div class="flex flex-col h-screen bg-[#FAFAFA]">
    <Header class="flex-shrink-0" />
    
    <ConfirmDialog 
        v-if="showFormConfirm"
        :message="'Xác nhận hủy đơn hàng?'"
        @close="showFormConfirm = false"
        @confirm="handleCancelled"
    />
    <Notification :text="textToast" :isSuccess="showNotification" />
    <Loading :loading="order.loading" />

    <!-- Main Container - Flex Row với height cố định -->
    <div class="flex-1 flex overflow-hidden">
      <div class="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 flex gap-6 lg:gap-8">
        
        <!-- Sidebar - Fixed, không scroll -->
        <div class="hidden lg:block w-[280px] flex-shrink-0 pt-4">
          <div class="sticky top-4">
            <SideBarProfile
                v-model:show-menu="showNavbar"
                :show-detail="false"
                :show-address="false"
                :show-favourite="false"
                :show-notification="false"
                :show-order="true"
                :show-profile="false"
                :show-register-seller="false"
                :show-reset-password="false"
                :show-voucher="false"
            />
          </div>
        </div>

        <!-- Main Content - Scrollable -->
        <div 
          ref="mainContentRef"
          class="flex-1 overflow-y-auto custom-scrollbar mt-[15px]"
        >
          <div class="pb-8" >
            <!-- Sticky Filter Bar -->
            <div class="sticky top-0 z-20 bg-[#FAFAFA] pb-4">
              <div class="rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ">
                
                <!-- Status Tabs -->
                <div class="flex overflow-x-auto scrollbar-hide border-b border-gray-100 md:justify-center p-3 gap-2 bg-white">
                  <button 
                      v-for="status in ['Tất cả', 'Chờ xác nhận', 'Chờ lấy hàng', 'Đang giao hàng', 'Hoàn thành', 'Đã hủy']" 
                      :key="status"
                      @click="activeTab = status, order.selectedStatus = status" 
                      class="flex-shrink-0 px-4 py-2 text-xs sm:text-sm font-bold rounded-full transition-all duration-200 whitespace-nowrap focus:outline-none"
                      :class="activeTab === status 
                          ? 'bg-black text-white shadow-md' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black'"
                  >
                      {{ status }}
                  </button>
                </div>
                
                <!-- Search Input -->
                <div 
                    class="overflow-hidden transition-all duration-500 ease-in-out bg-white "
                    :class="showSearch ? 'max-h-20 opacity-100 py-4' : 'max-h-0 opacity-0 py-0'"
                >
                    <div class="px-4 relative">
                        <input 
                            v-model="order.searchText" 
                            type="text" 
                            placeholder="Tìm kiếm theo tên Shop, ID đơn hàng hoặc Tên sản phẩm..." 
                            class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-xs sm:placeholder:text-sm"
                        />
                        <i class="fa-solid fa-magnifying-glass absolute left-7 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    </div>
                </div>
              </div>
            </div>

            <!-- Orders List -->
            <div class="space-y-4 min-h-[500px]">
              <!-- Empty State -->
              <div v-if="!order.filteredOrder || order.filteredOrder.length === 0" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                  <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <img :src="'/uploads/reviews/none-order.jpg'" class="w-12 opacity-50" alt="" />
                  </div>
                  <p class="text-gray-500 text-sm mb-4">Chưa có đơn hàng nào.</p>
                  <button @click="handleRefresh" class="text-xs font-bold text-black hover:underline flex items-center justify-center gap-1 mx-auto">
                      <i class="fa-solid fa-rotate-right"></i> Tải lại trang
                  </button>
              </div>

              <!-- Order Cards -->
              <div 
                  v-for="(item, index) in order.filteredOrder" 
                  :key="index" 
                  class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300"
              >
                  <!-- Shop Header & Status -->
                  <div class="px-4 sm:px-6 py-3 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white">
                      <div class="flex items-center gap-2 sm:gap-3">
                          <div class="flex items-center gap-2 cursor-pointer hover:text-black transition-colors">
                              <i class="fa-solid fa-store text-gray-400 text-xs sm:text-sm"></i>
                              <span class="font-bold text-sm text-gray-900 line-clamp-1">Nava - {{ auth.user?.branch }}</span>
                              <i class="fa-solid fa-chevron-right text-[10px] text-gray-400"></i>
                          </div>
                      </div>
                      <div class="flex items-center gap-2 self-start sm:self-auto">
                           <span v-if="item.status === 'completed'" class="text-green-600 text-[10px] sm:text-xs font-medium flex items-center gap-1">
                              <i class="fa-solid fa-truck-fast"></i> <span class="hidden xs:inline">Giao thành công</span>
                          </span>
                          <span class="w-px h-3 bg-gray-200 hidden sm:block" v-if="item.status === 'completed'"></span>
                          <span 
                              class="px-2 sm:px-3 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold border uppercase tracking-wide whitespace-nowrap"
                              :class="getStatusColor(item.status || 'cancelled')"
                          >
                              {{ getStatusLabel(item.status || 'cancelled') }}
                          </span>
                      </div>
                  </div>

                  <!-- Products List -->
                  <div class="p-4 sm:p-6 cursor-pointer hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                      <div class="flex gap-3 sm:gap-4">
                          <div class="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                              <img :src="item.items[0]?.image" class="w-full h-full object-cover" />
                          </div>
                          <div class="flex-1 min-w-0 flex flex-col justify-between py-1">
                              <div>
                                  <h4 class="text-sm font-medium text-gray-900 line-clamp-2 mb-1 leading-snug">{{ item.items[0]?.product_name }}</h4>
                                  <div class="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                                      <span class="bg-gray-100 px-2 py-0.5 rounded">{{ item.items[0]?.color }}</span>
                                      <span class="bg-gray-100 px-2 py-0.5 rounded">{{ item.items[0]?.size }}</span>
                                      <span>x{{ item.items[0]?.quantity }}</span>
                                  </div>
                              </div>
                              
                              <div class="flex items-center justify-end gap-2">
                                   <span v-if="item.items[0]?.flash_sale_price" class="text-xs text-gray-400 line-through">{{ formatPrice(item.items[0]?.price) }}</span>
                                   <span class="text-sm sm:text-base font-bold text-red-600">{{ formatPrice(item.items[0]?.flash_sale_price || item.items[0]?.price!) }}</span>
                              </div>
                          </div>
                      </div>
                      <div v-if="item.items.length > 1" class="text-xs text-gray-400 text-center mt-3 border-t border-dashed border-gray-100 pt-2">
                          Xem thêm {{ item.items.length - 1 }} sản phẩm khác
                      </div>
                  </div>

                  <!-- Footer Actions -->
                  <div class="px-4 sm:px-6 py-4 bg-gray-50/30 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
                      <div class="flex justify-between sm:block w-full sm:w-auto">
                          <span class="text-xs text-gray-500 sm:hidden">Tổng tiền:</span>
                          <div class="text-right sm:text-left">
                              <span class="text-xs text-gray-500 hidden sm:inline">Thành tiền:</span>
                              <span class="text-base sm:text-lg font-black text-red-600 ml-2">{{ formatPrice(item.total) }}</span>
                          </div>
                      </div>

                      <div class="flex flex-wrap items-center gap-2 sm:gap-3 justify-end w-full sm:w-auto">
                          <button 
                              v-if="item.status == 'completed'" 
                              @click="handleReview(item)"
                              class="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-bold text-gray-700 hover:bg-white hover:border-black hover:text-black transition-all whitespace-nowrap"
                          >
                              Đánh giá
                          </button>

                          <button 
                              @click="viewDetail(item.id)"
                              class="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:bg-white hover:border-gray-400 hover:text-black transition-all whitespace-nowrap"
                              
                          >
                              Xem chi tiết
                          </button>

                          <button 
                              v-if="item.status === 'pending'" 
                              @click="showFormConfirm = true, orderCancel_id = item.id"
                              class="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-red-200 bg-red-50 text-red-600 rounded-lg text-xs sm:text-sm font-bold hover:bg-red-100 transition-all whitespace-nowrap"
                          >
                              Hủy đơn
                          </button>

                          <button 
                              v-if="item.status === 'completed' || item.status === 'cancelled'" 
                              @click="handleReOrder(item, listShopName[index] || 'Unknown')"
                              class="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-black text-white rounded-lg text-xs sm:text-sm font-bold hover:bg-gray-800 transition-all shadow-sm whitespace-nowrap"
                          >
                              Mua lại
                          </button>
                      </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <OrderDetail 
    v-if="showOrderDetail && selectedOrder" 
    :showOrderDetail="showOrderDetail"
    :orderId="selectedOrder"
    @close="showOrderDetail = false" 
    /> 
</div>
<Footer />
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

/* Custom Scrollbar cho Main Content */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
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
</style>