<script setup lang="ts">
import { onMounted, ref, reactive, watch } from 'vue';
import { useAddressStore } from '@/stores/address';
import type { Address } from '@/interfaces/address';

const props = defineProps<{
    selectedId?: string
}>();

const emit = defineEmits(['close', 'select']);
const addressStore = useAddressStore();

// --- STATE QUẢN LÝ VIEW ---
const mode = ref<'list' | 'create'>('list'); // Chế độ: 'list' (danh sách) hoặc 'create' (thêm mới)
const isLoadingLoc = ref(false);

// --- STATE FORM THÊM MỚI ---
const formState = reactive<Address>({
    name: "", phone: "", province: '', district: '', ward: '', street_address: '', is_default: false,
});

// Location Data
const provinceList = ref<any[]>([]);
const districtList = ref<any[]>([]);
const wardList = ref<any[]>([]);

const selectedProvinceCode = ref<number | string>("");
const selectedDistrictCode = ref<number | string>("");
const selectedWardCode = ref<number | string>("");

// --- LIFECYCLE ---
onMounted(async () => {
    if (addressStore.listAddress.length === 0) {
        await addressStore.getAddressesByUserStore();
    }
    // Fetch tỉnh thành sẵn để dùng khi cần
    fetchProvinces();
});

// --- LOGIC LOCATION API ---
const fetchProvinces = async () => {
    try {
        const response = await fetch('https://provinces.open-api.vn/api/?depth=1');
        provinceList.value = await response.json();
    } catch (e) { console.error(e); }
};

const fetchDistricts = async (code: number | string) => {
    try {
        const response = await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`);
        const data = await response.json();
        districtList.value = data.districts;
    } catch (e) { console.error(e); }
};

const fetchWards = async (code: number | string) => {
    try {
        const response = await fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`);
        const data = await response.json();
        wardList.value = data.wards;
    } catch (e) { console.error(e); }
};

// Handlers Change
const handleProvinceChange = () => {
    const p = provinceList.value.find(item => item.code == selectedProvinceCode.value);
    formState.province = p ? p.name : '';
    selectedDistrictCode.value = ""; selectedWardCode.value = "";
    districtList.value = []; wardList.value = [];
    if (selectedProvinceCode.value) fetchDistricts(selectedProvinceCode.value);
};

const handleDistrictChange = () => {
    const d = districtList.value.find(item => item.code == selectedDistrictCode.value);
    formState.district = d ? d.name : '';
    selectedWardCode.value = ""; wardList.value = [];
    if (selectedDistrictCode.value) fetchWards(selectedDistrictCode.value);
};

const handleWardChange = () => {
    const w = wardList.value.find(item => item.code == selectedWardCode.value);
    formState.ward = w ? w.name : '';
};

// --- LOGIC XỬ LÝ ---
const handleSelect = (addr: Address) => {
    emit('select', addr);
    emit('close');
};

const switchToCreate = () => {
    // Reset form
    Object.assign(formState, { name: "", phone: "", province: '', district: '', ward: '', street_address: '', is_default: false });
    selectedProvinceCode.value = "";
    selectedDistrictCode.value = "";
    selectedWardCode.value = "";
    mode.value = 'create';
};

const switchToList = () => {
    mode.value = 'list';
};

const handleSubmit = async () => {
    if (!formState.name || !formState.phone || !formState.street_address || !formState.province) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }
    
    try {
        isLoadingLoc.value = true;
        // 1. Gọi API thêm mới
        await addressStore.addAddressStore({ ...formState });
        
        // 2. Load lại danh sách mới nhất
        await addressStore.getAddressesByUserStore();
        
        // 3. Tự động chọn địa chỉ vừa tạo (địa chỉ cuối cùng hoặc tìm theo logic của bạn)
        // Ở đây mình chuyển về list view
        mode.value = 'list';
    } catch (error) {
        alert("Lỗi khi thêm địa chỉ");
    } finally {
        isLoadingLoc.value = false;
    }
};

const formatAddress = (addr: Address) => {
    return [addr.street_address, addr.ward, addr.district, addr.province].filter(Boolean).join(', ');
};
</script>

<template>
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="emit('close')">
        <div class="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scale-in">
            
            <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div class="flex items-center gap-3">
                    <button v-if="mode === 'create'" @click="switchToList" class="text-gray-500 hover:text-black transition-colors">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h3 class="font-bold text-lg text-gray-900">
                        {{ mode === 'list' ? 'Chọn địa chỉ nhận hàng' : 'Thêm địa chỉ mới' }}
                    </h3>
                </div>
                <button @click="emit('close')" class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <i class="fa-solid fa-xmark text-gray-500"></i>
                </button>
            </div>

            <div v-if="mode === 'list'" class="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                <div v-if="addressStore.listAddress.length === 0" class="text-center py-8 text-gray-500">
                    <div class="mb-3"><i class="fa-solid fa-map-location-dot text-3xl text-gray-300"></i></div>
                    <p>Bạn chưa có địa chỉ nào.</p>
                </div>

                <div 
                    v-for="addr in addressStore.listAddress" 
                    :key="addr.id"
                    @click="handleSelect(addr)"
                    class="border rounded-xl p-4 cursor-pointer transition-all hover:border-black group relative"
                    :class="addr.id === props.selectedId ? 'border-black bg-blue-50/30 ring-1 ring-black' : 'border-gray-200'"
                >
                    <div class="flex justify-between items-start mb-1">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-gray-900">{{ addr.name }}</span>
                            <span class="text-gray-300">|</span>
                            <span class="text-gray-600 font-medium">{{ addr.phone }}</span>
                        </div>
                        <div v-if="addr.id === props.selectedId">
                            <i class="fa-solid fa-circle-check text-black text-lg"></i>
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 leading-relaxed">{{ formatAddress(addr) }}</p>
                    <span v-if="addr.is_default" class="mt-2 inline-block px-2 py-0.5 border border-red-200 text-red-600 text-[10px] font-bold rounded bg-red-50 uppercase">Mặc định</span>
                </div>
            </div>

            <div v-else class="p-6 overflow-y-auto custom-scrollbar flex-1">
                <form @submit.prevent="handleSubmit" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-gray-500 uppercase">Họ tên</label>
                            <input v-model="formState.name" type="text" class="input-style" placeholder="Nguyễn Văn A" required />
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-bold text-gray-500 uppercase">SĐT</label>
                            <input v-model="formState.phone" type="tel" class="input-style" placeholder="0909..." required />
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-3">
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-gray-500 uppercase">Tỉnh/TP</label>
                            <select v-model="selectedProvinceCode" @change="handleProvinceChange" class="input-style" required>
                                <option value="" disabled>Chọn</option>
                                <option v-for="p in provinceList" :key="p.code" :value="p.code">{{ p.name }}</option>
                            </select>
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-gray-500 uppercase">Quận/Huyện</label>
                            <select v-model="selectedDistrictCode" @change="handleDistrictChange" :disabled="!selectedProvinceCode" class="input-style disabled:bg-gray-100" required>
                                <option value="" disabled>Chọn</option>
                                <option v-for="d in districtList" :key="d.code" :value="d.code">{{ d.name }}</option>
                            </select>
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-gray-500 uppercase">Phường/Xã</label>
                            <select v-model="selectedWardCode" @change="handleWardChange" :disabled="!selectedDistrictCode" class="input-style disabled:bg-gray-100" required>
                                <option value="" disabled>Chọn</option>
                                <option v-for="w in wardList" :key="w.code" :value="w.code">{{ w.name }}</option>
                            </select>
                        </div>
                    </div>

                    <div class="space-y-1">
                        <label class="text-xs font-bold text-gray-500 uppercase">Địa chỉ cụ thể</label>
                        <textarea v-model="formState.street_address" rows="2" class="input-style resize-none" placeholder="Số nhà, tên đường..." required></textarea>
                    </div>

                    <div class="flex items-center gap-2">
                        <input type="checkbox" v-model="formState.is_default" id="default" class="w-4 h-4 rounded border-gray-300 text-black focus:ring-black">
                        <label for="default" class="text-sm font-medium text-gray-700">Đặt làm địa chỉ mặc định</label>
                    </div>
                </form>
            </div>

            <div class="p-5 border-t border-gray-100 bg-gray-50 sticky bottom-0 z-10">
                <button v-if="mode === 'list'" @click="switchToCreate" class="w-full py-3 border border-dashed border-gray-400 rounded-xl flex items-center justify-center gap-2 text-gray-600 font-bold hover:border-black hover:text-black hover:bg-white transition-all">
                    <i class="fa-solid fa-plus"></i> Thêm địa chỉ mới
                </button>

                <div v-else class="flex gap-3">
                    <button @click="switchToList" class="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-bold hover:bg-white transition-all">
                        Trở lại
                    </button>
                    <button @click="handleSubmit" :disabled="isLoadingLoc" class="flex-[2] py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all flex justify-center items-center gap-2">
                        <i v-if="isLoadingLoc" class="fa-solid fa-spinner fa-spin"></i>
                        {{ isLoadingLoc ? 'Đang lưu...' : 'Hoàn thành' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }

.input-style {
    width: 100%; padding: 10px 12px;
    background-color: white; border: 1px solid #e5e7eb;
    border-radius: 8px; font-size: 14px; outline: none;
    transition: all 0.2s;
}

/* SỬA Ở ĐÂY */
.input-style:focus {
    border-color: black;
    outline: 1px solid black; /* Đã sửa lỗi ring */
}

@keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}
.animate-scale-in { animation: scaleIn 0.2s ease-out; }
</style>