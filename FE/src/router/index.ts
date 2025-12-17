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
import Forbidden from '@/views/Forbidden.vue';
import { useAuthStore } from '@/stores/auth';
import NotFound from '@/views/NotFound.vue';

const routes = [
  { path: '/', redirect: '/home' },
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
  
  { path: '/Employee/order', name: 'order-employee', component: OrderEmployee, meta: { requiresAuth: true, allowedRoles: ['employee'] } },
  { path: '/Employee/home', name: 'home-employee', component: HomeEmployee, meta: { requiresAuth: true, allowedRoles: ['employee']} },
  { path: '/Employee/home/product', name: 'ProductEmployee', component: ProductView, meta: { requiresAuth: true, allowedRoles: ['employee'] } },
  { path: '/Employee/flash-sale', name: 'flashsaleEmployee', component: FlashSale, meta: { requiresAuth: true, allowedRoles: ['employee'] } },
  { path: '/Employee/voucher', name: 'voucherEmployee', component: VoucherView, meta: { requiresAuth: true, allowedRoles: ['employee'] } },
  { path: '/Employee/review', name: 'reviewEmployee', component: ReviewDashboard },

  
  { path: '/home', name: 'Home', component: Home },
  { path: '/deal-hot', name: 'DealHot', component: DealHot },
  { path: '/category-gender', name: 'CategoryGender', component: CategoryGender },

  { path: '/admin/home', name: 'HomeAdmin', component: HomeAdmin, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/admin/product-management', name: 'ProductAdmin', component: ProductManagement, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/admin/voucher-management', name: 'VoucherAdmin', component: VoucherManagement, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/admin/user-management', name: 'UserAdmin', component: UserManagement, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/admin/flashsale-management', name: 'FlashSaleAdmin', component: FlashSaleManagement, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/admin/order-view', name: 'OrderAdmin', component: OrderAdmin, meta: { requiresAuth: true, allowedRoles: ['admin'] } },
  { path: '/admin/review', name: 'ReviewAdmin', component: ReviewAdmin, meta: { requiresAuth: true, allowedRoles: ['admin'] } },

  
  { path: '/create-review', name: 'createeviewEmployee', component: HomeView },
  { path: '/test-review', name: 'test-review', component: OrderTest },
  { path: '/cart', name: 'cart', component: Cart },
  { path: '/payment', name: 'payment', component: Payment, meta: { requiresAuth: true } },
  { path: '/dashboard/reviews/product/:product_id', name: 'ProductReviewDetail', component: ProductReviewDetail },
    // props: route => ({
    //   product_id: route.params.product_id,
    //   branch: route.query.branch
    // })
  // },
  { path: '/403', name: 'Forbidden', component: Forbidden },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound},

]
const router = createRouter({ history: createWebHistory(), routes });

// --- PHẦN QUAN TRỌNG NHẤT: KIỂM TRA QUYỀN ---
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // 1. Nếu chưa có user trong store nhưng có token trong localStorage (trường hợp F5 lại trang)
  // Hãy gọi hàm lấy profile để cập nhật lại state user
  if (!authStore.user && localStorage.getItem('accessToken')) {
    try {
      await authStore.getProfileStore();
    } catch (e) {
      // Token hết hạn hoặc lỗi -> về login
      return next({ name: 'login' });
    }
  }

  // 2. Kiểm tra nếu route yêu cầu đăng nhập
  if (to.meta.requiresAuth) {
    // Nếu chưa đăng nhập -> đá về Login
    if (!authStore.user) {
      return next({ name: 'login' });
    }

    // 3. Kiểm tra Role (Phân quyền)
    const allowedRoles = to.meta.allowedRoles as string[] | undefined;
    if (allowedRoles) {
      // Nếu role của user hiện tại KHÔNG nằm trong danh sách cho phép
      // Ví dụ: user.role là 'user', nhưng allowedRoles là ['employee', 'admin']
      if (!allowedRoles.includes(authStore.user.role)) {
        // Chặn lại và chuyển hướng
        return next({ name: 'Forbidden' });
      }
    }
  }

  // Nếu thỏa mãn mọi điều kiện -> Cho phép đi tiếp
  next();
});

export default router;
