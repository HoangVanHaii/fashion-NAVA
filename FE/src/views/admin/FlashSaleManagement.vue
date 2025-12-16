<script setup lang="ts">
    import { ref, computed, onMounted } from "vue";
    import Navbar from "../../components/admin/Navbar.vue";
    import FlashSaleFormModal from "../../components/admin/FlashSaleForm.vue";
    import FlashSaleItemModal from "../../components/admin/FlashSaleItem.vue"; 
    import type { FlashSale } from "@/interfaces/flashSale";
    import { flashSaleStore } from "@/stores/flashSale";
import Loading from "@/components/Loading.vue";
import Notification from "@/components/Notification.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
const isShow = ref(false);
const message = ref('')
    // --- STORE CONFIG ---
    const useFlashSale = flashSaleStore();
const flashSales = ref<FlashSale[]>([]);
const toastText = ref('');
const isNotifi = ref(false);
const loadingPage = ref(false);
    
    // --- FETCH DATA ---
onMounted(async () => {
    loadingPage.value = true;
      const data = await useFlashSale.getFlashSaleActiveStore();
      if (data) {
        flashSales.value = data;
    }
    loadingPage.value = false;
    });
    
    // --- FORMAT DATE ---
    const formatDate = (date: Date | string) => {
      if (!date) return "";
      const d = new Date(date);
      return d.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    };
    
    // --- FILTER ---
    const filterStatus = ref("all");
    
    const filteredSales = computed(() => {
      let tempSales = flashSales.value;
      if (filterStatus.value !== "all") {
        tempSales = tempSales.filter((sale) => sale.status === filterStatus.value);
      }
      return tempSales;
    });
    
    const getStatusColor = (status: string | undefined) => {
      switch (status) {
        case "active": return "bg-green-100 text-green-700 ring-1 ring-green-600/20";
        case "pending": return "bg-blue-100 text-blue-700 ring-1 ring-blue-600/20";
        case "ended": return "bg-gray-100 text-gray-700 ring-1 ring-gray-600/20";
        case "cancelled": return "bg-red-100 text-red-700 ring-1 ring-red-600/20";
        default: return "bg-gray-100 text-gray-700";
      }
    };
    
    // --- MODAL: INFO FLASH SALE ---
    const isFormModalOpen = ref(false);
    const isEditingSale = ref(false);
    const saleToEdit = ref<FlashSale | null>(null);
    
    const openCreateModal = () => {
      isEditingSale.value = false;
      saleToEdit.value = null;
      isFormModalOpen.value = true;
    };
    
const handleSaveSale = async (payload: FlashSale) => {
    try {
        loadingPage.value = true;
    await useFlashSale.createFlashSaleStore(
      payload.title,
      payload.start_date,
      payload.end_date
        );
        const data = await useFlashSale.getFlashSaleActiveStore();
        if (data) flashSales.value = data;
        isFormModalOpen.value = false;
        loadingPage.value = false;
        isNotifi.value = true;
        toastText.value = 'Thêm Flash Sale Thành Công!'

    } catch (error) {
        isNotifi.value = false;
        toastText.value = 'Thêm Flash Sale thất bại!'
        loadingPage.value = false;
    }



      
    
    };
    
    // --- MODAL: QUẢN LÝ SẢN PHẨM ---
    const isItemModalOpen = ref(false);
    const selectedSaleForItem = ref<FlashSale | null>(null);
    const isItemViewMode = ref(false);
    
    // HÀM MỞ MODAL DUY NHẤT CHO TẤT CẢ TRẠNG THÁI
    const openManageProducts = (sale: FlashSale) => {
        selectedSaleForItem.value = sale;
        
        // isItemViewMode = false nghĩa là cho phép chỉnh sửa (hiện input, checkbox)
        // Nếu bạn muốn trạng thái 'ended' chỉ được xem thì thêm logic if ở đây
        // Nhưng yêu cầu là "trạng thái nào cũng cho edit hết" nên để false toàn bộ
        isItemViewMode.value = false; 
        
        isItemModalOpen.value = true;
    };
    
    const handleItemsAdded = () => {
        // Logic reload nếu cần
        console.log("Đã cập nhật sản phẩm");
    };
    const id = ref("")
// --- TOGGLE STATUS ---
    
const handleToggleStatus = async (sale: FlashSale) => {
    id.value = sale.id || "";
      const isRunning = sale.status === 'active';
      const actionText = isRunning ? "Tắt (Kết thúc)" : "Bật (Kích hoạt)";
      const newStatus = isRunning ? 'ended' : 'active';

        message.value = `Bạn muốn ${actionText} sự kiện "${sale.title}" ngay bây giờ?`;
        isShow.value = true;
        
};
const handelChangeStatus = async () => {
    try {
        loadingPage.value = true;
        alert(id.value)
        await useFlashSale.changeStatusStore(id.value);
        isShow.value = false;
        loadingPage.value = false;
        isNotifi.value = true;
        toastText.value = 'Sửa trạng thái thành công!!'
    } catch (error) {
        
        loadingPage.value = false;
        isNotifi.value = false;
        toastText.value = 'Sửa trạng thái thất bại!!'
        isShow.value = false;
        
    }
}
    
    </script>
    
    <template>
      <FlashSaleItemModal
        :isOpen="isItemModalOpen"
        :flashSale="selectedSaleForItem"
        :viewMode="isItemViewMode"
        @close="isItemModalOpen = false"
        @added="handleItemsAdded"
      />
      <Notification 
        :isSuccess="isNotifi"
        :text="toastText"
      ></Notification>
      <ConfirmDialog v-if="isShow" 
        :message="message"
        @close="isShow = false"
        @confirm="handelChangeStatus"
      
      ></ConfirmDialog>
      <Loading :loading="loadingPage"></Loading>
    
      <div class="flex h-screen bg-[#F3F4F6] font-sans">
        <Navbar />
    
        <div class="flex-1 flex flex-col h-screen overflow-hidden">
          <main class="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
            <div class="mb-8 flex justify-between items-end">
              <div>
                <h2 class="text-3xl font-bold text-gray-900">⚡ Quản lý Flash Sale</h2>
                <p class="text-gray-500 mt-1">Tạo và quản lý các sự kiện bán hàng theo thời gian giới hạn.</p>
              </div>
              <div class="flex gap-2">
                <button
                  @click="openCreateModal"
                  class="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center gap-2"
                >
                  <i class="fa-solid fa-bolt-lightning"></i> Tạo Flash Sale Mới
                </button>
              </div>
            </div>
    
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-180px)]">
              <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 class="font-bold text-gray-800">Danh sách Sự kiện ({{ filteredSales.length }})</h3>
                <div class="flex gap-4">
                  <select v-model="filterStatus" class="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer">
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Đang diễn ra</option>
                    <option value="pending">Sắp diễn ra</option>
                    <option value="ended">Đã kết thúc</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>
    
              <div class="flex-1 overflow-auto custom-scrollbar-thin">
                <table class="w-full text-left border-collapse">
                  <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm text-xs uppercase text-gray-500 font-semibold tracking-wider">
                    <tr>
                      <th class="px-6 py-4">Tên sự kiện</th>
                      <th class="px-6 py-4">Bắt đầu</th>
                      <th class="px-6 py-4">Kết thúc</th>
                      <th class="px-6 py-4 text-center">Trạng thái</th>
                      <th class="px-6 py-4 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    <tr v-for="sale in filteredSales" :key="sale.id" class="hover:bg-blue-50/30 transition-colors group">
                      <td class="px-6 py-4 text-sm font-semibold text-gray-900">
                        {{ sale.title }}
                        <div class="text-xs text-gray-400 font-normal mt-0.5">Tạo bởi: {{ sale.created_by }}</div>
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-600">{{ formatDate(sale.start_date) }}</td>
                      <td class="px-6 py-4 text-sm text-gray-600">{{ formatDate(sale.end_date) }}</td>
                      <td class="px-6 py-4 text-center">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" :class="getStatusColor(sale.status)">
                          {{ sale.status === "active" ? "Đang diễn ra" : sale.status === "pending" ? "Sắp diễn ra" : sale.status === "ended" ? "Đã kết thúc" : "Đã hủy" }}
                        </span>
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center justify-center gap-2">
                          
                          <button
                            @click="openManageProducts(sale)"
                            class="w-9 h-9 flex items-center justify-center rounded-full text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 transition-all shadow-sm"
                            title="Quản lý sản phẩm"
                          >
                            <i class="fa-solid fa-pen-to-square"></i>
                          </button>
    
                          <button
                            @click="handleToggleStatus(sale)"
                            class="w-9 h-9 flex items-center justify-center rounded-full transition-all shadow-sm"
                            :class="sale.status === 'active' ? 'text-green-600 bg-green-50 hover:bg-green-200' : 'text-red-400 bg-gray-50 hover:bg-red-100 hover:text-red-600'"
                            :title="sale.status === 'active' ? 'Tắt sự kiện' : 'Bật sự kiện'"
                          >
                            <i class="fa-solid fa-power-off"></i>
                          </button>
    
                        </div>
                      </td>
                    </tr>
                    <tr v-if="filteredSales.length === 0">
                      <td colspan="5" class="px-6 py-12 text-center text-gray-400">
                        <div class="flex flex-col items-center">
                          <i class="fa-solid fa-box-open text-4xl mb-3"></i>
                          <p>Không tìm thấy sự kiện Flash Sale nào.</p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
    
      <FlashSaleFormModal
        :model-value="isFormModalOpen"
        @update:model-value="isFormModalOpen = $event"
        :is-edit="isEditingSale"
        :initial-sale="saleToEdit"
        @save="handleSaveSale"
      />
    </template>
    
    <style scoped>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    .custom-scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar-thin::-webkit-scrollbar-track { background: #f1f5f9; }
    .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    </style>