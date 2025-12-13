<script setup lang="ts">
import { ref, watch, computed } from 'vue';

// --- INTERFACE DỮ LIỆU ---
interface Voucher {
    ID: string;
    code: string;
    description: string | null;
    discount_type: 'PERCENT' | 'FIXED';
    discount_value: number;
    min_order_value: number;
    max_discount: number | null;
    quantity: number;
    used: number; 
    start_date: string;
    end_date: string;
}

// --- PROPS VÀ EMITS ---
const props = defineProps<{
    modelValue: boolean; 
    isEdit: boolean; 
    initialVoucher: Voucher | null; 
}>();

const emit = defineEmits(['update:modelValue', 'save']);

const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Dữ liệu Form
const formVoucher = ref<Partial<Voucher>>({
    code: '',
    description: null,
    discount_type: 'PERCENT',
    discount_value: 0,
    min_order_value: 0,
    max_discount: null,
    quantity: 1,
    start_date: formatDate(new Date().toISOString()),
    end_date: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
});

const isFormValid = computed(() => {
    const value = formVoucher.value.discount_value ?? 0;
    const qty = formVoucher.value.quantity ?? 0;

    if (!formVoucher.value.code || value <= 0 || qty <= 0) {
        return false;
    }
    
    if (formVoucher.value.discount_type === 'PERCENT' && (value > 100 || value < 0.01)) {
        return false;
    }
    
    const start = new Date(formVoucher.value.start_date || '');
    const end = new Date(formVoucher.value.end_date || '');
    if (start >= end) {
        return false;
    }
    
    return true;
});


watch([() => props.modelValue, () => props.initialVoucher, () => props.isEdit], ([is_open, initialVoucher, isEdit]) => {
    if (is_open) {
        if (isEdit && initialVoucher) {
            formVoucher.value = {
                ...initialVoucher,
                start_date: formatDate(initialVoucher.start_date),
                end_date: formatDate(initialVoucher.end_date),
            };
        } else {
            formVoucher.value = {
                code: '',
                description: null,
                discount_type: 'PERCENT',
                discount_value: 0,
                min_order_value: 0,
                max_discount: null,
                quantity: 1,
                start_date: formatDate(new Date().toISOString()),
                end_date: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
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

    const payload = {
        ...formVoucher.value,
        discount_value: formVoucher.value.discount_value ?? 0,
        min_order_value: formVoucher.value.min_order_value ?? 0,
        max_discount: formVoucher.value.max_discount ?? null,
        quantity: formVoucher.value.quantity ?? 1,
        used: props.isEdit ? (props.initialVoucher as Voucher)?.used : 0, 
    } as Voucher;

    emit('save', payload, props.isEdit);
    closeModal();
};
</script>

<template>
    <div v-if="modelValue" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl transform transition-all scale-100 overflow-hidden" 
             @click.stop>
            
            <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 class="text-xl font-bold text-gray-900">
                    {{ isEdit ? 'Chỉnh sửa Voucher' : 'Tạo Voucher Mới' }}
                </h3>
                <button @click="closeModal" class="text-gray-400 hover:text-gray-700">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>

            <div class="p-6 h-[70vh] overflow-y-auto custom-scrollbar">
                <form @submit.prevent="handleSave" class="space-y-8">

                    <fieldset class="border border-gray-200 p-5 rounded-lg">
                        <legend class="text-sm font-semibold text-gray-900 px-2">
                            <i class="fa-solid fa-tag text-blue-500 mr-2"></i> Thông tin cơ bản
                        </legend>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1" for="code">Mã Voucher *</label>
                                <input type="text" id="code" v-model="formVoucher.code" required :disabled="isEdit"
                                    class="w-full border-gray-300 rounded-lg shadow-sm focus:border-gray-500 focus:ring-gray-500 disabled:bg-gray-100"
                                    placeholder="VD: VC_SALE30">
                                <p v-if="isEdit" class="mt-1 text-xs text-gray-500">Mã không thể thay đổi sau khi tạo.</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1" for="description">Mô tả (Tùy chọn)</label>
                                <input type="text" id="description" v-model="formVoucher.description"
                                    class="w-full border-gray-300 rounded-lg shadow-sm focus:border-gray-500 focus:ring-gray-500"
                                    placeholder="Voucher cho khách hàng thân thiết">
                            </div>
                        </div>
                    </fieldset>

                    <fieldset class="border border-gray-200 p-5 rounded-lg">
                        <legend class="text-sm font-semibold text-gray-900 px-2">
                            <i class="fa-solid fa-gift text-green-500 mr-2"></i> Thiết lập Giảm giá
                        </legend>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1" for="type">Loại Giảm giá *</label>
                                <select id="type" v-model="formVoucher.discount_type" required
                                    class="w-full border-gray-300 rounded-lg shadow-sm focus:border-gray-500 focus:ring-gray-500">
                                    <option value="PERCENT">Phần trăm (%)</option>
                                    <option value="FIXED">Giá trị cố định (₫)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1" for="value">Giá trị giảm *</label>
                                <input type="number" id="value" v-model.number="formVoucher.discount_value" required min="0.01" step="0.01"
                                    class="w-full border-gray-300 rounded-lg shadow-sm focus:border-gray-500 focus:ring-gray-500"
                                    :placeholder="formVoucher.discount_type === 'PERCENT' ? '10.5 (tối đa 100)' : '50000'">
                                <p v-if="formVoucher.discount_type === 'PERCENT' && (formVoucher.discount_value ?? 0) > 100" class="mt-1 text-xs text-red-600 font-medium">
                                    ⚠️ Lỗi: Phần trăm giảm giá không được vượt quá 100%.
                                </p>
                            </div>

                            <div v-if="formVoucher.discount_type === 'PERCENT'">
                                <label class="block text-sm font-medium text-gray-700 mb-1" for="max_discount">Giảm tối đa (₫) (Tùy chọn)</label>
                                <input type="number" id="max_discount" v-model.number="formVoucher.max_discount" min="0" step="1000"
                                    class="w-full border-gray-300 rounded-lg shadow-sm focus:border-gray-500 focus:ring-gray-500"
                                    placeholder="Không giới hạn">
                            </div>
                        </div>
                    </fieldset>

                    <fieldset class="border border-gray-200 p-5 rounded-lg">
                        <legend class="text-sm font-semibold text-gray-900 px-2">
                            <i class="fa-solid fa-clock text-orange-500 mr-2"></i> Giới hạn & Hiệu lực
                        </legend>
                        
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
                            <div class="col-span-2 md:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1" for="min_order_value">Đơn hàng tối thiểu (₫)</label>
                                <input type="number" id="min_order_value" v-model.number="formVoucher.min_order_value" min="0" step="1000"
                                    class="w-full border-gray-300 rounded-lg shadow-sm focus:border-gray-500 focus:ring-gray-500"
                                    placeholder="0 (Không yêu cầu)">
                            </div>
                            <div class="col-span-2 md:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1" for="quantity">Số lượng phát hành *</label>
                                <input type="number" id="quantity" v-model.number="formVoucher.quantity" required min="1" step="1"
                                    class="w-full border-gray-300 rounded-lg shadow-sm focus:border-gray-500 focus:ring-gray-500"
                                    placeholder="100">
                                <p v-if="isEdit && initialVoucher" class="mt-1 text-xs text-gray-500">Đã sử dụng: **{{ initialVoucher.used }}** lần.</p>
                            </div>
                            
                            <div class="col-span-2 md:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1" for="start_date">Ngày bắt đầu *</label>
                                <input type="date" id="start_date" v-model="formVoucher.start_date" required
                                    class="w-full border-gray-300 rounded-lg shadow-sm focus:border-gray-500 focus:ring-gray-500">
                            </div>

                            <div class="col-span-2 md:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1" for="end_date">Ngày kết thúc *</label>
                                <input type="date" id="end_date" v-model="formVoucher.end_date" required
                                    class="w-full border-gray-300 rounded-lg shadow-sm focus:border-gray-500 focus:ring-gray-500">
                                <p v-if="!isFormValid && new Date(formVoucher.start_date || '') >= new Date(formVoucher.end_date || '')" class="mt-1 text-xs text-red-600 font-medium">
                                    ⚠️ Lỗi: Ngày kết thúc phải sau Ngày bắt đầu.
                                </p>
                            </div>
                        </div>
                    </fieldset>

                </form>
            </div>

            <div class="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button @click="closeModal" type="button" 
                    class="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-100">
                    Hủy
                </button>
                <button @click="handleSave" type="submit" 
                    :disabled="!isFormValid"
                    class="px-4 py-2 text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-700 disabled:opacity-50 transition-colors">
                    {{ isEdit ? 'Lưu Thay Đổi' : 'Tạo Voucher' }}
                </button>
            </div>

        </div>
    </div>
</template>

<style scoped>
/* Custom scrollbar cho modal body */
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
</style>