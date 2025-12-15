<script setup lang="ts">
    import { ref, computed, onMounted, onUnmounted } from "vue";
    import Navbar from "../../components/admin/Navbar.vue";
    import VoucherFormModal from "../../components/admin/VoucherForm.vue";
    import { voucherStore } from "@/stores/voucher";

    // --- 1. DEFINITIONS & INTERFACES ---

    export interface Voucher {
        ID?: string;
        code: string;
        description?: string;
        discount_type: "PERCENT" | "FIXED";
        discount_value: number;
        max_discount: number; // Theo interface của bạn là number (nếu không giới hạn có thể để số rất lớn hoặc 0 tùy logic BE)
        min_order_value: number;
        quantity: number;
        used?: number;
        start_date: Date;
        end_date: Date;
        created_by: string; // Vẫn giữ trong interface để đúng kiểu dữ liệu
        created_at?: Date;
        updated_at?: Date;
    }

    // Interface mở rộng cho UI để chứa các trường trạng thái hiển thị
    interface VoucherUI extends Voucher {
        status?: "active" | "pending" | "nearly_expired" | "expired";
        statusText?: string;
    }


    // --- 2. HELPER FUNCTIONS ---

    // Hàm định dạng số tiền
    const formatCurrency = (value: number | string | undefined): string => {
        if (value === undefined || value === null) return "0 ₫";
        let numValue = typeof value === "string" ? parseFloat(value) : value;
        if (isNaN(numValue)) return "0 ₫";
        return numValue.toLocaleString("vi-VN") + " ₫";
    };

    // Hàm định dạng ngày tháng (Vì interface dùng Date object)
    const formatDate = (date: Date | string): string => {
        if (!date) return "";
        const d = new Date(date);
        return d.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const useVoucher = voucherStore();
    const listVoucher = ref<Voucher[]>([]);

    onMounted(async () => {
        listVoucher.value = await useVoucher.getAllVoucherStore();
        console.log("aa", listVoucher.value)
    })

    // Hàm tính trạng thái dựa trên ngày tháng
    const calculateStatus = (
        start: Date,
        end: Date
    ): { status: VoucherUI["status"]; text: string } => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset giờ để so sánh ngày
        const startDate = new Date(start);
        const endDate = new Date(end);

        if (now > endDate) return { status: "expired", text: "Đã hết hạn" };
        if (now < startDate) return { status: "pending", text: "Chờ kích hoạt" };

        // Logic sắp hết hạn (còn dưới 3 ngày)
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 3 && diffDays >= 0) {
            return { status: "nearly_expired", text: "Sắp hết" };
        }

        return { status: "active", text: "Đang chạy" };
    };

    // Hàm lấy màu badge
    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return "bg-green-100 text-green-700";
            case "nearly_expired": return "bg-yellow-100 text-yellow-700";
            case "expired": return "bg-red-100 text-red-700";
            case "pending": return "bg-blue-100 text-blue-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    // Chuyển đổi dữ liệu thô sang UI (tính toán status)
    const allVouchers = computed<VoucherUI[]>(() => {
        return listVoucher.value.map((v) => {
            const { status, text } = calculateStatus(v.start_date, v.end_date);
            return {
                ...v,
                status,
                statusText: text,
            };
        });
    });

    // --- 4. FILTERING & PAGINATION ---
    const searchTerm = ref("");
    const filterStatus = ref("all");
    const currentPage = ref(1);
    const itemsPerPage = ref<number>(5);

    const updateItemsPerPage = () => {
        const height = window.innerHeight;

        if (height >= 1080) {
            itemsPerPage.value = 9; // Màn hình Full HD trở lên
        } else if (height >= 900) {
            itemsPerPage.value = 6; // Màn hình Desktop thường
        } else if (height >= 700) {
            itemsPerPage.value = 5;  // Màn hình Laptop nhỏ
        } else {
            itemsPerPage.value = 4;  // Tablet hoặc màn hình rất thấp
        }
    };

    onMounted(() => {
        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);
    });

    onUnmounted(() => {
        window.removeEventListener('resize', updateItemsPerPage);
    });

    const filteredVouchers = computed(() => {
        let temp = allVouchers.value;
        const search = searchTerm.value.toLowerCase().trim();

        if (search) {
            temp = temp.filter(
                (v) =>
                v.code.toLowerCase().includes(search) ||
                (v.description && v.description.toLowerCase().includes(search))
            );
        }

        if (filterStatus.value !== "all") {
            temp = temp.filter((v) => v.status === filterStatus.value);
        }

        if (currentPage.value > 1 && temp.length <= itemsPerPage.value * (currentPage.value - 1)) {
            currentPage.value = 1;
        }

        return temp;
    });

    const totalPages = computed(() => Math.ceil(filteredVouchers.value.length / itemsPerPage.value));

    const currentVouchers = computed(() => {
        const start = (currentPage.value - 1) * itemsPerPage.value;
        return filteredVouchers.value.slice(start, start + itemsPerPage.value);
    });

    const changePage = (page: number) => {
        if (page >= 1 && page <= totalPages.value) currentPage.value = page;
    };

    const pageNumbers = computed(() => {
        const pages = [];
        for (let i = 1; i <= totalPages.value; i++) pages.push(i);
        return pages;
    });

    // --- 5. MODAL ACTIONS ---
    const isModalOpen = ref(false);
    const isEditing = ref(false);
    const voucherToEdit = ref<Voucher | null>(null);

    const openCreateModal = () => {
        isEditing.value = false;
        voucherToEdit.value = null;
        isModalOpen.value = true;
    };

    const openEditModal = (voucher: VoucherUI) => {
        isEditing.value = true;
        // Clone object để tránh tham chiếu trực tiếp
        // Chú ý: Cần đảm bảo các trường date là object Date
        voucherToEdit.value = {
            ...voucher,
            start_date: new Date(voucher.start_date),
            end_date: new Date(voucher.end_date)
        };
        isModalOpen.value = true;
    };

    const handleSaveVoucher = async (payload: Voucher, isEditMode: boolean) => {

        if (isEditMode) {

            await useVoucher.updateVoucherStore(payload)
            if (useVoucher.success) {
                const index = allVouchers.value.findIndex(v => v.ID === payload.ID);
                if (index !== -1) {
                    listVoucher.value[index] = payload;
                }

            }
        } else {
            await useVoucher.createVoucherStore(payload)
            if (useVoucher.success) {
                const { status, text } = calculateStatus(payload.start_date, payload.end_date);
                const newVoucherUI = {
                    ...payload,
                    status: status,       // "active" | "pending" | ...
                    statusText: text // "Đang chạy" | ...
                };
                allVouchers.value.push(newVoucherUI);

            }
            currentPage.value = 1;
        }

        // Đóng modal (dù con đã đóng, cha set lại cho chắc chắn đồng bộ)
        isModalOpen.value = false;
    };
</script>

<template>
    <VoucherFormModal
        :model-value="isModalOpen"
        @update:model-value="isModalOpen = $event"
        :is-edit="isEditing"
        :initialVoucher="voucherToEdit"
        @save="handleSaveVoucher"
    />
    <div class="flex h-screen bg-[#F3F4F6] font-sans">
        <Navbar />

        <div class="flex-1 flex flex-col h-screen overflow-hidden">
            <main class="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
                <div class="mb-8 flex justify-between items-end">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-900">🎁 Quản lý Voucher</h2>
                        <p class="text-gray-500 mt-1">
                            Tạo, theo dõi và quản lý các mã giảm giá/khuyến mãi của bạn.
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <button
                            @click="openCreateModal"
                            class="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-700 shadow-md transition-colors"
                        >
                            <i class="fa-solid fa-plus mr-1"></i> Tạo Voucher Mới
                        </button>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="p-6 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
                        <h3 class="font-bold text-lg text-gray-900">Danh sách Voucher</h3>

                        <div class="flex gap-4 flex-wrap sm:flex-nowrap">
                            <input
                                type="text"
                                v-model="searchTerm"
                                @input="currentPage = 1"
                                placeholder="Tìm kiếm mã voucher..."
                                class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-gray-500 focus:border-gray-500 w-full sm:w-60"
                            />
                            <select
                                v-model="filterStatus"
                                @change="currentPage = 1"
                                class="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 outline-none w-full sm:w-auto"
                            >
                                <option value="all">Tất cả trạng thái</option>
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
                                    <th class="px-6 py-4 font-semibold text-center">Trạng thái</th>
                                    <th class="px-6 py-4 font-semibold text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                <tr v-if="filteredVouchers.length === 0">
                                    <td colspan="8" class="px-6 py-8 text-center text-gray-500 text-base">
                                        Không tìm thấy voucher nào phù hợp.
                                    </td>
                                </tr>

                                <tr
                                    v-for="voucher in currentVouchers"
                                    :key="voucher.ID"
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
                                                <span v-if="voucher.max_discount && voucher.max_discount > 0">
                                                    (Tối đa: {{ formatCurrency(voucher.max_discount) }})
                                                </span>
                                            </span>
                                            <span v-else-if="voucher.discount_type === 'FIXED'">
                                                Giảm {{ formatCurrency(voucher.discount_value) }}
                                            </span>
                                        </div>
                                        <div class="text-xs text-gray-500 mt-0.5">
                                            Đơn tối thiểu: {{ formatCurrency(voucher.min_order_value) }}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-500">
                                        {{ formatDate(voucher.start_date) }}
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-500">
                                        {{ formatDate(voucher.end_date) }}
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-700">
                                        {{ voucher.quantity.toLocaleString() }}
                                    </td>
                                    <td class="px-6 py-4 text-sm font-medium text-gray-900">
                                        {{ (voucher.used || 0).toLocaleString() }}
                                        <div class="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                                            <div
                                                class="h-1.5 rounded-full"
                                                :class="{
                                                    'bg-green-500': (voucher.used || 0) / voucher.quantity < 0.8,
                                                    'bg-yellow-500': (voucher.used || 0) / voucher.quantity >= 0.8 && (voucher.used || 0) / voucher.quantity < 1,
                                                    'bg-red-500': (voucher.used || 0) / voucher.quantity >= 1,
                                                }"
                                                :style="{ width: `${Math.min(((voucher.used || 0) / voucher.quantity) * 100, 100)}%` }"
                                            ></div>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        <span
                                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                            :class="getStatusColor(voucher.status || '')"
                                        >
                                            {{ voucher.statusText }}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        <button
                                            @click="openEditModal(voucher)"
                                            class="text-gray-500 hover:text-gray-900 transition-colors mx-1"
                                            title="Chỉnh sửa"
                                        >
                                            <i class="fa-solid fa-pen-to-square"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="p-4 flex justify-between items-center bg-white border-t border-gray-100">
                        <div class="text-sm text-gray-600">
                            Hiển thị {{ (currentPage - 1) * itemsPerPage + 1 }} -
                            {{ Math.min(currentPage * itemsPerPage, filteredVouchers.length) }}
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
                                class="px-3 py-1 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                                :class="{ 'bg-gray-900 text-white font-bold hover:text-white': page === currentPage }"
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