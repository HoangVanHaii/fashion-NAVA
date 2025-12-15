<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Navbar from "../../components/Employee/SideBarEmployee.vue";
// 1. IMPORT COMPONENT MODAL
import VoucherFormModal from "../../components/admin/VoucherForm.vue";
import type { Voucher } from "@/interfaces/voucher";
import { useVoucherStore } from "@/stores/voucherStore";
import { voucherStore } from "@/stores/voucher";
import { formatDateTime } from "@/utils/format";



const formatCurrency = (value: number | string): string => {
  if (typeof value === "string") {
    value = parseFloat(value);
  }
  if (isNaN(value)) return "0 ₫";
  return value.toLocaleString("vi-VN") + " ₫";
};

// Hàm tính màu cho trạng thái
const getStatusColor = (status: string) => {
  switch (status) {
    case "Hoạt động":
      return "bg-green-100 text-green-700";
    case "Sắp hết":
      return "bg-yellow-100 text-yellow-700";
    case "Hết hạn":
      return "bg-red-100 text-red-700";
    case "Sắp tới":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};
const voucher = voucherStore();
// Dữ liệu giả lập
const allVouchers = ref<Voucher[]>([]);
onMounted(async () => {
  allVouchers.value = await voucher.getAllVoucherStore();
  allVouchers.value.map(v => {
    applyVoucherStatus(v);
  })
})
// --- TÌM KIẾM & LỌC ---
const searchTerm = ref("");
const filterStatus = ref("all");

// Computed property để lọc danh sách voucher
const filteredVouchers = computed(() => {
  // ... (logic lọc giữ nguyên)
  let tempVouchers = allVouchers.value;
  const searchLower = searchTerm.value.toLowerCase().trim();

  if (searchLower) {
    tempVouchers = tempVouchers.filter(
      (voucher) =>
        voucher.code.toLowerCase().includes(searchLower) ||
        (voucher.description &&
          voucher.description.toLowerCase().includes(searchLower))
    );
  }

  if (filterStatus.value !== "all") {
    tempVouchers = tempVouchers.filter(
      (voucher) => voucher.status === filterStatus.value
    );
  }

  if (
    currentPage.value > 1 &&
    tempVouchers.length <= itemsPerPage * (currentPage.value - 1)
  ) {
    currentPage.value = 1;
  }

  return tempVouchers;
});

// --- PHÂN TRANG ---
const currentPage = ref(1);
const itemsPerPage = 5;

const totalPages = computed(() => {
  return Math.ceil(filteredVouchers.value.length / itemsPerPage);
});

const currentVouchers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredVouchers.value.slice(start, end);
});

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const pageNumbers = computed(() => {
  const pages = [];
  for (let i = 1; i <= totalPages.value; i++) {
    pages.push(i);
  }
  return pages;
});

// --- CHỨC NĂNG THÊM/SỬA (MỚI) ---
const isModalOpen = ref(false);
const isEditing = ref(false); // Chế độ sửa (true) hay thêm (false)
const voucherToEdit = ref<Voucher | null>(null); // Lưu trữ dữ liệu khi sửa

// 2. Mở modal ở chế độ THÊM MỚI
// const openCreateModal = () => {
//   isEditing.value = false;
//   voucherToEdit.value = null;
//   isModalOpen.value = true;
// };

// 3. Mở modal ở chế độ CHỈNH SỬA
// const openEditModal = (voucher: Voucher) => {
//   isEditing.value = true;
//   voucherToEdit.value = voucher;
//   isModalOpen.value = true;
// };

// 4. Xử lý lưu dữ liệu từ Modal
// const handleSaveVoucher = (payload: Voucher, isEditMode: boolean) => {
//   // Logic giả lập trạng thái
//   const checkStatus = (
//     start_date: string,
//     end_date: string
//   ): "active" | "pending" | "expired" => {
//     const now = new Date();
//     const start = new Date(start_date);
//     const end = new Date(end_date);

//     if (now >= start && now <= end) return "active";
//     if (now < start) return "pending";
//     return "expired";
//   };

//   const newStatus = checkStatus(payload.start_date, payload.end_date);
//   const statusTextMap = {
//     active: "Đang chạy",
//     pending: "Chờ kích hoạt",
//     expired: "Đã hết hạn",
//   };
  function applyVoucherStatus(voucher: Voucher): Voucher {
      const now = new Date();

      const startDate = new Date(voucher.start_date);
      const endDate = new Date(voucher.end_date);

      let currentStatus: 'Sắp tới' | 'Hoạt động' | 'Hết hạn' | 'Sắp hết';

      if (now > endDate) {
          currentStatus = 'Hết hạn';
      }
      else if (now < startDate) {
          currentStatus = 'Sắp tới';
      }
      else {
        currentStatus = 'Hoạt động';
        if (voucher.quantity - voucher.used <= 20) {
          currentStatus = 'Sắp hết'
        }
      }
      voucher.status = currentStatus;
      return voucher;
  }
  // const finalVoucher: Voucher = {
  //   ...payload,
  //   status: newStatus,
  //   // Đảm bảo kiểu số
  //   discount_value: Number(payload.discount_value),
  //   min_order_value: Number(payload.min_order_value),
  //   max_discount:
  //     payload.max_discount !== null ? Number(payload.max_discount) : 0,
  //   quantity: Number(payload.quantity),
  // };

  // if (isEditMode) {
  //   // CHẾ ĐỘ CẬP NHẬT
  //   const index = allVouchers.value.findIndex((v) => v.id === finalVoucher.id);
  //   if (index !== -1) {
  //     allVouchers.value[index] = finalVoucher;
  //     console.log("Cập nhật thành công:", finalVoucher);
  //   }
  // } else {
  //   // CHẾ ĐỘ THÊM MỚI
  //   // Giả lập ID mới (Sử dụng Date.now() để tạo ID giả lập)
  //   finalVoucher.id = `VC-${Date.now()}`;
  //   finalVoucher.used = 0; // Luôn là 0 khi thêm mới
  //   allVouchers.value.unshift(finalVoucher); // Thêm vào đầu danh sách
  //   console.log("Thêm mới thành công:", finalVoucher);

  //   // Đảm bảo chuyển về trang 1 để thấy voucher mới
  //   currentPage.value = 1;
  // }

//   isModalOpen.value = false; // Đóng modal
// };
</script>

<template>
  <div class="flex h-screen bg-[#F3F4F6] font-sans">
    <Navbar />

    <div class="flex-1 flex flex-col h-screen overflow-hidden">
      <main class="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
        <div class="mb-8 flex justify-between items-end">
          <div>
            <h2 class="text-3xl font-bold text-gray-900">Quản lý Voucher</h2>
            <p class="text-gray-500 mt-1">
              Tạo, theo dõi và quản lý các mã giảm giá/khuyến mãi của bạn.
            </p>
          </div>
          <div class="flex gap-2">
            <button
              @click=""
              class="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-700 shadow-md transition-colors"
            >
              <i class="fa-solid fa-plus mr-1"></i> Tạo Voucher Mới
            </button>
          </div>
        </div>

        <div
          class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div
            class="p-6 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4"
          >
            <h3 class="font-bold text-lg text-gray-900">
              Danh sách Voucher của bạn
            </h3>

            <div class="flex gap-4 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                v-model="searchTerm"
                @input="currentPage = 1"
                placeholder="Tìm kiếm theo mã/mô tả voucher"
                class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-gray-500 focus:border-gray-500 w-full sm:w-60"
              />
              <select
                v-model="filterStatus"
                @change="currentPage = 1"
                class="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 outline-none w-full sm:w-auto"
              >
                <option value="all">
                  Tất cả trạng thái ({{ allVouchers.length }})
                </option>
                <option value="active">Đang chạy</option>
                <option value="pending">Chờ kích hoạt</option>
                <option value="nearly_expired">Sắp hết hạn</option>
                <option value="expired">Đã hết hạn</option>
              </select>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead class="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th class="px-6 py-4 font-semibold">Mã Voucher</th>
                  <th class="px-6 py-4 font-semibold">Loại & Giá trị</th>
                  <th class="px-6 py-4 font-semibold">Ngày bắt đầu</th>
                  <th class="px-6 py-4 font-semibold">Ngày hết hạn</th>
                  <th class="px-6 py-4 font-semibold">SL Giới hạn</th>
                  <th class="px-6 py-4 font-semibold">Đã dùng</th>
                  <th class="px-6 py-4 font-semibold text-center">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-if="filteredVouchers.length === 0">
                  <td
                    colspan="8"
                    class="px-6 py-8 text-center text-gray-500 text-base"
                  >
                    Không tìm thấy voucher nào phù hợp với điều kiện tìm
                    kiếm/lọc.
                  </td>
                </tr>

                <tr
                  v-for="voucher in currentVouchers"
                  :key="voucher.id"
                  class="hover:bg-gray-50 transition-colors"
                >
                  <td class="px-6 py-4 text-sm font-bold text-gray-900">
                    {{ voucher.code }}
                    <div
                      class="text-xs font-normal text-gray-500 mt-0.5 max-w-40 truncate"
                      :title="voucher.description ?? ''"
                    >
                      {{ voucher.description || "Không có mô tả" }}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-700">
                    <div class="font-medium text-gray-900">
                      <span v-if="voucher.discount_type === 'PERCENT'">
                        {{ voucher.discount_value }}%
                        <span v-if="voucher.max_discount">
                          (Tối đa:
                          {{ formatCurrency(voucher.max_discount) }})</span
                        >
                      </span>
                      <span v-else-if="voucher.discount_type === 'FIXED'">
                        Giảm {{ formatCurrency(voucher.discount_value) }}
                      </span>
                    </div>
                    <div class="text-xs text-gray-500 mt-0.5">
                      Đơn tối thiểu:
                      {{ formatCurrency(voucher.min_order_value) }}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    {{ formatDateTime(voucher.start_date ) }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    {{formatDateTime( voucher.end_date) }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-700">
                    {{ voucher.quantity.toLocaleString() }}
                  </td>
                  <td class="px-6 py-4 text-sm font-medium text-gray-900">
                    {{ voucher.used.toLocaleString() }}
                    <div class="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        class="h-1.5 rounded-full"
                        :class="{
                          'bg-green-500': voucher.used / voucher.quantity < 0.8,
                          'bg-yellow-500':
                            voucher.used / voucher.quantity >= 0.8 &&
                            voucher.used / voucher.quantity < 1,
                          'bg-red-500': voucher.used / voucher.quantity === 1,
                        }"
                        :style="{
                          width: `${(voucher.used / voucher.quantity) * 100}%`,
                        }"
                      ></div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="getStatusColor(voucher.status ||'')"
                    >
                      {{ voucher.status }}
                    </span>
                  </td>
                 
                </tr>
              </tbody>
            </table>
          </div>

          <div
            class="p-4 flex justify-between items-center bg-white border-t border-gray-100"
          >
            <div class="text-sm text-gray-600">
              Hiển thị {{ (currentPage - 1) * itemsPerPage + 1 }} đến
              {{
                Math.min(currentPage * itemsPerPage, filteredVouchers.length)
              }}
              trên {{ filteredVouchers.length }} voucher
            </div>
            <div class="flex space-x-1">
              <button
                class="px-3 py-1 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                :disabled="currentPage === 1"
                @click="changePage(currentPage - 1)"
              >
                Trước
              </button>

              <button
                v-for="page in pageNumbers"
                :key="page"
                class="px-3 py-1 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                :class="{
                  'bg-gray-900 text-white font-bold hover:text-white':
                    page === currentPage,
                }"
                @click="changePage(page)"
              >
                {{ page }}
              </button>

              <button
                class="px-3 py-1 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                :disabled="currentPage === totalPages"
                @click="changePage(currentPage + 1)"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
<!-- 
    <VoucherFormModal
      :model-value="isModalOpen"
      @update:model-value="isModalOpen = $event"
      :is-edit="isEditing"
      :initial-voucher="voucherToEdit"
      @save="handleSaveVoucher"
    /> -->
  </div>
</template>

<style scoped>
/* Custom scrollbar cho Main Content */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
