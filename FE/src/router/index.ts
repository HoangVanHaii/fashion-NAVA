import { createRouter, createWebHistory } from 'vue-router'
import OrderEmployee from '@/views/Employee/Order.vue';
import Auth from '../views/Auth.vue';
import Profile from '@/views/Profile.vue';
import Address from '@/views/Address.vue';
import Order from '@/views/Order.vue';
import Favourite from '@/views/Favourite.vue';
import ProductDetail from '@/views/ProductDetail.vue';
import HomeEmployee from '@/components/Employee/Home.vue';
import OrderSuccess from '@/views/OrderSuccess.vue';
import OrderFailed from '@/views/OrderFailed.vue';

import HomeAdmin from '@/views/admin/Home.vue'
import VoucherManagement from '@/views/admin/VoucherManagement.vue';
import FlashSaleManagement from '@/views/admin/FlashSaleManagement.vue';
import UserManagement from '@/views/admin/UserManagement.vue';
import ProductManagement from '@/views/admin/ProductManagement.vue';
import Home from '@/views/Home.vue';
import DealHot from '@/views/DealHot.vue';
import CategoryGender from '@/views/CategoryGender.vue';

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/employee/order', name: 'order-employee', component: OrderEmployee },
  { path: '/auth/login', name: 'login', component: Auth },
  { path: '/auth/register', name: 'register-sendOTP', component: Auth },
  { path: '/profile/me', name: 'profile', component: Profile },
  { path: '/profile/address', name: 'address', component: Address },
  { path: '/profile/orderOfme', name: 'order-of-me', component: Order },
  { path: '/profile/favouriteOfme', name: 'favourite', component: Favourite },
  { path: '/product/:id', name: 'product-detail', component: ProductDetail },
  { path: '/orderSuccess', name: 'OrderSuccess', component: OrderSuccess },
  { path: '/orderFailed', name: 'OrderFailed', component: OrderFailed },

  { path: '/Employee/home', name: 'home-employee', component: HomeEmployee },
  
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
