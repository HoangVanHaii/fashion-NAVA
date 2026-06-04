import api from "../api";

export const getOrderOfBranch = async (method_order: string) => {
    const response = await api.get(`/employee/order/orderOfBranch/${method_order}`);
    return response.data;
};
export const getOrderOfTypeBranch = async (method_order: string) => {
    const response = await api.get(`/employee/order/orderOfTypeBranch`, {
        params: {
            method: method_order
        }
    });
    return response.data;
};
export const getOrderById = async (order_id: number) => {
    const response = await api.get(`/order/${order_id}`);
    return response.data;
};
export const getOrderByIdForAdmin = async (order_id: number) => {
    const response = await api.get(`/order/admin/${order_id}`);
    return response.data;
};
export const getProductBySize = async (size_id: string) => {
    const response = await api.get(`/product/getBySize/${size_id}`);
    return response.data;
};
export const getStatistical = async () => {
    const response = await api.get(`/employee/order/statistical`);
    return response.data;
};
export const getDailyOrderComparison = async (type: string) => {
    const response = await api.get(`/employee/order/daily-comparison/${type}`);
    return response.data;
};
export const getDailyOrderComparisonForAdmin = async (type: string) => {
    const response = await api.get(`/employee/order/dashboard/daily-comparison/${type}`);
    return response.data;
};
export const getTotalOrderComparisonForAdmin = async (type: string) => {
    const response = await api.get(`/employee/order/total/daily-comparison/${type}`);
    return response.data;
};
export const getTotalOrderCancelledForAdmin = async (type: string) => {
    const response = await api.get(`/employee/order/total-cancelled/daily-comparison/${type}`);
    return response.data;
};
export const getTotalOrderMonthForAdmin = async (year: string) => {
    const response = await api.get(`/employee/order/total-month/${year}`);
    return response.data;
};
export const getTopOrder = async (top: number) => {
    const response = await api.get(`/employee/order/topOrder/${top}`);
    return response.data;
};
export const changeStatus = async (order_id: number, status: string) => {
    const response = await api.put(`/employee/order/changeStatus`, {
        order_id,
        status
    });
    return response.data;
};
export const createOrderByEmployee = async (orderItems: any) => {
    const response = await api.post(`/employee/order/createOrderByEmployee`, {
        orderItems: orderItems
    });
    return response.data;
};
