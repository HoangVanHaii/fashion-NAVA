import { createRouter, createWebHistory } from 'vue-router'
import OrderEmployee from '@/views/Employee/Order.vue';
import Auth from '../views/Auth.vue';
import Profile from '@/views/Profile.vue';
import Address from '@/views/Address.vue';
import Order from '@/views/Order.vue';
import Favourite from '@/views/Favourite.vue';
import ProductDetail from '@/views/ProductDetail.vue';
import HomeEmployee from '@/views/Employee/Home.vue';
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

import HomeView from '../components/ReviewModal.vue'
import OrderTest from '../views/OrderTest.vue'
import ReviewDashboard from '../views/ReviewDashboard.vue'
import ProductReviewDetail from '../views/ProductReviewDetail.vue'
import Cart from '../views/Cart.vue'
import Payment from '../views/Payment.vue'
import ProductView from '@/views/Employee/ProductView.vue';
import FlashSale from '@/views/Employee/FlashSale.vue';
import VoucherView from '@/views/Employee/VoucherView.vue';
import OrderAdmin from '@/views/admin/OrderAdmin.vue';
import ReviewAdmin from '@/views/admin/ReviewAdmin.vue';
import MyVoucher from '@/views/MyVoucher.vue';
import MyNotification from '@/views/MyNotification.vue';

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/employee/order', name: 'order-employee', component: OrderEmployee },
  { path: '/auth/login', name: 'login', component: Auth },
  { path: '/auth/register', name: 'register-sendOTP', component: Auth },
  { path: '/profile/me', name: 'profile', component: Profile },
  { path: '/profile/address', name: 'address', component: Address },
  { path: '/profile/orderOfme', name: 'order-of-me', component: Order },
  { path: '/profile/favouriteOfme', name: 'favourite', component: Favourite },
  { path: '/profile/voucherOfme', name: 'voucher-of-me', component: MyVoucher },
  { path: '/profile/notificationOfme', name: 'notification-of-me', component: MyNotification },
  { path: '/product/:id', name: 'product-detail', component: ProductDetail },
  { path: '/orderSuccess', name: 'OrderSuccess', component: OrderSuccess },
  { path: '/orderFailed', name: 'OrderFailed', component: OrderFailed },

  { path: '/Employee/home', name: 'home-employee', component: HomeEmployee },
  { path: '/Employee/home/product', name: 'ProductEmployee', component: ProductView },
  { path: '/Employee/flash-sale', name: 'flashsaleEmployee', component: FlashSale },
  { path: '/Employee/voucher', name: 'voucherEmployee', component: VoucherView },

  
  { path: '/home', name: 'Home', component: Home },
  { path: '/deal-hot', name: 'DealHot', component: DealHot },
  { path: '/category-gender', name: 'CategoryGender', component: CategoryGender },
  { path: '/admin/home', name: 'HomeAdmin', component: HomeAdmin },
  { path: '/admin/product-management', name: 'ProductAdmin', component: ProductManagement },
  { path: '/admin/voucher-management', name: 'VoucherAdmin', component: VoucherManagement },
  { path: '/admin/user-management', name: 'UserAdmin', component: UserManagement },
  { path: '/admin/flashsale-management', name: 'FlashSaleAdmin', component: FlashSaleManagement },
  { path: '/admin/order-view', name: 'OrderAdmin', component: OrderAdmin },
  { path: '/admin/review', name: 'ReviewAdmin', component: ReviewAdmin },

  
  { path: '/create-review', name: 'createeviewEmployee', component: HomeView },
  { path: '/test-review', name: 'test-review', component: OrderTest },
  { path: '/dash_board', name: 'dash_board', component: ReviewDashboard },
  { path: '/cart', name: 'cart', component: Cart },
  { path: '/payment', name: 'payment', component: Payment, meta: { requiresAuth: true } },
  { path: '/dashboard/reviews/product/:product_id', name: 'ProductReviewDetail', component: ProductReviewDetail }
    // props: route => ({
    //   product_id: route.params.product_id,
    //   branch: route.query.branch
    // })
  // },

]
const router = createRouter({ history: createWebHistory(), routes });

export default router
