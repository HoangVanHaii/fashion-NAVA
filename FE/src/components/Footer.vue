<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const isMobile = ref<boolean>(false)
// Trạng thái đóng mở của các menu trên mobile
const showIntroduction = ref<boolean>(true) 
const showLink = ref<boolean>(true)
const showPolicy = ref<boolean>(true)

const handleResize = () => {
  const mobile = window.innerWidth <= 880
  if (isMobile.value !== mobile) {
      isMobile.value = mobile
      if (!mobile) {
        showIntroduction.value = true
        showLink.value = true
        showPolicy.value = true
      } else {
        showIntroduction.value = false
        showLink.value = false
        showPolicy.value = false
      }
  }
}

onMounted(() => {
  isMobile.value = window.innerWidth <= 880
  if(isMobile.value) {
      showIntroduction.value = false
      showLink.value = false
      showPolicy.value = false
  }
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

const clickIntroduction = () => {
  if (isMobile.value) showIntroduction.value = !showIntroduction.value
}
const clickLink = () => {
  if (isMobile.value) showLink.value = !showLink.value
}
const clickPolicy = () => {
  if (isMobile.value) showPolicy.value = !showPolicy.value
}
</script>

<template>
    <!-- Reduced vertical padding: pt-10 pb-6 -->
    <footer class="bg-black text-gray-400 text-sm font-sans pt-10 pb-6 border-t border-gray-100 mt-[20px]">
        <div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            
            <!-- Newsletter Section -->
            <!-- Reduced spacing: pb-6 mb-8 gap-6 -->
            <div class="flex flex-col md:flex-row items-center justify-between border-b border-gray-800 pb-6 mb-8 gap-6">
                <div class="text-center md:text-left flex-1">
                    <h3 class="text-white text-xl font-bold mb-1 uppercase tracking-wider">Đăng ký nhận tin</h3>
                    <p class="text-xs text-gray-500">Nhận thông tin cập nhật mới nhất và ưu đãi độc quyền.</p>
                </div>
                
                <div class="w-full md:w-auto flex-1 max-w-lg">
                    <div class="flex relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i class="fa-solid fa-envelope text-gray-500"></i>
                        </div>
                        <!-- Reduced height: py-3 -->
                        <input 
                            type="email" 
                            placeholder="Nhập địa chỉ Email của bạn" 
                            class="w-full pl-10 pr-28 py-3 bg-gray-900 border border-gray-800 text-white rounded-full focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all placeholder-gray-600 text-sm"
                        >
                        <button class="absolute top-1 right-1 bg-white text-black hover:bg-gray-200 font-bold py-2 px-5 rounded-full transition-colors text-xs">
                            Đăng ký
                        </button>
                    </div>
                </div>

                <div class="flex gap-3 flex-1 justify-end">
                    <a href="#" class="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300">
                        <i class="fa-brands fa-facebook-f text-xs"></i>
                    </a>
                    <a href="#" class="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300">
                        <i class="fa-brands fa-instagram text-xs"></i>
                    </a>
                    <a href="#" class="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300">
                        <i class="fa-brands fa-tiktok text-xs"></i>
                    </a>
                </div>
            </div>

            <!-- Main Content Grid -->
            <!-- Reduced gap and bottom margin: mb-8 -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                
                <!-- Column 1: About NAVA -->
                <div class="space-y-4">
                    <h4 class="text-white text-base font-bold uppercase tracking-wide mb-2">Về NAVA</h4>
                    <p class="leading-relaxed text-gray-500 text-xs">
                        CÔNG TY CỔ PHẦN TẬP ĐOÀN NAVA<br>
                        Mã số doanh nghiệp: 0102196094<br>
                        Cấp ngày 30/03/2007 tại TP.HCM<br>
                        Đại diện pháp luật: Nguyễn Trọng Phi.
                    </p>
                    <div class="space-y-2 pt-1">
                        <div class="flex items-start gap-2 group">
                            <i class="fa-solid fa-location-dot mt-1 text-gray-600 group-hover:text-white transition-colors text-xs"></i>
                            <span class="group-hover:text-white transition-colors text-xs">Tầng 8, Lô 3, 04-3A, KCN Hoàng Mai, Hà Nội</span>
                        </div>
                        <div class="flex items-center gap-2 group">
                            <i class="fa-solid fa-phone text-gray-600 group-hover:text-white transition-colors text-xs"></i>
                            <span class="group-hover:text-white transition-colors font-mono text-xs">0348 177 549</span>
                        </div>
                        <div class="flex items-center gap-2 group">
                            <i class="fa-solid fa-envelope text-gray-600 group-hover:text-white transition-colors text-xs"></i>
                            <span class="group-hover:text-white transition-colors text-xs">support@nava.com</span>
                        </div>
                    </div>
                </div>

                <!-- Column 2: Introduction -->
                <div class="border-b border-gray-800 lg:border-none pb-3 lg:pb-0 lg:pl-8 flex flex-col items-center">
                    <div 
                        class="flex justify-between items-center mb-3 cursor-pointer lg:cursor-default group"
                        @click="clickIntroduction()"
                    >
                        <h4 class="text-white text-base font-bold uppercase tracking-wide">Giới thiệu</h4>
                        <i class="fa-solid fa-chevron-down lg:hidden transition-transform duration-300 text-xs" :class="{ 'rotate-180': showIntroduction }"></i>
                    </div>
                    <div v-show="showIntroduction" class="transition-all duration-300">
                        <p class="leading-relaxed text-gray-500 text-xs">
                            NAVA mang đến phong cách thời trang hiện đại, tối giản nhưng đầy tinh tế. Chúng tôi cam kết chất lượng sản phẩm và dịch vụ khách hàng tuyệt vời nhất.
                        </p>
                        <img src="../assets/logo.jpg" class="mt-3 h-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500" alt="NAVA Logo">
                    </div>
                </div>

                <!-- Column 3: Links -->
                <div class="border-b border-gray-800 lg:border-none pb-3 lg:pb-0 lg:pl-8 flex flex-col items-center">
                    <div 
                        class="flex justify-between items-center mb-3 cursor-pointer lg:cursor-default group"
                        @click="clickLink()"
                    >
                        <h4 class="text-white text-base font-bold uppercase tracking-wide">Liên kết</h4>
                        <i class="fa-solid fa-chevron-down lg:hidden transition-transform duration-300 text-xs" :class="{ 'rotate-180': showLink }"></i>
                    </div>
                    <!-- Reduced spacing: space-y-2 -->
                    <ul v-show="showLink" class="space-y-2 transition-all duration-300 text-xs">
                        <li v-for="item in ['Sản phẩm mới', 'Thời trang Nam', 'Thời trang Nữ', 'Phụ kiện', 'SALE Off']" :key="item">
                            <a href="#" class="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">{{ item }}</a>
                        </li>
                    </ul>
                </div>

                <!-- Column 4: Policies -->
                <div class="border-b border-gray-800 lg:border-none pb-3 lg:pb-0 lg:pl-8 flex flex-col items-center">
                    <div 
                        class="flex justify-between items-center mb-3 cursor-pointer lg:cursor-default group"
                        @click="clickPolicy()"
                    >
                        <h4 class="text-white text-base font-bold uppercase tracking-wide">Chính sách</h4>
                        <i class="fa-solid fa-chevron-down lg:hidden transition-transform duration-300 text-xs" :class="{ 'rotate-180': showPolicy }"></i>
                    </div>
                    <ul v-show="showPolicy" class="space-y-2 transition-all duration-300 text-xs">
                        <li v-for="item in ['Hướng dẫn mua hàng', 'Chính sách đổi trả', 'Chính sách bảo mật', 'Điều khoản dịch vụ', 'Kiểm tra đơn hàng']" :key="item">
                            <a href="#" class="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block">{{ item }}</a>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Bottom: Payments & Copyright -->
            <!-- Reduced padding: pt-6 -->
            <div class="pt-6 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <p class="text-gray-600 text-[10px] uppercase tracking-wide">© 2024 NAVA Studio. All rights reserved.</p>
                
                <div class="flex items-center gap-3">
                    <!-- Payment Icons (Grayscale to hover Color) -->
                     Thanh toán 
                    <div class="flex gap-2">
                        <img src="../assets/vnpay.png" class="h-5 w-auto opacity-50 grayscale grayscale-0 hover:opacity-100 transition-all cursor-pointer bg-white rounded px-1" />
                        <img src="../assets/momo.png" class="h-5 w-auto opacity-50 grayscale grayscale-0 hover:opacity-100 transition-all cursor-pointer bg-white rounded px-1" />
                        <img src="../assets/credit_card.jpg" class="h-5 w-auto opacity-50 grayscale grayscale-0 hover:opacity-100 transition-all cursor-pointer bg-white rounded px-1" />
                        <img src="../assets/paypal.png" class="h-5 w-auto opacity-50 grayscale grayscale-0 hover:opacity-100 transition-all cursor-pointer bg-white rounded px-1" />
                    </div>
                </div>
            </div>
        </div>
    </footer>
</template>

<style scoped>
/* No custom CSS needed - All handled by Tailwind */
</style>

<!-- Global Styles for Scrollbar -->
<style>
/* Tùy chỉnh thanh cuộn toàn trang */
::-webkit-scrollbar {
    width: 6px; /* Độ rộng dọc */
    height: 6px; /* Độ cao ngang */
}

::-webkit-scrollbar-track {
    background: transparent; /* Nền trong suốt hoặc màu rất nhạt */
}

::-webkit-scrollbar-thumb {
    background-color: #d1d5db; /* Màu xám nhạt (gray-300) */
    border-radius: 10px; /* Bo tròn */
    transition: background-color 0.2s;
}

::-webkit-scrollbar-thumb:hover {
    background-color: #9ca3af; /* Đậm hơn khi di chuột (gray-400) */
}
</style>