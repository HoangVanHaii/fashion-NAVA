<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Bar } from "vue-chartjs";
import Navbar from "../../components/admin/Navbar.vue";
import { useProductAdminStore } from "../../stores/admin/product";

const productAdmin = useProductAdminStore();

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

// --- 2. MOCK DATA ---
onMounted(async () => {
  await productAdmin.getAllProductPayloadStore();
});

// Dữ liệu biểu đồ doanh thu
const revenueData = ref([
  { month: "T1", value: 40 },
  { month: "T2", value: 35 },
  { month: "T3", value: 55 },
  { month: "T4", value: 70 },
  { month: "T5", value: 60 },
  { month: "T6", value: 85 },
  { month: "T7", value: 50 },
  { month: "T8", value: 65 },
  { month: "T9", value: 75 },
  { month: "T10", value: 90 },
  { month: "T11", value: 80 },
  { month: "T12", value: 95 },
]);

// Cấu hình dữ liệu cho Chart.js (Computed để tự update khi data thay đổi)
const chartData = computed(() => ({
  labels: revenueData.value.map((item) => item.month),
  datasets: [
    {
      label: "Doanh thu (Triệu VNĐ)",
      backgroundColor: "#111827", // Màu gray-900 cho sang trọng
      hoverBackgroundColor: "#374151",
      borderRadius: 4,
      barPercentage: 0.6,
      categoryPercentage: 0.8,
      data: revenueData.value.map((item) => item.value),
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
        label: (context: any) => `Doanh thu: ${context.raw} triệu ₫`,
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
    title: "Sản phẩm tồn kho",
    value: "843",
    change: "+1.0%",
    isPositive: true,
    icon: "fa-box-open",
    color: "bg-orange-100 text-orange-600",
  },
]);

// --- SẢN PHẨM BÁN CHẠY ---
const topSellingProducts = ref([
  {
    id: 1,
    name: "Nike Air Red",
    category: "Giày thể thao",
    sales: "3.2m ₫",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=100&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Basic Tee",
    category: "Áo thun",
    sales: "850k ₫",
    imageUrl:
      "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?q=80&w=100&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Headphone Pro",
    category: "Điện tử",
    sales: "4.1m ₫",
    imageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=100&auto=format&fit=crop",
  },
  {
    id: 4,
    name: "Túi Xách Da Cao Cấp",
    category: "Phụ kiện",
    sales: "1.5m ₫",
    imageUrl:
      "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=100&auto=format&fit=crop",
  },
  {
    id: 5,
    name: "Móc Khóa Mini",
    category: "Đồ dùng cá nhân",
    sales: "120k ₫",
    imageUrl:
      "https://images.unsplash.com/photo-1583783935246-83492576b251?q=80&w=100&auto=format&fit=crop",
  },
  {
    id: 6,
    name: "Chuột Gaming RGB",
    category: "Điện tử",
    sales: "600k ₫",
    imageUrl:
      "https://images.unsplash.com/photo-1594950942159-ef22a9009f48?q=80&w=100&auto=format&fit=crop",
  },
  {
    id: 7,
    name: "Bàn Phím Cơ",
    category: "Điện tử",
    sales: "1.8m ₫",
    imageUrl:
      "https://images.unsplash.com/photo-1587843828362-7313a298813c?q=80&w=100&auto=format&fit=crop",
  },
]);

// --- ĐƠN HÀNG VÀ PHÂN TRANG ---
const allOrders = ref([
  {
    id: "#ORD-001",
    customer: "Nguyễn Văn A",
    date: "2023-11-20",
    total: "1.200.000 ₫",
    status: "completed",
    statusText: "Hoàn thành",
  },
  {
    id: "#ORD-002",
    customer: "Trần Thị B",
    date: "2023-11-19",
    total: "560.000 ₫",
    status: "pending",
    statusText: "Chờ xử lý",
  },
  {
    id: "#ORD-003",
    customer: "Lê Văn C",
    date: "2023-11-19",
    total: "2.500.000 ₫",
    status: "shipping",
    statusText: "Đang giao",
  },
  {
    id: "#ORD-004",
    customer: "Phạm Thị D",
    date: "2023-11-18",
    total: "890.000 ₫",
    status: "cancelled",
    statusText: "Đã hủy",
  },
  {
    id: "#ORD-005",
    customer: "Hoàng Văn E",
    date: "2023-11-18",
    total: "150.000 ₫",
    status: "completed",
    statusText: "Hoàn thành",
  },
  {
    id: "#ORD-006",
    customer: "Nguyễn Văn F",
    date: "2023-11-17",
    total: "780.000 ₫",
    status: "pending",
    statusText: "Chờ xử lý",
  },
  {
    id: "#ORD-007",
    customer: "Trần Thị G",
    date: "2023-11-17",
    total: "3.200.000 ₫",
    status: "shipping",
    statusText: "Đang giao",
  },
  {
    id: "#ORD-008",
    customer: "Lê Văn H",
    date: "2023-11-16",
    total: "450.000 ₫",
    status: "completed",
    statusText: "Hoàn thành",
  },
  {
    id: "#ORD-009",
    customer: "Phạm Thị I",
    date: "2023-11-16",
    total: "990.000 ₫",
    status: "cancelled",
    statusText: "Đã hủy",
  },
  {
    id: "#ORD-010",
    customer: "Hoàng Văn K",
    date: "2023-11-15",
    total: "2.100.000 ₫",
    status: "completed",
    statusText: "Hoàn thành",
  },
  {
    id: "#ORD-011",
    customer: "Nguyễn Thị L",
    date: "2023-11-15",
    total: "120.000 ₫",
    status: "pending",
    statusText: "Chờ xử lý",
  },
]);

const currentPage = ref(1);
const itemsPerPage = 5; // Tối đa 5 đơn hàng mỗi trang

// Tính toán tổng số trang
const totalPages = computed(() => {
  return Math.ceil(allOrders.value.length / itemsPerPage);
});

// Tính toán danh sách đơn hàng cho trang hiện tại
const currentOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return allOrders.value.slice(start, end);
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

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "shipping":
      return "bg-blue-100 text-blue-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};
</script>

<template>
  <div class="flex h-screen bg-[#F3F4F6] font-sans">
    <Navbar />

    <div class="flex-1 flex flex-col h-screen overflow-hidden">
      <main class="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
        <div class="mb-8 flex justify-between items-end">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">
              Tổng quan (Dashboard)
            </h2>
            <p class="text-gray-500 mt-1">
              Báo cáo hoạt động kinh doanh hôm nay.
            </p>
          </div>
          <div class="hidden sm:flex gap-2">
            <button
              class="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <i class="fa-solid fa-download mr-1"></i> Xuất báo cáo
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
                class="text-sm border-gray-300 border rounded-md px-2 py-1 text-gray-600 outline-none"
              >
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
                v-for="product in topSellingProducts"
                :key="product.id"
                class="flex items-center gap-4"
              >
                <img
                  :src="product.imageUrl"
                  class="w-12 h-12 rounded-lg object-cover bg-gray-100"
                />
                <div class="flex-1">
                  <h4 class="text-sm font-bold text-gray-900">
                    {{ product.name }}
                  </h4>
                  <p class="text-xs text-gray-500">{{ product.category }}</p>
                </div>
                <span class="font-bold text-sm text-gray-900">{{
                  product.sales
                }}</span>
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
                        {{ order.customer.charAt(0) }}
                      </div>
                      {{ order.customer }}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    {{ order.date }}
                  </td>
                  <td class="px-6 py-4 text-sm font-medium text-gray-900">
                    {{ order.total }}
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="getStatusColor(order.status)"
                    >
                      {{ order.statusText }}
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
              {{ Math.min(currentPage * itemsPerPage, allOrders.length) }} trên
              {{ allOrders.length }} đơn hàng
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
