<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  text: string
  isSuccess?: boolean
  duration?: number // Cho phép tùy chỉnh thời gian hiển thị
}>()

const show = ref(false);
let timer: ReturnType<typeof setTimeout>;

watch(() => props.text, (newVal) => {
    if (newVal && String(newVal).trim().length > 0) {
        show.value = true;
        
        // Clear existing timer if any (to handle rapid notifications)
        if (timer) clearTimeout(timer);
        
        // Auto hide after duration (default 3s for better readability)
        const time = props.duration || 3000;
        timer = setTimeout(() => {
            show.value = false;
        }, time);
    }
})

const closeToast = () => {
    show.value = false;
    if (timer) clearTimeout(timer);
}
</script>

<template>
    <teleport to="body">
        <transition name="toast-slide">
            <div 
                v-if="show && text" 
                class="fixed top-6 right-0 left-0 mx-auto w-fit max-w-sm md:max-w-md z-[9999999] flex items-center gap-3 px-6 py-4 bg-white rounded-lg shadow-2xl border border-gray-100"
                :class="isSuccess ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'"
                @click="closeToast"
            >
                <!-- Icon -->
                <div 
                    class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    :class="isSuccess ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'"
                >
                    <i class="fa-solid" :class="isSuccess ? 'fa-check' : 'fa-xmark'"></i>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-[200px]">
                    <h4 class="text-sm font-bold text-gray-900 mb-0.5">
                        {{ isSuccess ? 'Thành công' : 'Thất bại' }}
                    </h4>
                    <p class="text-xs text-gray-500 leading-snug">{{ text }}</p>
                </div>

                <!-- Close Button -->
                <button class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i class="fa-solid fa-xmark text-sm"></i>
                </button>

                <!-- Progress Bar (Optional Animation) -->
                <div 
                    class="absolute bottom-0 left-0 h-[2px] bg-current opacity-20 w-full origin-left animate-progress"
                    :class="isSuccess ? 'text-green-1000' : 'text-red-500'"
                    :style="{ animationDuration: `${props.duration || 3000}ms` }"
                ></div>
            </div>
        </transition>
    </teleport>
</template>

<style scoped>
/* Slide & Fade Animation */
.toast-slide-enter-active,
.toast-slide-leave-active {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-slide-enter-from,
.toast-slide-leave-to {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
}

.toast-slide-enter-to,
.toast-slide-leave-from {
    opacity: 1;
    transform: translateY(0) scale(1);
}

/* Progress Bar Animation */
@keyframes progress {
    from { transform: scaleX(1); }
    to { transform: scaleX(0); }
}

.animate-progress {
    animation-name: progress;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
}
</style>