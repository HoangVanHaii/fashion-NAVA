<template>
  <div class="h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
    <div class="text-9xl font-black text-gray-200">404</div>
    <h1 class="text-3xl font-bold text-gray-800 mt-4">Trang không tìm thấy</h1>
    <p class="text-gray-500 mt-2 mb-6">Xin lỗi, trang bạn đang tìm kiếm không tồn tại.</p>
    
    <router-link 
      to="/" 
      class="px-6 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
    >
      Về trang chủ
    </router-link>
  </div>
</template>