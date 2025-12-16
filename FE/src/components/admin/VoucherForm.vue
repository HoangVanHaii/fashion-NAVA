<script setup lang="ts">
    import { ref, watch, computed } from 'vue';
    
    // --- INTERFACE DỮ LIỆU ---
    export interface Voucher {
        ID?: string;
        code: string;
        description?: string;
        discount_type: 'PERCENT' | 'FIXED';
        discount_value: number; 
        max_discount: number | null;
        min_order_value: number;
        quantity: number;
        used?: number;
        start_date: Date;
        end_date: Date;
        created_by: string;
        created_at?: Date;
        updated_at?: Date;
    }
    
    // --- PROPS VÀ EMITS ---
    const props = defineProps<{
        modelValue: boolean; 
        isEdit: boolean; 
        initialVoucher: Voucher | null; 
    }>();
    
    const emit = defineEmits(['update:modelValue', 'save']);
    
    // Hàm helper date
    const formatDateForInput = (dateInput: Date | string | undefined): string => {
        if (!dateInput) return '';
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    // Dữ liệu Form
    const formVoucher = ref({
        code: '',
        description: '' as string | undefined,
        discount_type: 'PERCENT' as 'PERCENT' | 'FIXED',
        discount_value: 0,
        min_order_value: 0,
        max_discount: null as number | null,
        quantity: 1,
        start_date: formatDateForInput(new Date()), 
        end_date: formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    });
    
    // Computed validation
    const isFormValid = computed(() => {
        const value = formVoucher.value.discount_value ?? 0;
        const qty = formVoucher.value.quantity ?? 0;
    
        if (!formVoucher.value.code || value <= 0 || qty <= 0) return false;
        if (formVoucher.value.discount_type === 'PERCENT' && (value > 100 || value < 0.01)) return false;
        
        const start = new Date(formVoucher.value.start_date);
        const end = new Date(formVoucher.value.end_date);
        if (start > end) return false;
        
        return true;
    });
    
    // Watch
    watch(
        [() => props.modelValue, () => props.initialVoucher, () => props.isEdit], 
        ([isOpen, initialVoucher, isEdit]) => {
            if (isOpen) {
                if (isEdit && initialVoucher) {
                    formVoucher.value = {
                        code: initialVoucher.code,
                        description: initialVoucher.description || '',
                        discount_type: initialVoucher.discount_type,
                        discount_value: initialVoucher.discount_value,
                        min_order_value: initialVoucher.min_order_value,
                        max_discount: initialVoucher.max_discount,
                        quantity: initialVoucher.quantity,
                        start_date: formatDateForInput(initialVoucher.start_date),
                        end_date: formatDateForInput(initialVoucher.end_date),
                    };
                } else {
                    formVoucher.value = {
                        code: '',
                        description: '',
                        discount_type: 'PERCENT',
                        discount_value: 0,
                        min_order_value: 0,
                        max_discount: null,
                        quantity: 1,
                        start_date: formatDateForInput(new Date()),
                        end_date: formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                    };
                }
            }
        }, 
        { immediate: true }
    );
    
    // --- HÀM XỬ LÝ ---
    const closeModal = () => {
        emit('update:modelValue', false);
    };
    
    const handleSave = () => {
    if (!isFormValid.value) return;

    // --- XỬ LÝ NGÀY GIỜ CHO SQL SERVER ---
    
    // 1. Ngày bắt đầu: Set là đầu ngày (00:00:00)
    // Input đang là: "2025-12-20" -> Thêm "T00:00:00"
    const startDateFull = new Date(`${formVoucher.value.start_date}T00:00:00`);

    // 2. Ngày kết thúc: Set là cuối ngày (23:59:59)
    // Để voucher có hiệu lực đến hết ngày hôm đó
    // Input đang là: "2025-12-25" -> Thêm "T23:59:59"
    const endDateFull = new Date(`${formVoucher.value.end_date}T23:59:59`);


    const payload: Voucher = {
        
        // ... các trường cũ giữ nguyên
        ID: props.initialVoucher?.ID || '', 
        created_by: props.initialVoucher?.created_by || 'Admin',
        created_at: props.initialVoucher?.created_at || new Date(),
        updated_at: new Date(),
        used: props.initialVoucher?.used || 0,
        
        code: formVoucher.value.code,
        description: formVoucher.value.description || undefined,
        discount_type: formVoucher.value.discount_type,
        
        discount_value: Number(formVoucher.value.discount_value),
        min_order_value: Number(formVoucher.value.min_order_value),
        max_discount: formVoucher.value.max_discount ? Number(formVoucher.value.max_discount) : null,
        quantity: Number(formVoucher.value.quantity),
        
        // --- GÁN GIÁ TRỊ ĐÃ XỬ LÝ VÀO ĐÂY ---
        start_date: startDateFull,
        end_date: endDateFull,
    };

    console.log('Payload chuẩn bị gửi SQL:', payload);
    emit('save', payload, props.isEdit);
    closeModal();
};
    </script>
    
    <template>
        <div v-if="modelValue" class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl transform transition-all scale-100 overflow-hidden flex flex-col max-h-[90vh]" 
                 @click.stop>
                
                <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h3 class="text-lg font-bold text-gray-900">
                            {{ isEdit ? 'Cập nhật Voucher' : 'Thêm Voucher Mới' }}
                        </h3>
                        <p class="text-xs text-gray-500 mt-0.5">Điền thông tin chi tiết khuyến mãi</p>
                    </div>
                    <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
    
                <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form @submit.prevent="handleSave" class="space-y-6">
    
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div class="space-y-1.5">
                                <label class="text-sm font-semibold text-gray-700">Mã Voucher <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <i class="fa-solid fa-ticket text-gray-400 text-sm"></i>
                                    </div>
                                    <input type="text" v-model="formVoucher.code" required :disabled="isEdit"
                                        class="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase placeholder-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                        placeholder="VD: SUMMER2025">
                                </div>
                            </div>
                            <div class="space-y-1.5">
                                <label class="text-sm font-semibold text-gray-700">Mô tả ngắn</label>
                                <input type="text" v-model="formVoucher.description"
                                    class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
                                    placeholder="VD: Giảm giá mùa hè...">
                            </div>
                        </div>
    
                        <div class="bg-blue-50/50 border border-blue-100 rounded-xl p-5 space-y-4">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="text-sm font-bold text-gray-800 flex items-center gap-2">
                                    <i class="fa-solid fa-percent text-blue-600"></i> Mức Giảm Giá
                                </h4>
                                <div class="bg-white p-1 rounded-lg border border-gray-200 flex text-xs font-medium shadow-sm">
                                    <button type="button" 
                                        @click="formVoucher.discount_type = 'PERCENT'"
                                        :class="formVoucher.discount_type === 'PERCENT' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
                                        class="px-3 py-1.5 rounded-md transition-all">
                                        Theo %
                                    </button>
                                    <button type="button" 
                                        @click="formVoucher.discount_type = 'FIXED'"
                                        :class="formVoucher.discount_type === 'FIXED' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
                                        class="px-3 py-1.5 rounded-md transition-all">
                                        Tiền mặt
                                    </button>
                                </div>
                            </div>
    
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-1">
                                    <label class="text-xs font-medium text-gray-500">Giá trị giảm</label>
                                    <div class="relative">
                                        <input type="number" v-model.number="formVoucher.discount_value" required min="0" 
                                            class="w-full pl-3 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-lg font-bold text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="0">
                                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                                            {{ formVoucher.discount_type === 'PERCENT' ? '%' : 'đ' }}
                                        </span>
                                    </div>
                                    <p v-if="formVoucher.discount_type === 'PERCENT' && (formVoucher.discount_value > 100)" class="text-xs text-red-500 mt-1">
                                        * Tối đa 100%
                                    </p>
                                </div>
    
                                <div v-if="formVoucher.discount_type === 'PERCENT'" class="space-y-1">
                                    <label class="text-xs font-medium text-gray-500">Giảm tối đa (Optional)</label>
                                    <div class="relative">
                                        <input type="number" v-model.number="formVoucher.max_discount" min="0" step="1000"
                                            class="w-full pl-3 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="Không giới hạn">
                                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">đ</span>
                                    </div>
                                </div>
                            </div>
                        </div>
    
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="space-y-1.5 col-span-1">
                                <label class="text-xs font-semibold text-gray-600">Số lượng</label>
                                <input type="number" v-model.number="formVoucher.quantity" required min="1"
                                    class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all">
                            </div>
                            
                            <div class="space-y-1.5 col-span-1">
                                <label class="text-xs font-semibold text-gray-600">Đơn tối thiểu</label>
                                <div class="relative">
                                    <input type="number" v-model.number="formVoucher.min_order_value" min="0" step="1000"
                                        class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all"
                                        placeholder="0">
                                    <span class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">đ</span>
                                </div>
                            </div>
    
                            <div class="space-y-1.5 col-span-2 md:col-span-1">
                                <label class="text-xs font-semibold text-gray-600">Bắt đầu</label>
                                <input type="date" v-model="formVoucher.start_date" required
                                    class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:border-blue-500 outline-none">
                            </div>
    
                            <div class="space-y-1.5 col-span-2 md:col-span-1">
                                <label class="text-xs font-semibold text-gray-600">Kết thúc</label>
                                <input type="date" v-model="formVoucher.end_date" required
                                    class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:border-blue-500 outline-none">
                            </div>
                        </div>
    
                        <div v-if="new Date(formVoucher.start_date) > new Date(formVoucher.end_date)" 
                             class="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            Ngày kết thúc không được nhỏ hơn ngày bắt đầu.
                        </div>
    
                    </form>
                </div>
    
                <div class="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0 z-10">
                    <button @click="closeModal" type="button" 
                        class="px-5 py-2.5 text-sm font-semibold rounded-xl text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-all">
                        Đóng
                    </button>
                    <button @click="handleSave" type="button" 
                        :disabled="!isFormValid"
                        class="px-6 py-2.5 text-sm font-semibold rounded-xl text-white bg-gray-900 shadow-lg shadow-gray-900/20 hover:bg-gray-800 hover:shadow-gray-900/40 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95">
                        {{ isEdit ? 'Lưu Cập Nhật' : 'Hoàn Tất' }}
                    </button>
                </div>
    
            </div>
        </div>
    </template>
    
    <style scoped>
    /* Ẩn nút tăng giảm mặc định của input type number */
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { 
      -webkit-appearance: none; 
      margin: 0; 
    }
    </style>