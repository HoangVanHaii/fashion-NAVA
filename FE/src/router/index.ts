import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../components/ReviewModal.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },

    {
      path: '/test-review',
      name: 'test-review',
      component: () => import('../views/OrderTest.vue')
    },
    {
      path: '/dash_board',
      name: 'dash_board',
      component: () => import('../views/ReviewDashboard.vue')
    },
    {
        path: '/dashboard/reviews/product/:product_id',
        name: 'ProductReviewDetail',
        component: () => import('../views/ProductReviewDetail.vue'), // Trỏ đến file bạn vừa tạo
        props: (route) => ({ 
            product_id: route.params.product_id,
            branch: route.query.branch 
        })
    },
    {
      path: '/cart',
      name: 'cart',
      component: () => import('../views/Cart.vue'), 
      // meta: {
      //   title: 'Giỏ hàng của bạn',
      //   requiresAuth: true 
      // }
    },
    {
      path: '/payment',
      name: 'payment',
      component: () => import('../views/Payment.vue'),
      meta: { requiresAuth: true }
    },
  ],
})

export default router
