<script setup lang="ts">
// import Footer from './components/Footer.vue';
</script>
<template>
  <div>
    <router-view />
    <!-- <Footer /> -->
  </div>
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
