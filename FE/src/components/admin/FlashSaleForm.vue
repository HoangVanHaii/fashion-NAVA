<script setup lang="ts">
import { ref, watch, computed } from 'vue';

// --- INTERFACE DỮ LIỆU TƯƠNG ỨNG FLASH_SALES ---
interface FlashSale {
    ID: string;
    title: string;
    start_date: string;
    end_date: string;
    status: 'active' | 'pending' | 'ended' | 'cancelled';
    product_count: number;
}

// --- PROPS VÀ EMITS ---
const props = defineProps<{
    modelValue: boolean; 
    isEdit: boolean; 
    initialSale: FlashSale | null; 
}>();

const emit = defineEmits(['update:modelValue', 'save']);

// --- DỮ LIỆU FORM ---
const formSale = ref<Partial<FlashSale>>({
    title: '',
    start_date: '',
    end_date: '',
});

// Hàm định dạng ngày
const formatDateTimeInput = (dateTimeString: string | undefined): string => {
    if (!dateTimeString) return '';
    return dateTimeString.slice(0, 10) + 'T' + dateTimeString.slice(11, 16);
};

// --- HÀM KIỂM TRA LOGIC FORM ---
const isFormValid = computed(() => {
    if (!formSale.value.title || !formSale.value.start_date || !formSale.value.end_date) return false;
    
    const start = new Date(formSale.value.start_date ?? '');
    const end = new Date(formSale.value.end_date ?? '');
    const now = new Date();

    if (start >= end) return false;

    if (props.isEdit && props.initialSale) {
        const initialStatus = props.initialSale.status;
        
        if (initialStatus === 'ended' || initialStatus === 'cancelled') {
             return false;
        }

        if (initialStatus === 'active' && start > now) {
            return false;
        }
    }
    
    return true;
});

// --- WATCHER ĐỒNG BỘ DỮ LIỆU ---
watch(() => props.modelValue, (is_open) => {
    if (is_open) {
        if (props.isEdit && props.initialSale) {
            formSale.value = {
                ID: props.initialSale.ID,
                title: props.initialSale.title,
                start_date: formatDateTimeInput(props.initialSale.start_date),
                end_date: formatDateTimeInput(props.initialSale.end_date),
            };
        } else {
            const defaultStart = new Date(Date.now() + 60000 * 5); 
            const defaultEnd = new Date(defaultStart.getTime() + 60000 * 60 * 2); 
            
            formSale.value = {
                title: '',
                start_date: defaultStart.toISOString().slice(0, 16),
                end_date: defaultEnd.toISOString().slice(0, 16),
            };
        }
    }
}, { immediate: true });

// --- HÀM XỬ LÝ ---

const closeModal = () => {
    emit('update:modelValue', false);
};

const handleSave = () => {
    if (!isFormValid.value) return;

    const now = new Date();
    const start = new Date(formSale.value.start_date ?? '');
    let status: 'pending' | 'active' | 'ended' | 'cancelled';

    if (start > now) {
        status = 'pending';
    } else {
        status = 'active';
    }

    const payload = {
        ...formSale.value,
        ID: formSale.value.ID || '',
        start_date: formSale.value.start_date?.replace('T', ' ') + ':00',
        end_date: formSale.value.end_date?.replace('T', ' ') + ':00',
        status: status,
        product_count: props.initialSale?.product_count || 0
    } as FlashSale;

    emit('save', payload);
};
</script>

<template>
    <div v-if="modelValue" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all" @click.stop>
            
            <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-red-50 rounded-t-xl">
                <h3 class="text-xl font-bold text-red-800">
                    <i class="fa-solid fa-bolt-lightning mr-2"></i> {{ isEdit ? 'Chỉnh sửa Flash Sale' : 'Tạo Đợt Flash Sale Mới' }}
                </h3>
                <button @click="closeModal" class="text-red-400 hover:text-red-700">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>

            <div class="p-6">
                <form @submit.prevent="handleSave" class="space-y-6">

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1" for="title">Tên Sự kiện *</label>
                        <input type="text" id="title" v-model="formSale.title" required
                            class="w-full border-gray-300 rounded-md py-1 px-2 shadow-sm focus:border-red-600 focus:ring-red-600 focus:ring-2 transition duration-150"
                            placeholder="Ví dụ: Sale Siêu Tốc 11.11">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1" for="start_date">Thời gian Bắt đầu *</label>
                            <input type="datetime-local" id="start_date" v-model="formSale.start_date" required
                                :disabled="isEdit && initialSale?.status === 'active'"
                                class="w-full border-gray-300 rounded-md py-2 shadow-sm focus:border-red-600 focus:ring-red-600 focus:ring-2 disabled:bg-gray-100 transition duration-150">
                            <p v-if="isEdit && initialSale?.status === 'active'" class="mt-1 text-xs text-gray-500">
                                Không thể sửa ngày Bắt đầu khi sự kiện đã **Active**.
                            </p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1" for="end_date">Thời gian Kết thúc *</label>
                            <input type="datetime-local" id="end_date" v-model="formSale.end_date" required
                                class="w-full border-gray-300 rounded-md py-2 shadow-sm focus:border-red-600 focus:ring-red-600 focus:ring-2 transition duration-150">
                            <p v-if="!isFormValid && formSale.start_date && formSale.end_date && new Date(formSale.start_date ?? '') >= new Date(formSale.end_date ?? '')" class="mt-1 text-xs text-red-600 font-medium">
                                ⚠️ Thời gian kết thúc phải sau thời gian bắt đầu.
                            </p>
                            <p v-else-if="!isFormValid && isEdit && initialSale?.status === 'active' && new Date(formSale.start_date ?? '') > new Date()" class="mt-1 text-xs text-red-600 font-medium">
                                ⚠️ Ngày bắt đầu không thể thay đổi thành thời gian trong tương lai khi Sale đang **Active**.
                            </p>
                        </div>
                    </div>

                </form>
            </div>

            <div class="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                <button @click="closeModal" type="button" 
                    class="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 shadow-sm transition-colors">
                    Hủy
                </button>
                <button @click="handleSave" type="submit" 
                    :disabled="!isFormValid"
                    class="px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 shadow-md transition-colors">
                    {{ isEdit ? 'Lưu Thay Đổi' : 'Tạo Sự kiện' }}
                </button>
            </div>

        </div>
    </div>
</template>