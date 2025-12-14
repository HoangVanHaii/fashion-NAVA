<script setup lang="ts">
const props = defineProps<{ message: string }>();
const emit = defineEmits(['close', 'confirm']);

const handleClose = () => {
    emit('close');
}
const handleConfirm = () => {
    emit('confirm');
}
</script>

<template>
    <teleport to="body">
        <!-- Overlay -->
        <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4" @click="handleClose">
            <!-- Backdrop with blur -->
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"></div>

            <!-- Modal Content -->
            <div 
                class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center overflow-hidden animate-scale-in"
                @click.stop
            >
                <!-- Decoration Icon -->
                <div class="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100">
                    <i class="fa-solid fa-triangle-exclamation text-2xl text-red-500"></i>
                </div>

                <!-- Content -->
                <h3 class="text-lg font-bold text-gray-900 mb-2">Xác nhận hành động</h3>
                <p class="text-gray-500 text-sm mb-8 leading-relaxed px-2">
                    {{ props.message }}
                </p>

                <!-- Actions -->
                <div class="grid grid-cols-2 gap-3">
                    <button 
                        @click="handleClose" 
                        class="px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-black transition-all"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        @click="handleConfirm" 
                        class="px-4 py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 transform active:scale-95"
                    >
                        Đồng ý
                    </button>
                </div>
            </div>
        </div>
    </teleport>
</template>

<style scoped>
.animate-scale-in {
    animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes scaleIn {
    from { 
        opacity: 0; 
        transform: scale(0.95) translateY(10px); 
    }
    to { 
        opacity: 1; 
        transform: scale(1) translateY(0); 
    }
}
</style>