<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
    modelValue: string; 
    allowCentral: boolean; 
}>();

const emit = defineEmits(['update:modelValue']);

// Dữ liệu mẫu
const branches = ['HN', 'HCM', 'DN']; 

// Tạo danh sách options
const availableOptions = computed(() => [
    ...(props.allowCentral ? [{ code: 'CENTRAL', name: 'Toàn Hệ Thống (Central)' }] : []),
    ...branches.map(code => ({ code, name: `Chi nhánh ${code}` }))
]);

// --- Logic Custom Dropdown ---
const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null); // Ref để tham chiếu thẻ bao ngoài

// Lấy tên hiển thị hiện tại dựa trên modelValue
const currentLabel = computed(() => {
    const selected = availableOptions.value.find(opt => opt.code === props.modelValue);
    return selected ? selected.name : 'Chọn chi nhánh';
});

// Hàm chọn option
const selectOption = (code: string) => {
    emit('update:modelValue', code);
    isOpen.value = false; // Đóng menu sau khi chọn
};

// Hàm đóng menu khi click ra ngoài (Click Outside)
const handleClickOutside = (event: MouseEvent) => {
    if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
        isOpen.value = false;
    }
};

// Đăng ký sự kiện click toàn trang
onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
    <div ref="containerRef" class="relative w-full min-w-[200px]">
        
        <div 
            @click="isOpen = !isOpen"
            class="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 flex items-center justify-between cursor-pointer hover:border-indigo-500 transition-colors shadow-sm group"
            :class="{ 'ring-2 ring-indigo-500/20 border-indigo-500': isOpen }"
        >
            <span class="text-sm font-medium text-gray-700 truncate select-none">
                {{ currentLabel }}
            </span>
            <i class="fa-solid fa-chevron-down text-gray-400 text-xs transition-transform duration-200"
               :class="{ 'rotate-180 text-indigo-500': isOpen }">
            </i>
        </div>

        <div 
            v-if="isOpen"
            class="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-lg shadow-xl overflow-hidden animate-fade-in-down"
        >
            <ul class="max-h-60 overflow-y-auto custom-scrollbar py-1">
                <li 
                    v-for="option in availableOptions" 
                    :key="option.code"
                    @click="selectOption(option.code)"
                    class="px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between group transition-colors"
                    :class="modelValue === option.code ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
                >
                    <span>{{ option.name }}</span>
                    <i v-if="modelValue === option.code" class="fa-solid fa-check text-indigo-600 text-xs"></i>
                </li>
            </ul>
        </div>
    </div>
</template>

<style scoped>
/* Hiệu ứng xuất hiện nhẹ nhàng */
@keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-down {
    animation: fadeInDown 0.15s ease-out forwards;
}

/* Scrollbar đẹp cho dropdown */
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #e5e7eb;
    border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #d1d5db;
}
</style>