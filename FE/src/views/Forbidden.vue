<template>
  <div class="h-screen flex flex-col items-center justify-center bg-gray-100 text-center px-4">
    <div class="text-9xl font-black text-gray-200">403</div>
    <h1 class="text-3xl font-bold text-gray-800 mt-4">Truy cập bị từ chối</h1>
    <p class="text-gray-500 mt-2 mb-6">Bạn không có quyền truy cập vào trang này.</p>
    
    <router-link 
      to="/" 
      class="px-6 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
    >
      Về trang chủ
    </router-link>
  </div>
</template>