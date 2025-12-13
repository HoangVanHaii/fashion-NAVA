import { createRouter, createWebHistory } from 'vue-router'
import HomeAdmin from '@/views/admin/Home.vue'
import VoucherManagement from '@/views/admin/VoucherManagement.vue';
import FlashSaleManagement from '@/views/admin/FlashSaleManagement.vue';
import UserManagement from '@/views/admin/UserManagement.vue';
import ProductManagement from '@/views/admin/ProductManagement.vue';
import Home from '@/views/home.vue';
import DealHot from '@/views/DealHot.vue';
import CategoryGender from '@/views/CategoryGender.vue';

const routes = [
    { path: '/', redirect: 'admin/home' },
    { path: '/home', name: 'Home', component: Home },
    { path: '/deal-hot', name: 'DealHot', component: DealHot },
    { path: '/category-gender', name: 'CategoryGender', component: CategoryGender },
    { path: '/admin/home', name: 'HomeAdmin', component: HomeAdmin },
    { path: '/admin/product-management', name: 'ProductAdmin', component: ProductManagement },
    { path: '/admin/voucher-management', name: 'VoucherAdmin', component: VoucherManagement },
    { path: '/admin/user-management', name: 'UserAdmin', component: UserManagement },
    { path: '/admin/flashsale-management', name: 'FlashSaleAdmin', component: FlashSaleManagement },

]
const router = createRouter({ history: createWebHistory(), routes });

export default router
