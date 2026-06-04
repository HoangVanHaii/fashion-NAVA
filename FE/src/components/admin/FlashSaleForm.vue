<script setup lang="ts">
    import { ref, watch, computed } from 'vue';
    
    // --- 1. SỬ DỤNG INTERFACE MỚI CỦA BẠN ---
    export interface FlashSale {
        id?: number;
        title: string;
        start_date: Date;
        end_date: Date;
        status?: string;
        created_by: string;
        created_at?: Date;
        is_participate?: boolean;
    }
    
    // Interface dùng riêng cho Form (vì input date cần chuỗi string, không phải object Date)
    interface FlashSaleForm extends Omit<FlashSale, 'start_date' | 'end_date'> {
        start_date: string;
        end_date: string;
    }
    
    // --- PROPS VÀ EMITS ---
    const props = defineProps<{
        modelValue: boolean; 
        isEdit: boolean; 
        initialSale: any;
    }>();
    
    const emit = defineEmits(['update:modelValue', 'save']);
    
    // --- DỮ LIỆU FORM ---
    const formSale = ref<Partial<FlashSaleForm>>({
        title: '',
        start_date: '',
        end_date: '',
        status: 'active'
    });
    
    // Hàm định dạng ngày từ Date object/string sang chuỗi input (YYYY-MM-DDTHH:mm)
    const formatDateTimeInput = (dateVal: Date | string | undefined): string => {
        if (!dateVal) return '';
        const date = new Date(dateVal);
        // Chuyển về múi giờ địa phương ISO string cắt gọn cho input datetime-local
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
        return localISOTime;
    };
    
    // --- HÀM KIỂM TRA LOGIC FORM ---
    const isFormValid = computed(() => {
        if (!formSale.value.title || !formSale.value.start_date || !formSale.value.end_date) return false;
        
        const start = new Date(formSale.value.start_date);
        const end = new Date(formSale.value.end_date);
        const now = new Date();
    
        if (start >= end) return false;
    
        if (props.isEdit && props.initialSale) {
            const initialStatus = props.initialSale.status;
            
            // Không cho sửa nếu đã kết thúc hoặc hủy
            if (initialStatus === 'ended' || initialStatus === 'cancelled') {
                 return false;
            }
    
            // Nếu đang chạy thì không được sửa ngày bắt đầu thành quá khứ hoặc tương lai sai lệch (logic tùy biến)
            if (initialStatus === 'active' && start > now) {
                return false;
            }
        }
        
        return true;
    });
    
    // --- WATCHER ĐỒNG BỘ DỮ LIỆU (QUAN TRỌNG) ---
    watch(() => props.modelValue, (is_open) => {
        if (is_open) {
            if (props.isEdit && props.initialSale) {
                // --- EDIT MODE: Gán ID và dữ liệu cũ vào form ---
                formSale.value = {
                    id: props.initialSale.id, // <--- TRUYỀN ID Ở ĐÂY
                    title: props.initialSale.title,
                    start_date: formatDateTimeInput(props.initialSale.start_date),
                    end_date: formatDateTimeInput(props.initialSale.end_date),
                    status: props.initialSale.status,
                    created_by: props.initialSale.created_by,
                    is_participate: props.initialSale.is_participate
                };
            } else {
                // --- CREATE MODE ---
                const defaultStart = new Date(Date.now() + 60000 * 5); // +5 phút
                const defaultEnd = new Date(defaultStart.getTime() + 60000 * 60 * 2); // +2 tiếng
                
                // Format sang chuỗi cho input
                const offset = defaultStart.getTimezoneOffset() * 60000;
                
                formSale.value = {
                    title: '',
                    start_date: (new Date(defaultStart.getTime() - offset)).toISOString().slice(0, 16),
                    end_date: (new Date(defaultEnd.getTime() - offset)).toISOString().slice(0, 16),
                    status: 'pending', // Mặc định pending nếu tạo mới
                    created_by: 'admin' // Hoặc lấy từ store user
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
        let status = formSale.value.status;
    
        // Tự động cập nhật trạng thái dựa trên thời gian nếu là tạo mới
        if (!props.isEdit) {
            if (start > now) {
                status = 'pending';
            } else {
                status = 'active';
            }
        }
    
        // Chuẩn bị payload để gửi đi
        const payload: FlashSale = {
            id: formSale.value.id, // <--- ID ĐƯỢC GỬI ĐI TẠI ĐÂY (để bên kia dùng get products)
            title: formSale.value.title || '',
            start_date: new Date(formSale.value.start_date || ''),
            end_date: new Date(formSale.value.end_date || ''),
            status: status,
            created_by: formSale.value.created_by || 'system',
            is_participate: formSale.value.is_participate
        };
    
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
                                    Không thể sửa ngày Bắt đầu khi sự kiện đã <strong>Active</strong>.
                                </p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1" for="end_date">Thời gian Kết thúc *</label>
                                <input type="datetime-local" id="end_date" v-model="formSale.end_date" required
                                    class="w-full border-gray-300 rounded-md py-2 shadow-sm focus:border-red-600 focus:ring-red-600 focus:ring-2 transition duration-150">
                            </div>
                        </div>
                        
                        <div v-if="!isFormValid && formSale.start_date && formSale.end_date">
                            <p v-if="new Date(formSale.start_date) >= new Date(formSale.end_date)" class="text-xs text-red-600 font-medium">
                                ⚠️ Thời gian kết thúc phải sau thời gian bắt đầu.
                            </p>
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