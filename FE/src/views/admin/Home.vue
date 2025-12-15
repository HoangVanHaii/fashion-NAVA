<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Bar } from "vue-chartjs";
import Navbar from "../../components/admin/Navbar.vue";
import { useProductAdminStore } from "../../stores/admin/product";
import { useProductStore } from "@/stores/product";
const useProduct = useProductStore();

const productAdmin = useProductAdminStore();
const productBestSeller = ref<IProductMongoDetail[]>([]);
const listOrders = ref<GetOrder[]>([]);
import { useUserAdminStore } from "@/stores/admin/user";
const userAdmin = useUserAdminStore();
// --- 1. IMPORT CHART.JS ---
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import type { IProductMongoDetail } from "@/interfaces/product";
import {
  formatPrice,
  getColorMain,
  getMainProductImage,
  getMinProductPrice,
} from "@/utils/format";
import {
  type IRevenueMonth,
  type GetOrder,
  type IKpiResponse,
  type IRevenueYearResponse,
} from "@/interfaces/order";
import { useOrderEmployeeStore } from "@/stores/order";

// Đăng ký các thành phần Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const useOrder = useOrderEmployeeStore();
onMounted(async () => {
  await handleDashBoard(currentFilter.value);
  const [bestSeller, topOrders, revenueData] = await Promise.all([
    useProduct.getProductBestSellerStore(10),
    useOrder.getTopOrderOfBranchStore(10),
    useOrder.getTotalOrderMonthForAdminStore(selectedYear.value.toString()),
  ]);

  productBestSeller.value = bestSeller;
  listOrders.value = topOrders;
  listRevenueData.value = {
    year: revenueData.year || new Date().getFullYear(),
    monthlyRevenue: revenueData.monthlyRevenue || [],
  };
});

const listRevenueData = ref<IRevenueYearResponse | null>(null);
// Dữ liệu biểu đồ doanh thu
// const revenueData = ref([
//   { month: "T1", value: 40 },
//   { month: "T2", value: 35 },
//   { month: "T3", value: 55 },
//   { month: "T4", value: 70 },
//   { month: "T5", value: 60 },
//   { month: "T6", value: 85 },
//   { month: "T7", value: 50 },
//   { month: "T8", value: 65 },
//   { month: "T9", value: 75 },
//   { month: "T10", value: 90 },
//   { month: "T11", value: 80 },
//   { month: "T12", value: 95 },
// ]);

// Cấu hình dữ liệu cho Chart.js (Computed để tự update khi data thay đổi)
const chartData = computed(() => ({
  labels:
    listRevenueData.value?.monthlyRevenue.map(
      (item) => `Tháng ${item.month}`
    ) || [],
  datasets: [
    {
      label: "Doanh thu (Triệu VNĐ)",
      backgroundColor: "#111827",
      hoverBackgroundColor: "#374151",
      borderRadius: 4,
      barPercentage: 0.6,
      categoryPercentage: 0.8,
      data:
        listRevenueData.value?.monthlyRevenue.map((item) => item.revenue) || [],
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }, // Ẩn chú thích (legend)
    tooltip: {
      backgroundColor: "#000",
      titleColor: "#fff",
      bodyColor: "#fff",
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        label: (context: any) => `Doanh thu: ${formatPrice(context.raw)}`, // dùng raw
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        display: true,
        color: "#f3f4f6", // Màu lưới nhạt
        drawBorder: false,
      },
      ticks: { font: { size: 11 }, color: "#9ca3af" },
    },
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 }, color: "#6b7280" },
    },
  },
};
const handleDashBoard = async (option: string) => {
  currentFilter.value = option;

  const [dailyOrders, totalOrders, totalUsers, totalCancelled] =
    await Promise.all([
      useOrder.getDailyOrderComparisonForAdminStore(option),
      useOrder.getTotalOrderComparisonForAdminStore(option),
      userAdmin.getTotalUserComparisonForAdminStore(option),
      useOrder.getTotalOrderCancelledForAdminStore(option),
    ]);

  const responses = [dailyOrders, totalOrders, totalUsers, totalCancelled];

  responses.forEach((data, idx) => {
    if (stats.value[idx]) {
      stats.value[idx].value = data.total ? formatPrice(data.total) : "0";
      const change = formatChangePercent(data.changePercent);
      stats.value[idx].change = change.text;
      stats.value[idx].isPositive = change.isPositive;
    }
  });
};

const formatChangePercent = (value?: number) => {
  if (value === undefined || value === null) {
    return { text: "0%", isPositive: true };
  }

  return {
    text: `${value > 0 ? "+" : ""}${value.toFixed(2)}%`,
    isPositive: value >= 0,
  };
};
const selectedYear = ref(new Date().getFullYear());
const fetchRevenue = async () => {
  const data = await useOrder.getTotalOrderMonthForAdminStore(
    selectedYear.value.toString()
  );
  listRevenueData.value = {
    year: data.year || selectedYear.value,
    monthlyRevenue: data.monthlyRevenue || [],
  };
};
import * as XLSX from "xlsx";

const exportKpiExcel = () => {
  if (!stats.value || stats.value.length === 0) return;

  // Lấy những trường cần thiết
  const wsData = [
    ["Tên KPI", "Giá trị", "Thay đổi"], // Header
    ...stats.value.map(item => [item.title, item.value, item.change])
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "KPI Dashboard");

  XLSX.writeFile(wb, `KPI_Dashboard.xlsx`);
};
// Thống kê tổng quan (KPIs)
const stats = ref([
  {
    title: "Tổng doanh thu",
    value: "128.500.000 ₫",
    change: "+12.5%",
    isPositive: true,
    icon: "fa-sack-dollar",
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Đơn hàng mới",
    value: "1,245",
    change: "+8.2%",
    isPositive: true,
    icon: "fa-cart-shopping",
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Khách hàng",
    value: "5,820",
    change: "-2.4%",
    isPositive: false,
    icon: "fa-users",
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Đơn hàng bị hủy",
    value: "843",
    change: "+1.0%",
    isPositive: true,
    icon: "fa-circle-xmark",
    color: "bg-orange-100 text-orange-600",
  },
]);
// --- ĐƠN HÀNG VÀ PHÂN TRANG ---

const currentPage = ref(1);
const itemsPerPage = 5; // Tối đa 5 đơn hàng mỗi trang

// Tính toán tổng số trang
const totalPages = computed(() => {
  return Math.ceil(listOrders.value.length / itemsPerPage);
});

// Tính toán danh sách đơn hàng cho trang hiện tại
const currentOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return listOrders.value.slice(start, end);
});

// Hàm chuyển trang
const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

// Tạo mảng số trang để v-for
const pageNumbers = computed(() => {
  const pages = [];
  for (let i = 1; i <= totalPages.value; i++) {
    pages.push(i);
  }
  return pages;
});

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

const STATUS_MAP: Record<OrderStatus, { text: string; color: string }> = {
  PENDING: {
    text: "Chờ xử lý",
    color: "bg-yellow-100 text-yellow-700",
  },
  CONFIRMED: {
    text: "Đã xác nhận",
    color: "bg-blue-100 text-blue-700",
  },
  SHIPPED: {
    text: "Đang giao hàng",
    color: "bg-purple-100 text-purple-700",
  },
  COMPLETED: {
    text: "Hoàn thành",
    color: "bg-green-100 text-green-700",
  },
  CANCELLED: {
    text: "Đã huỷ",
    color: "bg-red-100 text-red-700",
  },
};
const getOrderStatusUI = (status?: string) => {
  const key = status?.toUpperCase() as OrderStatus;
  return (
    STATUS_MAP[key] ?? {
      text: "Không xác định",
      color: "bg-gray-100 text-gray-700",
    }
  );
};
const options = [
  { label: "Ngày", value: "hôm nay" },
  { label: "Tuần", value: "tuần này" },
  { label: "Tháng", value: "tháng này" },
  { label: "Năm", value: "năm nay" },
  { label: "Tất cả", value: "từ trước tới nay" },
];
const currentFilter = ref<string>("hôm nay");
</script>

<template>
  <div class="flex h-screen bg-[#F3F4F6] font-sans">
    <Navbar />

    <div class="flex-1 flex flex-col h-screen overflow-hidden">
      <main class="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
        <div
          class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <h2 class="text-2xl font-bold text-gray-900">
              Tổng quan (Dashboard)
            </h2>
            <p class="text-gray-500 mt-1 text-sm">
              Báo cáo hoạt động kinh doanh
              <span class="font-medium text-gray-700">{{ currentFilter }}</span
              >.
            </p>
          </div>

          <div
            class="flex flex-col sm:flex-row gap-3 items-start sm:items-center"
          >
            <div class="bg-gray-100 p-1 rounded-lg flex shadow-inner">
              <button
                v-for="option in options"
                :key="option.value"
                @click="handleDashBoard(option.value)"
                class="px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200"
                :class="[
                  currentFilter === option.value
                    ? 'bg-white text-green-600 shadow-sm ring-1 ring-black/5'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200',
                ]"
              >
                {{ option.label }}
              </button>
            </div>

            <button
              @click="exportKpiExcel"
              class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-green-600 hover:border-green-500 shadow-sm transition-colors flex items-center"
            >
              <i class="fa-solid fa-download mr-2"></i> Xuất báo cáo
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div
            v-for="(stat, index) in stats"
            :key="index"
            class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div class="flex justify-between items-start mb-4">
              <div class="p-3 rounded-lg" :class="stat.color">
                <i class="fa-solid text-xl" :class="stat.icon"></i>
              </div>
              <span
                class="text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1"
                :class="
                  stat.isPositive
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                "
              >
                <i
                  class="fa-solid"
                  :class="
                    stat.isPositive
                      ? 'fa-arrow-trend-up'
                      : 'fa-arrow-trend-down'
                  "
                ></i>
                {{ stat.change }}
              </span>
            </div>
            <h3 class="text-gray-500 text-sm font-medium mb-1">
              {{ stat.title }}
            </h3>
            <p class="text-2xl font-bold text-gray-900">{{ stat.value }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div
            class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2 flex flex-col"
          >
            <div class="flex justify-between items-center mb-6">
              <h3 class="font-bold text-lg text-gray-900">
                Biểu đồ doanh thu năm nay
              </h3>
              <select
                v-model="selectedYear"
                @change="fetchRevenue"
                class="text-sm border-gray-300 border rounded-md px-2 py-1 text-gray-600 outline-none"
              >
                <option>2025</option>
                <option>2024</option>
                <option>2023</option>
              </select>
            </div>

            <div class="h-[25rem] w-full relative">
              <Bar :data="chartData" :options="chartOptions" />
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="font-bold text-lg text-gray-900 mb-4">
              Sản phẩm bán chạy
            </h3>
            <div
              class="space-y-4 h-[25rem] overflow-y-auto pr-2 custom-scrollbar-v2"
            >
            <div
                v-for="product in productBestSeller"
                :key="product.product_id_sql"
                class="flex flex-row flex-wrap items-center gap-2"
                >
                <img
                    :src="getMainProductImage(product)"
                    class="w-12 h-12 rounded-lg object-cover bg-gray-100"
                />
                <div class="flex-1 min-w-0">
                    <h4
                    class="text-sm sm:text-base font-bold text-gray-900 truncate"
                    title="{{ product.name }}"
                    >
                    {{ product.name }}
                    </h4>
                    <p
                    class="text-xs sm:text-sm text-gray-500 truncate"
                    title="{{ getColorMain(product)?.color || '' }}"
                    >
                    {{ getColorMain(product)?.color || "" }}
                    </p>
                </div>
                <span
                    class="font-bold text-xs sm:text-sm text-gray-900 whitespace-nowrap"
                >
                    {{ formatPrice(getMinProductPrice(product) || 0) }}
                </span>
                </div>

            </div>
          </div>
        </div>

        <div
          class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div
            class="p-6 border-b border-gray-100 flex justify-between items-center"
          >
            <h3 class="font-bold text-lg text-gray-900">Đơn hàng gần đây</h3>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead class="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th class="px-6 py-4 font-semibold">Mã đơn</th>
                  <th class="px-6 py-4 font-semibold">Khách hàng</th>
                  <th class="px-6 py-4 font-semibold">Ngày đặt</th>
                  <th class="px-6 py-4 font-semibold">Tổng tiền</th>
                  <th class="px-6 py-4 font-semibold text-center">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  v-for="order in currentOrders"
                  :key="order.id"
                  class="hover:bg-gray-50 transition-colors"
                >
                  <td class="px-6 py-4 text-sm font-bold text-gray-900">
                    {{ order.id }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-700">
                    <div class="flex items-center gap-2">
                      <div
                        class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600"
                      >
                        {{ order.user_name_buyer?.charAt(0) || "N" }}
                      </div>
                      {{ order.user_name_buyer }}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    {{ order.created_at }}
                  </td>
                  <td class="px-6 py-4 text-sm font-medium text-gray-900">
                    {{ formatPrice(order.total) }}
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="getOrderStatusUI(order.status!).color"
                    >
                      {{ getOrderStatusUI(order.status).text || "" }}
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
              {{ Math.min(currentPage * itemsPerPage, listOrders.length) }} trên
              {{ listOrders.length }} đơn hàng
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
                class="px-3 py-1 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-red-600"
                :class="{
                  'bg-gray-900 text-white font-bold': page === currentPage,
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

/* Custom scrollbar cho Sản phẩm bán chạy */
.custom-scrollbar-v2::-webkit-scrollbar {
  width: 6px; /* Độ rộng của thanh cuộn dọc */
}
.custom-scrollbar-v2::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar-v2::-webkit-scrollbar-thumb {
  background: #e5e7eb; /* Màu nhạt hơn cho scrollbar trong box */
  border-radius: 3px;
}
.custom-scrollbar-v2::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>
