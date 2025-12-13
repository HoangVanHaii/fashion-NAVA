<script setup lang="ts">
import { ref, computed } from "vue";
import Navbar from "../../components/admin/Navbar.vue";
import FlashSaleFormModal from "../../components/admin/FlashSaleForm.vue";
import AddProductsToSaleModal from "../../components/admin/FlashSaleItem.vue";

// --- INTERFACE ---
interface FlashSale {
  ID: string;
  title: string;
  start_date: string;
  end_date: string;
  status: "active" | "pending" | "ended" | "cancelled";
  product_count: number;
}

// --- DỮ LIỆU GIẢ LẬP ---
const allSales = ref<FlashSale[]>([
  {
    ID: "58c5c742",
    title: "Siêu Sale Tết Nguyên Đán",
    start_date: "2026-02-10 09:00:00",
    end_date: "2026-02-12 23:59:59",
    status: "pending",
    product_count: 0,
  },
  {
    ID: "b3f4d1e0",
    title: "Flash Sale Cuối Tuần",
    start_date: "2025-11-28 12:00:00",
    end_date: "2025-11-30 14:00:00",
    status: "active",
    product_count: 5,
  },
  {
    ID: "a7b8c9d0",
    title: "Black Friday",
    start_date: "2024-11-29 00:00:00",
    end_date: "2024-11-30 23:59:59",
    status: "ended",
    product_count: 12,
  },
  {
    ID: "d1e2f3g4",
    title: "Sale Noel",
    start_date: "2025-12-24 18:00:00",
    end_date: "2025-12-25 23:59:59",
    status: "pending",
    product_count: 3,
  },
  {
    ID: "e6f7g8h9",
    title: "Sale Đã Hủy",
    start_date: "2025-01-01 00:00:00",
    end_date: "2025-01-02 23:59:59",
    status: "cancelled",
    product_count: 7,
  },
  {
    ID: "58c5c742-2",
    title: "Sale Tháng 1",
    start_date: "2026-01-01 09:00:00",
    end_date: "2026-01-05 23:59:59",
    status: "pending",
    product_count: 8,
  },
  {
    ID: "b3f4d1e0-2",
    title: "Sale Ngày Phụ Nữ",
    start_date: "2026-03-08 12:00:00",
    end_date: "2026-03-10 14:00:00",
    status: "active",
    product_count: 15,
  },
  {
    ID: "a7b8c9d0-2",
    title: "Sale Cuối Quý 1",
    start_date: "2025-03-30 00:00:00",
    end_date: "2025-04-01 23:59:59",
    status: "ended",
    product_count: 22,
  },
  {
    ID: "d1e2f3g4-2",
    title: "Sale Lễ Tình Nhân",
    start_date: "2026-02-14 18:00:00",
    end_date: "2026-02-15 23:59:59",
    status: "pending",
    product_count: 6,
  },
  {
    ID: "e6f7g8h9-2",
    title: "Sale 12.12",
    start_date: "2025-12-12 00:00:00",
    end_date: "2025-12-13 23:59:59",
    status: "cancelled",
    product_count: 10,
  },
  {
    ID: "f9g0h1i2",
    title: "Sale Mùa Hè",
    start_date: "2026-06-01 09:00:00",
    end_date: "2026-06-10 23:59:59",
    status: "pending",
    product_count: 4,
  },
  {
    ID: "g0h1i2j3",
    title: "Sale Du Lịch",
    start_date: "2026-07-01 12:00:00",
    end_date: "2026-07-07 14:00:00",
    status: "active",
    product_count: 9,
  },
]);

// --- TÌM KIẾM & LỌC ---
const filterStatus = ref("all");

const filteredSales = computed(() => {
  let tempSales = allSales.value;
  if (filterStatus.value !== "all") {
    tempSales = tempSales.filter((sale) => sale.status === filterStatus.value);
  }
  return tempSales;
});

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700 ring-1 ring-green-600/20";
    case "pending":
      return "bg-blue-100 text-blue-700 ring-1 ring-blue-600/20";
    case "ended":
      return "bg-gray-100 text-gray-700 ring-1 ring-gray-600/20";
    case "cancelled":
      return "bg-red-100 text-red-700 ring-1 ring-red-600/20";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

// --- CHỨC NĂNG FORM/MODAL ---
const isFormModalOpen = ref(false);
const isEditingSale = ref(false);
const saleToEdit = ref<FlashSale | null>(null);

const openCreateModal = () => {
  isEditingSale.value = false;
  saleToEdit.value = null;
  isFormModalOpen.value = true;
};

const openEditModal = (sale: FlashSale) => {
  if (sale.status !== "pending") {
    alert(
      "Chỉ có thể chỉnh sửa đợt Flash Sale đang ở trạng thái chờ (Pending)."
    );
    return;
  }
  isEditingSale.value = true;
  saleToEdit.value = sale;
  isFormModalOpen.value = true;
};

const handleSaveSale = (payload: FlashSale) => {
  if (isEditingSale.value) {
    const index = allSales.value.findIndex((s) => s.ID === payload.ID);
    if (index !== -1) allSales.value[index] = payload;
  } else {
    payload.ID = `FS-${Date.now()}`;
    payload.product_count = 0;
    allSales.value.unshift(payload);
  }
  isFormModalOpen.value = false;
};

// --- CHỨC NĂNG TẮT FLASH SALE (MỚI) ---
const handleStopSale = (sale: FlashSale) => {
  if (
    confirm(
      `⚠️ Xác nhận: Bạn muốn kết thúc sớm sự kiện "${sale.title}" ngay bây giờ?`
    )
  ) {
    sale.status = "ended";
    // Logic gọi API backend đặt ở đây
  }
};

// --- CHỨC NĂNG THÊM/XEM SẢN PHẨM ---
const isAddProductsModalOpen = ref(false);
const selectedSaleForProducts = ref<FlashSale | null>(null);
const isAddProductsViewMode = ref(false);

const openAddProductsModal = (sale: FlashSale) => {
  if (sale.status !== "pending") {
    alert(
      "Chỉ có thể thêm hoặc chỉnh sửa sản phẩm cho đợt Flash Sale đang chờ (Pending)."
    );
    return;
  }
  selectedSaleForProducts.value = sale;
  isAddProductsViewMode.value = false;
  isAddProductsModalOpen.value = true;
};

const openViewProductsModal = (sale: FlashSale) => {
  selectedSaleForProducts.value = sale;
  isAddProductsViewMode.value = true;
  isAddProductsModalOpen.value = true;
};

const handleProductsAdded = (count: number) => {
  if (selectedSaleForProducts.value) {
    selectedSaleForProducts.value.product_count = count;
  }
  isAddProductsModalOpen.value = false;
  selectedSaleForProducts.value = null;
  isAddProductsViewMode.value = false;
};
</script>

<template>
  <div class="flex h-screen bg-[#F3F4F6] font-sans">
    <Navbar />

    <div class="flex-1 flex flex-col h-screen overflow-hidden">
      <main class="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
        <div class="mb-8 flex justify-between items-end">
          <div>
            <h2 class="text-3xl font-bold text-gray-900">
              ⚡ Quản lý Flash Sale
            </h2>
            <p class="text-gray-500 mt-1">
              Tạo và quản lý các sự kiện bán hàng theo thời gian giới hạn.
            </p>
          </div>
          <div class="flex gap-2">
            <button
              @click="openCreateModal"
              class="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center gap-2"
              title="Thêm Flash Sale mới"
            >
              <i class="fa-solid fa-bolt-lightning"></i> Tạo Flash Sale Mới
            </button>
          </div>
        </div>

        <div
          class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-180px)]"
        >
          <div
            class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"
          >
            <h3 class="font-bold text-gray-800">
              Danh sách Sự kiện ({{ filteredSales.length }})
            </h3>
            <div class="flex gap-4">
              <select
                v-model="filterStatus"
                class="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none cursor-pointer"
              >
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
              <thead
                class="bg-gray-50 sticky top-0 z-10 shadow-sm text-xs uppercase text-gray-500 font-semibold tracking-wider"
              >
                <tr>
                  <th class="px-6 py-4">Tên sự kiện</th>
                  <th class="px-6 py-4">Bắt đầu</th>
                  <th class="px-6 py-4">Kết thúc</th>
                  <th class="px-6 py-4 text-center">Trạng thái</th>
                  <th class="px-6 py-4 text-center">Sản phẩm</th>
                  <th class="px-6 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  v-for="sale in filteredSales"
                  :key="sale.ID"
                  class="hover:bg-blue-50/30 transition-colors group"
                >
                  <td class="px-6 py-4 text-sm font-semibold text-gray-900">
                    {{ sale.title }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600">
                    {{ sale.start_date }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600">
                    {{ sale.end_date }}
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span
                      class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                      :class="getStatusColor(sale.status)"
                    >
                      {{
                        sale.status === "active"
                          ? "Đang diễn ra"
                          : sale.status === "pending"
                          ? "Sắp diễn ra"
                          : sale.status === "ended"
                          ? "Đã kết thúc"
                          : "Đã hủy"
                      }}
                    </span>
                  </td>
                  <td
                    class="px-6 py-4 text-center text-sm font-medium text-gray-700"
                  >
                    {{ sale.product_count }} SP
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center justify-center gap-2">
                      <template v-if="sale.status === 'pending'">
                        <button
                          @click="openAddProductsModal(sale)"
                          class="w-9 h-9 flex items-center justify-center rounded-full text-blue-600 bg-blue-50 hover:bg-blue-200 hover:text-blue transition-all shadow-sm"
                          title="Thêm sản phẩm"
                        >
                          <i class="fa-solid fa-plus"></i>
                        </button>
                        <button
                          @click="openEditModal(sale)"
                          class="w-9 h-9 flex items-center justify-center rounded-full text-orange-500 bg-orange-50 hover:bg-orange-200 hover:text-orange-600 transition-all shadow-sm"
                          title="Chỉnh sửa thông tin"
                        >
                          <i class="fa-solid fa-pen text-sm"></i>
                        </button>
                      </template>

                      <template v-else-if="sale.status === 'active'">
                        <button
                          @click="openViewProductsModal(sale)"
                          class="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 bg-gray-50 hover:bg-gray-300 hover:text-black transition-all shadow-sm"
                          title="Xem chi tiết"
                        >
                          <i class="fa-solid fa-eye"></i>
                        </button>
                        <button
                          @click="handleStopSale(sale)"
                          class="w-9 h-9 flex items-center justify-center rounded-full text-red-600 bg-red-50 hover:bg-red-200 hover:text-red transition-all shadow-sm"
                          title="Kết thúc ngay"
                        >
                          <i class="fa-solid fa-power-off"></i>
                        </button>
                      </template>

                      <template v-else>
                        <button
                          @click="openViewProductsModal(sale)"
                          class="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 bg-gray-50 hover:bg-gray-300 hover:text-black transition-all shadow-sm"
                          title="Xem chi tiết"
                        >
                          <i class="fa-solid fa-eye"></i>
                        </button>
                        <div class="w-9 h-9"></div>
                      </template>
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredSales.length === 0">
                  <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center text-gray-400">
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

  <AddProductsToSaleModal
    :model-value="isAddProductsModalOpen"
    @update:model-value="isAddProductsModalOpen = $event"
    :sale="selectedSaleForProducts"
    :is-view-mode="isAddProductsViewMode"
    @products-updated="handleProductsAdded"
  />
</template>

<style scoped>
/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.custom-scrollbar-thin::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
.custom-scrollbar-thin::-webkit-scrollbar-track {
  background: #f1f5f9;
}
.custom-scrollbar-thin::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
