import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { getOrderOfBranch, changeStatus, createOrderByEmployee, getStatistical, getDailyOrderComparison, getProductBySize, getOrderById, getTopOrderOfBranch, getDailyOrderComparisonForAdmin, getTotalOrderComparisonForAdmin, getTotalOrderCancelledForAdmin, getTotalOrderMonthForAdmin } from "@/services/employee/order";
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
            listOrder.value = data.data;
            console.log(listOrder.value[0])
            return data;
        } catch (err) {
            console.error(err);
            error.value = "Không thể tải danh sách đơn hàng";
        } finally {
            loading.value = false;
        }
    };
    const getTopOrderOfBranchStore = async (top: number) => {
        loading.value = true;
        error.value = null;
        try {
            const res = await getTopOrderOfBranch(top);
            return res.orders;
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
    const getDailyOrderComparisonForAdminStore = async (type: string) => {
        loading.value = true;
        try {
            const result = await getDailyOrderComparisonForAdmin(type);
            console.log(result);
            return result.results
        } catch (err: any) {
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    const getTotalOrderComparisonForAdminStore = async (type: string) => {
        loading.value = true;
        try {
            const result = await getTotalOrderComparisonForAdmin(type);
            console.log(result);
            return result.results
        } catch (err: any) {
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    const getTotalOrderMonthForAdminStore = async (year: string) => {
        loading.value = true;
        try {
            const result = await getTotalOrderMonthForAdmin(year);
            return result
        } catch (err: any) {
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
    const getTotalOrderCancelledForAdminStore = async (type: string) => {
        loading.value = true;
        try {
            const result = await getTotalOrderCancelledForAdmin(type);
            console.log(result);
            return result.results
        } catch (err: any) {
            console.log(err);
        } finally {
            loading.value = false;
        }
    }
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
            console.log(result);
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
            listOrder.value = data.data;
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


        getDailyOrderComparisonForAdminStore,
        getTotalOrderComparisonForAdminStore,
        getTotalOrderCancelledForAdminStore,
        getTotalOrderMonthForAdminStore
    };
});
