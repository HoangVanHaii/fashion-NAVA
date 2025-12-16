<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import type { Ref } from "vue";
import { getImage } from "../utils/format";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";

const userStore = useAuthStore();
const props = defineProps<{
  showMenu: boolean;
  showDetail: boolean;
  showNotification: boolean;
  showOrder: boolean;
  showVoucher: boolean;
  showFavourite: boolean;
  showRegisterSeller: boolean;
  showProfile: boolean;
  showAddress: boolean;
  showResetPassword: boolean;
}>();

const showMenu = ref<boolean>(props.showMenu);
const router = useRouter();
const auth = useAuthStore();
const showDetail = ref<boolean>(props.showDetail);
const showNotification = ref<boolean>(props.showNotification);
const showOrder = ref<boolean>(props.showOrder);
const showVoucher = ref<boolean>(props.showVoucher);
const showFavourite = ref<boolean>(props.showFavourite);
const showRegisterSeller = ref<boolean>(props.showRegisterSeller);

const showProfile = ref<boolean>(props.showProfile);
const showAddress = ref<boolean>(props.showAddress);
const showResetPassword = ref<boolean>(props.showResetPassword);
const avatar = ref<string>('');
onMounted(async () => {
  avatar.value = localStorage.getItem('avatar') || '';
  await userStore.getProfileStore();
  window.addEventListener("resize", handleResize);
  handleResize();
});

const handleResize = () => {
  if (window.innerWidth > 1024) {
    showMenu.value = true;
  } else {
    showMenu.value = false;
  }
};

const reset = (
  a: Ref<boolean>,
  b: Ref<boolean>,
  c: Ref<boolean>,
  d: Ref<boolean>,
  f: Ref<boolean>,
  e: Ref<boolean>,
  k: Ref<boolean>,
  g: Ref<boolean>,
  h: Ref<boolean>
) => {
  a.value = false;
  b.value = false;
  c.value = false;
  d.value = false;
  f.value = false;
  e.value = !e.value;
  k.value = false;
  h.value = false;
  g.value = false;
};

const goToAccount = () => {
  showDetail.value = !showDetail.value;
};
const goToFavourite = () => {
  reset(
    showDetail,
    showOrder,
    showVoucher,
    showRegisterSeller,
    showNotification,
    showFavourite,
    showProfile,
    showAddress,
    showResetPassword
  );
  router.push({ name: "favourite" });
};
const goToVoucher = () => {
  reset(
    showDetail,
    showFavourite,
    showOrder,
    showRegisterSeller,
    showNotification,
    showVoucher,
    showProfile,
    showAddress,
    showResetPassword
  );
    router.push({ name: "voucher-of-me" });

};
const goToRegisterSeller = () => {
  reset(
    showDetail,
    showFavourite,
    showOrder,
    showVoucher,
    showNotification,
    showRegisterSeller,
    showProfile,
    showAddress,
    showResetPassword
  );

};
const goToNotification = () => {
  reset(
    showDetail,
    showFavourite,
    showOrder,
    showVoucher,
    showRegisterSeller,
    showNotification,
    showProfile,
    showAddress,
    showResetPassword
  );
    router.push({ name: "notification-of-me" });

};
const goToOrder = () => {
  reset(
    showDetail,
    showFavourite,
    showVoucher,
    showRegisterSeller,
    showNotification,
    showOrder,
    showProfile,
    showAddress,
    showResetPassword
  );
  router.push({ name: "order-of-me" });
};
const goToProfile = () => {
  reset(
    showOrder,
    showFavourite,
    showVoucher,
    showRegisterSeller,
    showNotification,
    showProfile,
    showOrder,
    showAddress,
    showResetPassword
    );
    showDetail.value = true;
  router.push({ name: "profile" });
};
const goToAddress = () => {
  reset(
    showOrder,
    showFavourite,
    showVoucher,
    showRegisterSeller,
    showNotification,
    showAddress,
    showProfile,
    showOrder,
    showResetPassword
  );
   router.push({ name: "address" });
    showDetail.value = true;
};
const goToResetPass = () => {
  reset(
    showOrder,
    showFavourite,
    showVoucher,
    showRegisterSeller,
    showNotification,
    showResetPassword,
    showAddress,
    showProfile,
    showOrder
  );
  router.push({ name: "changePassword" });
    showDetail.value = true;
};
const emit = defineEmits(["update:show-menu"]);

const handleShow = () => {
  showMenu.value = !showMenu.value;
  emit("update:show-menu", showMenu.value);
};

</script>

<template>
  <!-- Mobile Toggle Button (Floating) -->
  <div 
    class="lg:hidden fixed top-28 left-4 z-40 bg-white text-black px-4 py-2.5 rounded-full shadow-lg cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-all active:scale-95"
    @click="handleShow"
  >
    >
  </div>

  <!-- Backdrop for Mobile -->
  <div 
    v-if="showMenu" 
    class="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
    @click="handleShow"
  ></div>

  <!-- Sidebar Container -->
  <aside 
    class="fixed lg:static top-0 left-0 h-screen lg:h-auto lg:min-h-[600px] z-50 w-[280px] bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 ease-in-out transform shadow-2xl lg:shadow-none pt-[100px] lg:pt-0"
    :class="showMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <!-- Profile Section (Compact Style - Fixed Flex) -->
    <div class="p-4 flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 lg:bg-white text-left">
      <div class="relative w-12 h-12 flex-shrink-0 group cursor-pointer" @click="goToProfile">
        <img 
          :src="avatar" 
          alt="User Avatar" 
          class="w-full h-full rounded-full object-cover border border-gray-200 shadow-sm"
        />
      </div>
      <div class="flex-1 min-w-0 overflow-hidden">
        <h3 class="font-bold text-sm text-gray-900 truncate" :title="auth.user?.name">{{ auth.user?.name }}</h3>
        <button 
          @click="goToProfile"
          class="text-xs text-gray-500 hover:text-black flex items-center gap-1 mt-0.5 transition-colors"
        >
          <i class="fa-solid fa-pen text-[10px]"></i> Sửa hồ sơ
        </button>
      </div>
    </div>

    <!-- Navbar -->
    <nav class="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
      
      <!-- Notification -->
      <div 
        @click="goToNotification" 
        class="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 cursor-pointer transition-all duration-200 text-sm font-medium hover:bg-gray-50 hover:text-black"
        :class="{ 'bg-black text-white shadow-md transform scale-[1.02]': showNotification }"
      >
        <i class="fa-regular fa-bell w-5 text-center"></i>
        <span>Thông báo</span>
      </div>

      <!-- Account Group -->
      <div class="space-y-1">
        <div 
          @click.stop="goToAccount" 
          class="flex items-center justify-between px-4 py-3 rounded-lg text-gray-500 cursor-pointer transition-all duration-200 text-sm font-medium hover:bg-gray-50 hover:text-black group"
          :class="{ 'text-black font-bold bg-gray-50': showDetail }"
        >
          <div class="flex items-center gap-3">
            <i class="fa-regular fa-user w-5 text-center"></i>
            <span>Tài khoản</span>
          </div>
          <i class="fa-solid fa-chevron-down text-xs transition-transform duration-200" :class="showDetail ? 'rotate-180' : ''"></i>
        </div>

        <!-- Sub Menu -->
        <div v-if="showDetail" class="pl-4 space-y-1 animate-slide-down">
          <div 
            @click="goToProfile" 
            class="flex items-center px-4 py-2.5 rounded-lg text-gray-500 cursor-pointer transition-all text-sm hover:text-black"
            :class="{ 'text-white font-bold bg-black hover:text-white/90': showProfile }"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-gray-300 mr-2" :class="{ 'bg-black': showProfile }"></span> Hồ sơ
          </div>
          <div 
            @click="goToAddress" 
            class="flex items-center px-4 py-2.5 rounded-lg text-gray-500 cursor-pointer transition-all text-sm hover:text-black"
            :class="{ 'text-white font-bold bg-black hover:text-white': showAddress }"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-gray-300 mr-2" :class="{ 'bg-black': showAddress }"></span> Địa chỉ
          </div>
          <div 
            @click="goToResetPass" 
            class="flex items-center px-4 py-2.5 rounded-lg text-gray-500 cursor-pointer transition-all text-sm hover:text-black"
            :class="{ 'text-white font-bold bg-black hover:text-white': showResetPassword }"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-gray-300 mr-2" :class="{ 'bg-black': showResetPassword }"></span> Đổi mật khẩu
          </div>
        </div>
      </div>

      <!-- Order -->
      <div 
        @click="goToOrder" 
        class="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 cursor-pointer transition-all duration-200 text-sm font-medium hover:bg-gray-50 hover:text-black"
        :class="{ 'bg-black text-white shadow-md transform scale-[1.02]': showOrder }"
      >
        <i class="fa-solid fa-book w-5 text-center"></i>
        <span>Đơn hàng</span>
      </div>

      <!-- Voucher -->
      <div 
        @click="goToVoucher" 
        class="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 cursor-pointer transition-all duration-200 text-sm font-medium hover:bg-gray-50 hover:text-black"
        :class="{ 'bg-black text-white shadow-md transform scale-[1.02]': showVoucher }"
      >
        <i class="fa-solid fa-ticket w-5 text-center"></i>
        <span>Kho Voucher</span>
      </div>

      <!-- Favourite -->
      <div 
        @click="goToFavourite" 
        class="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 cursor-pointer transition-all duration-200 text-sm font-medium hover:bg-gray-50 hover:text-black"
        :class="{ 'bg-black text-white shadow-md transform scale-[1.02]': showFavourite }"
      >
        <i class="fa-regular fa-heart w-5 text-center"></i>
        <span>Yêu thích</span>
      </div>

      <!-- Register Seller -->
      <!-- <div 
        @click="goToRegisterSeller" 
        class="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 cursor-pointer transition-all duration-200 text-sm font-medium hover:bg-gray-50 hover:text-black"
        :class="{ 'bg-black text-white shadow-md transform scale-[1.02]': showRegisterSeller }"
      >
        <i class="fa-solid fa-store w-5 text-center"></i>
        <span>Đăng ký bán hàng</span>
      </div> -->

    </nav>
  </aside>
</template>

<style scoped>
/* Animation for Submenu */
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-down {
  animation: slideDown 0.2s ease-out forwards;
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 10px;
}
</style>