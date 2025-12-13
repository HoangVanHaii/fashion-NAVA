<script setup lang="ts">
import { watch, onUnmounted } from 'vue';

const props = defineProps<{
    loading: boolean
}>()

// Watcher để khóa cuộn trang khi loading hiện ra
watch(() => props.loading, (newVal) => {
    if (newVal) {
        // Khóa cuộn trên cả body và html để đảm bảo hoạt động trên mọi trình duyệt
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    } else {
        // Mở lại cuộn
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    }
}, { immediate: true });

// Đảm bảo mở lại cuộn khi component bị hủy
onUnmounted(() => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
});
</script>
<template>
    <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-300 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
    >
        <!-- 
            Chỉnh độ tối ở đây:
            - bg-black/20: Nền đen với độ trong suốt 20% (tạo hiệu ứng tối nhẹ)
            - backdrop-blur-[2px]: Làm mờ nhẹ hậu cảnh
        -->
        <div v-if="props.loading" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/20 ">
            <div class="p-[20px] bg-white/20 rounded-2xl">
                <div class="flex flex-col items-center gap-6">
                    <!-- Modern Square Loader -->
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 bg-black animate-bounce-custom" style="animation-delay: 0s"></div>
                        <div class="w-3 h-3 bg-black animate-bounce-custom" style="animation-delay: 0.15s"></div>
                        <div class="w-3 h-3 bg-black animate-bounce-custom" style="animation-delay: 0.3s"></div>
                    </div>
    
                    <!-- Minimalist Text -->
                    <span class="text-xs font-mono font-bold tracking-[0.3em] text-black uppercase drop-shadow-xl">
                        Processing
                    </span>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
/* Custom Keyframes for a sharper bounce effect */
@keyframes bounce-custom {
    0%, 100% {
        transform: translateY(0);
        opacity: 0.5;
    }
    50% {
        transform: translateY(-10px);
        opacity: 1;
        background-color: black;
    }
}

.animate-bounce-custom {
    animation: bounce-custom 1s infinite ease-in-out;
}
</style>