<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Bar } from "vue-chartjs";
import Navbar from "../../components/admin/Navbar.vue";
import Loading from "@/components/Loading.vue";
import { useProductAdminStore } from "../../stores/admin/product";
import { useProductStore } from "@/stores/product";
import { useUserAdminStore } from "@/stores/admin/user";
import { useOrderEmployeeStore } from "@/stores/order";
import * as XLSX from "xlsx";
import { useAuthStore } from "@/stores/auth"; // Import Auth Store

// --- 1. IMPORT CHART.JS ---
const loading = ref<boolean>(false);
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

const useProduct = useProductStore();
const productAdmin = useProductAdminStore();
const userAdmin = useUserAdminStore();
const useOrder = useOrderEmployeeStore();
const auth = useAuthStore(); // Sử dụng Auth Store

const productBestSeller = ref<IProductMongoDetail[]>([]);
const listOrders = ref<GetOrder[]>([]);
const listRevenueData = ref<IRevenueYearResponse | null>(null);
const selectedYear = ref(new Date().getFullYear());
const currentFilter = ref<string>("hôm nay");

// --- BRANCH CONFIG ---
const branches = [
    { code: 'CT', label: 'Toàn Hệ Thống' },
    { code: 'HN', label: 'Chi Nhánh Hà Nội' },
    { code: 'DN', label: 'Chi Nhánh Đà Nẵng' },
    { code: 'HCM', label: 'Chi Nhánh TPHCM' }
];
const selectedBranch = ref<any>(branches[0]);
const showBranchDropdown = ref(false);

// Hàm xử lý mở dropdown (Chỉ cho phép CT)
const toggleDropdown = () => {
    if (auth.user?.branch === 'CT') {
        showBranchDropdown.value = !showBranchDropdown.value;
    }
};

// Hàm xử lý chọn chi nhánh
const selectBranch = async (branch: typeof branches[0]) => {
    selectedBranch.value = branch;
    showBranchDropdown.value = false;
    // Reload toàn bộ dữ liệu khi đổi chi nhánh
    await fetchAllData();
};

// Hàm tải toàn bộ dữ liệu (Centralized Data Fetching)
const fetchAllData = async () => {
    const branchCode = selectedBranch.value.code;
    
    // 1. Tải số liệu thống kê (KPIs) - 4 API
    await handleDashBoard(currentFilter.value);

    // 2. Tải các phần còn lại - 3 API
    const [bestSeller, topOrders, revenueData] = await Promise.all([
        useProduct.getProductBestSellerForAdminStore(10, branchCode), // API 5
        useOrder.getTopOrderOfBranchStore(10, branchCode),    // API 6
        useOrder.getTotalOrderMonthForAdminStore(selectedYear.value.toString(), branchCode), // API 7
    ]);

    productBestSeller.value = bestSeller;
    listOrders.value = topOrders;
    listRevenueData.value = {
        year: revenueData.year || new Date().getFullYear(),
        monthlyRevenue: revenueData.monthlyRevenue || [],
    };
};

onMounted(async () => {
  loading.value = true;
  
  // 1. Set chi nhánh theo User trước
  if (auth.user?.branch) {
      const userBranch = branches.find(b => b.code === auth.user?.branch);
      if (userBranch) {
          selectedBranch.value = userBranch;
      }
  }

  // 2. Sau đó mới fetch dữ liệu
  await fetchAllData();
  
  loading.value = false;
});

// Cấu hình dữ liệu cho Chart.js
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
    legend: { display: false },
    tooltip: {
      backgroundColor: "#000",
      titleColor: "#fff",
      bodyColor: "#fff",
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        label: (context: any) => `Doanh thu: ${formatPrice(context.raw)}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        display: true,
        color: "#f3f4f6",
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
  const branchCode = selectedBranch.value.code;

  // Gọi 4 API thống kê với branchCode
  // loading.value = true; // Bỏ loading ở đây để trải nghiệm mượt hơn khi click filter tab
  const [dailyOrders, totalOrders, totalUsers, totalCancelled] =
    await Promise.all([
      useOrder.getDailyOrderComparisonForAdminStore(option, branchCode), // API 1
      useOrder.getTotalOrderComparisonForAdminStore(option, branchCode), // API 2
      userAdmin.getTotalUserComparisonForAdminStore(option, branchCode), // API 3
      useOrder.getTotalOrderCancelledForAdminStore(option, branchCode),  // API 4
    ]);

  const responses = [dailyOrders, totalOrders, totalUsers, totalCancelled];
  // loading.value = false;
  
  responses.forEach((data, idx) => {
    if (stats.value[idx]) {
      stats.value[idx].value = data.total ? (data.total) : "0";
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

const fetchRevenue = async () => {
  // API 7 (Gọi lại khi đổi năm)
  loading.value = true;
  const data = await useOrder.getTotalOrderMonthForAdminStore(
    selectedYear.value.toString(),
    selectedBranch.value.code // Truyền branchCode
  );
  loading.value = false;
  listRevenueData.value = {
    year: data.year || selectedYear.value,
    monthlyRevenue: data.monthlyRevenue || [],
  };
};

const exportKpiExcel = () => {
  if (!stats.value || stats.value.length === 0) return;

  const wsData = [
    ["Báo cáo KPI - " + selectedBranch.value.label],
    ["Thời gian lọc: " + currentFilter.value],
    [""],
    ["Tên KPI", "Giá trị", "Thay đổi"],
    ...stats.value.map(item => [item.title, item.value, item.change])
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "KPI Dashboard");

  XLSX.writeFile(wb, `KPI_Dashboard_${selectedBranch.value.code}.xlsx`);
};

// Thống kê tổng quan (KPIs)
const stats = ref([
  {
    title: "Tổng doanh thu",
    value: "0 ₫",
    change: "+0%",
    isPositive: true,
    icon: "fa-sack-dollar",
    color: "bg-green-100 text-green-600",
  },
  {
    title: "Đơn hàng mới",
    value: "0",
    change: "+0%",
    isPositive: true,
    icon: "fa-cart-shopping",
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Khách hàng",
    value: "0",
    change: "-0%",
    isPositive: false,
    icon: "fa-users",
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Đơn hàng bị hủy",
    value: "0",
    change: "+0%",
    isPositive: true,
    icon: "fa-circle-xmark",
    color: "bg-orange-100 text-orange-600",
  },
]);

// --- ĐƠN HÀNG VÀ PHÂN TRANG ---
const currentPage = ref(1);
const itemsPerPage = 5;

const totalPages = computed(() => {
  return Math.ceil(listOrders.value.length / itemsPerPage);
});

const currentOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return listOrders.value.slice(start, end);
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
</script>

<template>
    <Loading :loading="loading"/> 
  <div class="flex h-screen bg-[#F3F4F6] font-sans">
    <Navbar />

    <div class="flex-1 flex flex-col h-screen overflow-hidden">
      <main class="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
        
        <div class="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">
              Tổng quan (Dashboard)
            </h2>
            <p class="text-gray-500 mt-1 text-sm">
              Báo cáo hoạt động kinh doanh
              <span class="font-medium text-gray-700">{{ currentFilter }}</span>.
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            
            <div class="relative w-full sm:w-60 z-20">
                <div 
                    class="bg-white border border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg flex justify-between items-center shadow-sm transition-colors h-[42px]"
                    :class="auth.user?.branch === 'CT' ? 'cursor-pointer hover:border-black' : 'cursor-not-allowed opacity-60 bg-gray-50'"
                    @click="toggleDropdown"
                >
                    <div class="flex items-center gap-2 truncate">
                        <i class="fa-solid fa-building-columns text-gray-400"></i>
                        <span class="truncate text-sm">{{ selectedBranch.label }}</span>
                    </div>
                    <i v-if="auth.user?.branch === 'CT'" class="fa-solid fa-chevron-down text-xs transition-transform" :class="{'rotate-180': showBranchDropdown}"></i>
                </div>
                
                <div 
                    v-if="showBranchDropdown" 
                    class="absolute top-full left-0 w-full bg-white border border-gray-100 shadow-xl rounded-lg mt-1 overflow-hidden animate-fade-in"
                >
                    <div 
                        v-for="branch in branches" 
                        :key="branch.code"
                        class="px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between group"
                        @click="selectBranch(branch)"
                    >
                        <span :class="selectedBranch.code === branch.code ? 'font-bold text-black' : 'text-gray-600'">{{ branch.label }}</span>
                        <i v-if="selectedBranch.code === branch.code" class="fa-solid fa-check text-green-500 text-xs"></i>
                    </div>
                </div>
                <div v-if="showBranchDropdown" class="fixed inset-0 z-[-1]" @click="showBranchDropdown = false"></div>
            </div>
            
            <div class="bg-gray-100 p-1 rounded-lg flex shadow-inner overflow-x-auto max-w-full">
              <button
                v-for="option in options"
                :key="option.value"
                @click="handleDashBoard(option.value)"
                class="px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap"
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
              class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-green-600 hover:border-green-500 shadow-sm transition-colors flex items-center h-[42px] whitespace-nowrap"
            >
              <i class="fa-solid fa-download mr-2"></i> Xuất
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
            <p v-if="index == 0" class="text-2xl font-bold text-gray-900">{{ formatPrice(parseInt(stat.value)) }}</p>
            <p v-else class="text-2xl font-bold text-gray-900">{{ stat.value }}</p>
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
                class="text-sm border-gray-300 border rounded-md px-2 py-1 text-gray-600 outline-none focus:border-green-500"
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
                      :title="product.name"
                      >
                      {{ product.name }}
                      </h4>
                      <p
                      class="text-xs sm:text-sm text-gray-500 truncate"
                      :title="getColorMain(product)?.color || ''"
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
                <tr v-if="currentOrders.length === 0">
                    <td colspan="5" class="text-center py-8 text-gray-500">
                        Chưa có đơn hàng nào
                    </td>
                </tr>
                <tr
                  v-for="order in currentOrders"
                  :key="order.id"
                  class="hover:bg-gray-50 transition-colors"
                >
                  <td class="px-6 py-4 text-sm font-bold text-gray-900">
                    #{{ order.id }}
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
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
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
              Hiển thị {{ listOrders.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0 }} đến
              {{ Math.min(currentPage * itemsPerPage, listOrders.length) }} trên
              {{ listOrders.length }} đơn hàng
            </div>
            <div class="flex space-x-1" v-if="totalPages > 1">
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
                class="px-3 py-1 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-green-600"
                :class="{
                  'bg-gray-900 text-white font-bold hover:text-white': page === currentPage,
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
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
    animation: fadeIn 0.15s ease-out forwards;
}

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
  width: 6px;
}
.custom-scrollbar-v2::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar-v2::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 3px;
}
.custom-scrollbar-v2::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>