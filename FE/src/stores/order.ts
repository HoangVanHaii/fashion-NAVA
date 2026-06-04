import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { getOrderOfBranch, getOrderOfTypeBranch, changeStatus, createOrderByEmployee, getStatistical, getDailyOrderComparison, getProductBySize, getOrderById, getTopOrder, getDailyOrderComparisonForAdmin, getTotalOrderComparisonForAdmin, getTotalOrderCancelledForAdmin, getTotalOrderMonthForAdmin, getOrderByIdForAdmin } from "@/services/employee/order";
import { type RevenueOrder, type GetOrder, type StatisticalOrder } from "@/interfaces/order";
import type { IProductMongoDetail } from "@/interfaces/product";
import { getOrderOfMe } from "@/services/order";

export const useOrderEmployeeStore = defineStore("orderEmployee", () => {
    const listOrder = ref<GetOrder[]>([]);
    const orderDetail = ref<GetOrder | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const success = ref<string | null>(null);

    const searchText = ref<string>("");
    const selectedStatus = ref<string>("Tất cả");
    const statistical = ref<StatisticalOrder | null>(null)
    const revenueOrder = ref<RevenueOrder | null>(null);
    const sortOrdersByCreatedAt = (orders: GetOrder[]): GetOrder[] => {
        return orders.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        });
    };
    const reverseStatusMap: Record<string, string> = {
        "Tất cả": "all",
        "Chờ xác nhận": "pending",
        "Chờ lấy hàng": "confirmed",
        "Đang giao hàng": "shipped",
        "Hoàn thành": "completed",
        "Đã hủy": "cancelled",
    };
    const getOrderOfBranchStore = async (method_order: string) => {
        loading.value = true;
        error.value = null;
        try {
            const data = await getOrderOfBranch(method_order);
            listOrder.value = sortOrdersByCreatedAt(data.data);
            return data;
        } catch (err) {
            console.error(err);
            error.value = "Không thể tải danh sách đơn hàng";
        } finally {
            loading.value = false;
        }
    };
    const getOrderOfTypeBranchStore = async (method_order: string) => {
        loading.value = true;
        error.value = null;
        try {
            const data = await getOrderOfTypeBranch(method_order);
            listOrder.value = sortOrdersByCreatedAt(data.data);
            return data;
        } catch (err) {
            console.error(err);
            error.value = "Không thể tải danh sách đơn hàng";
        } finally {
            loading.value = false;
        }
    };
    
    const filteredOrderByStatus = computed(() => {
        const statusKey = reverseStatusMap[selectedStatus.value];
        if (statusKey === "all") return listOrder.value;
        return listOrder.value.filter((o) => o.status === statusKey);
    });

    const normalizeText = (str: any) =>
        String(str ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();


    const filteredOrder = computed(() => {
        const keyword = normalizeText(searchText.value);
        const orders = filteredOrderByStatus.value;

        if (!keyword) return orders;

        if (/^\d+$/.test(keyword)) {
            return orders.filter(order =>
                order.id.includes(keyword)
            );
        }
        return orders.filter(order => {
            return order.items.some(item =>
                normalizeText(item.product_name).includes(keyword)
            );
        });
    });


    const resetFilter = () => {
        searchText.value = "";
        selectedStatus.value = "Tất cả";
    };

    const changeStatusStore = async (order_id: string, status: string) => {
        error.value = null;
        loading.value = true;
        try {
            await changeStatus(order_id, status);
            listOrder.value = listOrder.value.map((o) =>
                o.id === order_id ? { ...o, status: status as GetOrder['status'] } : o
            );
           if (orderDetail.value) {
            orderDetail.value.status = status as GetOrder['status'];
        }
            success.value = "Cập nhập đơn hàng thành công!"
        } catch (err: any) {
            error.value = err.message || "Không thể cập đơn hàng";
        } finally {
            loading.value = false;
        }
    }
    const getStatisticalStore = async () => {
        loading.value = true;
        try {
            const result = await getStatistical();
            statistical.value = result.data;
        } catch (err: any) {
            loading.value = false;
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    const getDailyOrderComparisonStore = async (type: string) => {
        loading.value = true;
        try {
            const result = await getDailyOrderComparison(type);
            revenueOrder.value = result.data;
        } catch (err: any) {
            loading.value = false;
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    // 1. Daily Order Comparison
    const getDailyOrderComparisonForAdminStore = async (type: string) => {
        loading.value = true;
        try {
            const result = await getDailyOrderComparisonForAdmin(type);
            return result.results;
        } catch (err: any) {
            console.error(err);
        } finally {
            loading.value = false;
        }
    };

    // 2. Total Order Comparison
    const getTotalOrderComparisonForAdminStore = async (type: string) => {
        loading.value = true;
        try {
            const result = await getTotalOrderComparisonForAdmin(type);
            return result.results;
        } catch (err: any) {
            console.error(err);
        } finally {
            loading.value = false;
        }
    };

    // 3. Revenue Month
    const getTotalOrderMonthForAdminStore = async (year: string, branch_code: string) => {
        loading.value = true;
        try {
            const result = await getTotalOrderMonthForAdmin(year);
            return result; // result ở đây là { year: ..., monthlyRevenue: [...] }
        } catch (err: any) {
            console.error(err);
        } finally {
            loading.value = false;
        }
    };

    // 4. Cancelled Order
    const getTotalOrderCancelledForAdminStore = async (type: string) => {
        loading.value = true;
        try {
            const result = await getTotalOrderCancelledForAdmin(type);
            return result.results;
        } catch (err: any) {
            console.error(err);
        } finally {
            loading.value = false;
        }
    };

    // 5. Top Orders
    const getTopOrderOfBranchStore = async (top: number) => {
        loading.value = true;
        try {
            const result = await getTopOrder(top);
            return result.orders; // Trả về mảng orders
        } catch (err: any) {
            console.error(err);
            return [];
        } finally {
            loading.value = false;
        }
    };
    const getProductBySizeStore = async (size_id: string) => {
        loading.value = true;
        try {
            const result = await getProductBySize(size_id);
            return result.product as IProductMongoDetail;
        } catch (err: any) {
            console.log(err);
            loading.value = false;
        } finally {
            loading.value = false;
        }
    }
    const createOrderByEmployeeStore = async (orderItems: any) => {
        loading.value = true;
        try {
            await createOrderByEmployee(orderItems);
        } catch (err: any) {
            loading.value = false;
            console.log(err);
        } finally {
            loading.value = false;
        }
    } 
    const getOrderByIdStore = async (order_id: string) => {
        loading.value = true;
        try {
            const result = await getOrderById(order_id);
            orderDetail.value = result.data;
        } catch (err: any) {
            console.log(err);
        } finally {
            loading.value = false;
        }
    } 
    const getOrderByIdForAdminStore = async (order_id: string) => {
        loading.value = true;
        try {
            const result = await getOrderByIdForAdmin(order_id);
            orderDetail.value = result.data;
        } catch (err: any) {
            console.log(err);
        } finally {
            loading.value = false;
        }
    } 

    const getOrderOfMeStore = async () => {
        loading.value = true;
        error.value = null;
        try {
            const data = await getOrderOfMe();
            listOrder.value = sortOrdersByCreatedAt(data.data);
            return data;
        } catch (err) {
            console.error(err);
            error.value = "Không thể tải danh sách đơn hàng";
        } finally {
            loading.value = false;
        }
    };
    return {
        listOrder,
        loading,
        error,
        success,
        searchText,
        selectedStatus,
        filteredOrder,
        getOrderOfBranchStore,
        getOrderOfTypeBranchStore,
        resetFilter,
        changeStatusStore,
        getStatisticalStore,
        statistical,
        getDailyOrderComparisonStore,
        revenueOrder,
        getProductBySizeStore,
        createOrderByEmployeeStore,
        orderDetail,
        getOrderByIdStore,
        getOrderOfMeStore,
        getTopOrderOfBranchStore,
        getOrderByIdForAdminStore,


        getDailyOrderComparisonForAdminStore,
        getTotalOrderComparisonForAdminStore,
        getTotalOrderCancelledForAdminStore,
        getTotalOrderMonthForAdminStore
    };
});
