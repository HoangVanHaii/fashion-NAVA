<script setup lang="ts">
    import { ref, watch } from 'vue';
    import { useRouter, useRoute } from 'vue-router';
    
    const router = useRouter();
    const route = useRoute();
    
    // State quản lý hiển thị sidebar
    const isSidebarOpen = ref(false); // Mobile: Đóng/Mở hẳn
    const isCollapsed = ref(false);   // Desktop: Thu nhỏ/Phóng to

    const activePage = ref("home");
    
    interface MenuItem {
        key: string;
        label: string;
        routeName: string;
        icon: string;
    }
    
    const menuItems: MenuItem[] = [
        { key: 'home', label: 'Trang chủ', routeName: 'adminHome', icon: 'fa-solid fa-house' },
        { key: 'users', label: 'Quản lý người dùng', routeName: 'UserAdmin', icon: 'fa-solid fa-user' },
        { key: 'products', label: 'Quản lý sản phẩm', routeName: 'ProductAdmin', icon: 'fa-solid fa-boxes' },
        { key: 'order', label: 'Quản lý đơn hàng', routeName: 'OrderAdmin', icon: 'fa-solid fa-box-open' },
        { key: 'flashsale', label: 'Quản lý Flash Sale', routeName: 'FlashsaleAdmin', icon: 'fa-solid fa-bolt' },
        { key: 'voucher', label: 'Quản lý Voucher', routeName: 'VoucherAdmin', icon: 'fa-solid fa-ticket' },
        { key: 'settings', label: 'Cài đặt', routeName: 'adminSetting', icon: 'fa-solid fa-gear' },
    ];
    
    const routeToKeyMap: Record<string, string> = menuItems.reduce((acc, item) => {
      acc[item.routeName] = item.key;
      return acc;
    }, {} as Record<string, string>);
    
    watch(
      () => route.name,
      (newRouteName) => {
        if (typeof newRouteName === "string") {
          activePage.value = routeToKeyMap[newRouteName] || activePage.value;
        }
      },
      { immediate: true }
    );
    
    const goToPage = (item: MenuItem) => {
      activePage.value = item.key;
      if (router.hasRoute(item.routeName)) {
        router.push({ name: item.routeName });
      } else {  
        console.warn(`Route ${item.routeName} chưa được định nghĩa!`);
      }
        isSidebarOpen.value = false;
    };
    
    const handleLogout = () => {
      console.log("Logging out...");
      router.push({ name: 'Login' }); // Ví dụ chuyển về trang login
    };
    
    // Style classes (Đã bỏ padding cứng để xử lý linh hoạt ở template)
    const baseItemClass = "py-3 rounded flex items-center cursor-pointer transition-all duration-200 text-gray-700 hover:-translate-y-0.5 hover:bg-gray-100 mb-1 mx-2";
    const activeItemClass = "bg-black text-white shadow-md hover:bg-black hover:text-red-500";
</script>
    
<template>
    <div>
    <div class="md:hidden fixed top-0 left-0 p-4 z-50">
        <button 
        @click="isSidebarOpen = !isSidebarOpen"
        class="p-2 rounded-md bg-white shadow-md text-gray-700 hover:text-black focus:outline-none transition-transform active:scale-95"
        >
        <i :class="!isSidebarOpen ? 'fa-solid fa-bars' : 'fa-solid fa-xmark'" class="text-xl w-6"></i>
        </button>
    </div>

    <div 
        v-if="isSidebarOpen" 
        @click="isSidebarOpen = false"
        class="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
    ></div>

    <div 
        class="sidebar fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-gray-200 shadow-xl text-gray-900 
            transition-all duration-300 ease-in-out flex flex-col
            md:static md:h-screen md:shadow-lg"
        :class="[
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            isCollapsed ? 'md:w-20' : 'md:w-64'
        ]"
    >
        
        <button 
            @click="isCollapsed = !isCollapsed"
            class="hidden md:flex absolute -right-3 top-9 bg-white border border-gray-200 text-gray-500 hover:text-black shadow-md rounded-full w-6 h-6 items-center justify-center z-50 transition-colors"
        >
            <i :class="isCollapsed ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left'" class="text-xs"></i>
        </button>

        <div class="p-4 border-b border-gray-100 h-24 flex items-center overflow-hidden transition-all duration-300 relative">
            <div class="flex items-center gap-3 w-full" :class="isCollapsed ? 'justify-center' : ''">
                <div class="rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-300 shadow-sm transition-all duration-300"
                     :class="isCollapsed ? 'w-10 h-10' : 'w-12 h-12'">
                    <img src="https://i.pravatar.cc/100" alt="avatar" class="w-full h-full object-cover" />
                </div>
                
                <div class="overflow-hidden transition-all duration-300"
                     :class="isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'">
                    <p class="font-bold truncate text-gray-800 whitespace-nowrap">Winmart_NV5</p>
                    <span class="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap">Online</span>
                </div>
            </div>
        </div>

        <div class="flex-1 overflow-y-auto py-4 custom-scrollbar overflow-x-hidden">
            <div 
                v-for="item in menuItems" 
                :key="item.key"
                :class="[
                    baseItemClass, 
                    activePage === item.key ? activeItemClass : '',
                    isCollapsed ? 'justify-center px-0' : 'px-3'
                ]"
                @click="goToPage(item)"
                :title="isCollapsed ? item.label : ''"
            >
                <i :class="[item.icon, 'text-lg transition-all duration-300', isCollapsed ? 'mr-0' : 'mr-3']"></i> 
                
                <span 
                    class="font-medium text-sm whitespace-nowrap transition-all duration-300 overflow-hidden"
                    :class="isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
                >
                    {{ item.label }}
                </span>
            </div>
        </div>

        <div class="p-4 border-t border-gray-200 overflow-hidden">
            <div 
                @click="handleLogout"
                class="py-2 text-red-600 font-semibold cursor-pointer hover:bg-red-50 rounded flex items-center transition-all duration-300 mb-1 mx-2"
                :class="isCollapsed ? 'justify-center px-0' : 'px-3 gap-2'"
                :title="isCollapsed ? 'Đăng xuất' : ''"
            >
                <i class="fa-solid fa-right-from-bracket text-lg"></i> 
                <span 
                    class="text-sm whitespace-nowrap overflow-hidden transition-all duration-300"
                    :class="isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
                >
                    Đăng xuất
                </span>
            </div>
        </div>

    </div>
    </div>
</template>
    
<style scoped>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>