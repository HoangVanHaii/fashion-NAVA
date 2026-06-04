<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import Header from '../components/Header.vue';
// import Notification from '../components/Notification.vue';
import SideBarProfile from '@/components/SideBarProfile.vue';
import type { Address } from '../interfaces/address';
import Loading from '../components/Loading.vue';
import { useAddressStore } from '@/stores/address';
import Footer
    from '@/components/Footer.vue';
const addressStore = useAddressStore()
const toastText = ref<string>('')
const isNotification = ref<boolean>(false);
const showNavbar = ref(true);
const selectedAddressId = ref<number | string | undefined>(undefined);

// --- Location State ---
interface LocationItem {
    code: number;
    name: string;
    districts?: LocationItem[];
    wards?: LocationItem[];
}

const provinceList = ref<LocationItem[]>([]);
const districtList = ref<LocationItem[]>([]);
const wardList = ref<LocationItem[]>([]);

const selectedProvinceCode = ref<number | string>("");
const selectedDistrictCode = ref<number | string>("");
const selectedWardCode = ref<number | string>("");

onMounted(async()=>{
    await addressStore.getAddressesByUserStore();
    if(addressStore.addressDefault.id){
        selectedAddressId.value = addressStore.addressDefault.id
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    
    // Pre-fetch provinces
    fetchProvinces();
})

const handleResize = () => {
  showNavbar.value = window.innerWidth > 1024;
};

// --- Location API Logic ---
const fetchProvinces = async () => {
    try {
        const response = await fetch('https://provinces.open-api.vn/api/?depth=1');
        provinceList.value = await response.json();
    } catch (error) {
        console.error("Failed to fetch provinces", error);
    }
};

const fetchDistricts = async (provinceCode: number | string) => {
    if (!provinceCode) return;
    try {
        const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
        const data = await response.json();
        districtList.value = data.districts;
    } catch (error) {
        console.error("Failed to fetch districts", error);
    }
};

const fetchWards = async (districtCode: number | string) => {
    if (!districtCode) return;
    try {
        const response = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
        const data = await response.json();
        wardList.value = data.wards;
    } catch (error) {
        console.error("Failed to fetch wards", error);
    }
};

// --- Change Handlers ---
const handleProvinceChange = () => {
    // 1. Get Name from Code
    const p = provinceList.value.find(item => item.code == Number(selectedProvinceCode.value));
    formState.value.province = p ? p.name : '';

    // 2. Reset lower levels
    selectedDistrictCode.value = "";
    selectedWardCode.value = "";
    districtList.value = [];
    wardList.value = [];
    formState.value.district = '';
    formState.value.ward = '';

    // 3. Fetch Next Level
    if (selectedProvinceCode.value) fetchDistricts(selectedProvinceCode.value);
};

const handleDistrictChange = () => {
    const d = districtList.value.find(item => item.code == Number(selectedDistrictCode.value));
    formState.value.district = d ? d.name : '';

    selectedWardCode.value = "";
    wardList.value = [];
    formState.value.ward = '';

    if (selectedDistrictCode.value) fetchWards(selectedDistrictCode.value);
};

const handleWardChange = () => {
    const w = wardList.value.find(item => item.code == Number(selectedWardCode.value));
    formState.value.ward = w ? w.name : '';
};

// --- Address Logic ---
const handleConfirm = async (address:Address) => {
  if (!address) return;
  toastText.value=""
  try {
    const addressData: Address = { ...address, is_default: true }
    await addressStore.updateAddressStore(addressData);
    toastText.value="Đã cập nhật địa chỉ mặc định"
    isNotification.value = true
  } catch (err) {
    toastText.value="Cập nhật địa chỉ mặc định thất bại"
    isNotification.value = false
  }
};

const showAddAddressForm = ref<boolean>(false)
const formState = ref<Address>({
    name: "", phone: "", province: '', district: '', ward: '', street_address: '', is_default: false,
})

const openAddAddressForm = ()=>{
    formState.value = { name: "", phone: "", province: '', district: '', ward: '', street_address: '', is_default: false }
    
    // Reset Selectors
    selectedProvinceCode.value = "";
    selectedDistrictCode.value = "";
    selectedWardCode.value = "";
    districtList.value = [];
    wardList.value = [];
    
    showAddAddressForm.value = true
}

const handleCancelAddAddress = () => {
    showAddAddressForm.value = false
}

const handleSubmitAddress = async () => {
    if (!formState.value.name || !formState.value.phone || !formState.value.street_address || !formState.value.province || !formState.value.district || !formState.value.ward) {
        toastText.value = "Vui lòng điền đầy đủ thông tin"
        isNotification.value = false
        setTimeout(() => isNotification.value = true, 100);
        return
    }
    try {
        if (formState.value.id) {
            await addressStore.updateAddressStore(formState.value)
            toastText.value = "Cập nhật địa chỉ thành công"
        } else {
            await addressStore.addAddressStore(formState.value)
            toastText.value = "Thêm địa chỉ mới thành công"
        }
        
        showAddAddressForm.value = false
        isNotification.value = true
    } catch (err) {
        toastText.value = "Lỗi khi xử lý địa chỉ"
        isNotification.value = false
    }
}

const handleDelete = async(address :Address)=>{
    if(!confirm("Bạn có chắc chắn muốn xóa địa chỉ này không?")) return;
    try {
        if(address.id){
            await addressStore.deleteAddressStore(address.id)
            toastText.value="Đã xóa địa chỉ thành công"
            isNotification.value = true
        }
    } catch (error) {
        toastText.value="Lỗi khi xóa địa chỉ"
        isNotification.value = false
    }
}

// Logic Update (Cần map lại từ tên sang mã code để hiển thị đúng trên dropdown)
const handleUpdate = async (addr: Address) => {
  if (addr) {
    formState.value = { ...addr };
    showAddAddressForm.value = true;

    // Reset lists
    districtList.value = [];
    wardList.value = [];

    // 1. Find and set Province Code
    const p = provinceList.value.find(item => item.name === addr.province);
    if (p) {
        selectedProvinceCode.value = p.code;
        // Fetch districts immediately
        await fetchDistricts(p.code);
        
        // 2. Find and set District Code
        const d = districtList.value.find(item => item.name === addr.district);
        if (d) {
            selectedDistrictCode.value = d.code;
            // Fetch wards immediately
            await fetchWards(d.code);

            // 3. Find and set Ward Code
            const w = wardList.value.find(item => item.name === addr.ward);
            if (w) {
                selectedWardCode.value = w.code;
            }
        }
    }
  }
};

const formatFullAddress = (addr: Address) => {
    const parts = [addr.street_address, addr.ward, addr.district, addr.province].filter(Boolean);
    return parts.join(', ');
};
</script>

<template>
  <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900 pt-[26px]">
    <Header />
    <Notification :text="toastText" :isSuccess="isNotification" />
    <Loading :loading="addressStore.loadingAddress" />

    <main class="pb-20">
        <div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col lg:flex-row gap-8 items-start">
                <div class="w-full lg:w-[280px] flex-shrink-0">
                    <SideBarProfile
                        v-model:show-menu="showNavbar"
                        :show-detail="true"
                        :show-address="true"
                        :show-favourite="false"
                        :show-notification="false"
                        :show-order="false"
                        :show-profile="false"
                        :show-register-seller="false"
                        :show-reset-password="false"
                        :show-voucher="false"
                    />
                </div>

                <div class="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in min-h-[600px]">
                    <div class="px-8 py-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 class="text-xl font-bold text-gray-900">Địa chỉ của tôi</h1>
                            <p class="text-sm text-gray-500 mt-1">Quản lý thông tin giao hàng</p>
                        </div>
                        <button @click="openAddAddressForm" class="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-800 transition-all shadow-md hover:shadow-lg active:scale-95">
                            <i class="fa-solid fa-plus"></i> Thêm địa chỉ mới
                        </button>
                    </div>

                    <div class="p-6 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                        <div v-if="addressStore.listAddress.length === 0" class="text-center py-10 text-gray-500">
                            <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <i class="fa-solid fa-map-location-dot text-2xl text-gray-400"></i>
                            </div>
                            <p>Bạn chưa có địa chỉ nào.</p>
                        </div>

                        <div v-for="address in addressStore.listAddress" :key="address.id" 
                            class="group border border-gray-200 rounded-xl p-5 hover:border-black transition-colors relative"
                            :class="{'border-black bg-gray-50/50': address.is_default}"
                        >
                            <div class="flex flex-col sm:flex-row justify-between gap-4">
                                <div class="flex-1 space-y-2">
                                    <div class="flex items-center gap-3 flex-wrap">
                                        <span class="font-bold text-gray-900 text-base border-r border-gray-300 pr-3">{{ address.name }}</span>
                                        <span class="text-gray-600 text-sm font-medium">{{ address.phone }}</span>
                                    </div>
                                    <p class="text-gray-600 text-sm leading-relaxed">{{ formatFullAddress(address) }}</p>
                                    <div class="pt-2 flex items-center gap-2">
                                        <span v-if="address.is_default" class="inline-block px-3 py-1 bg-black text-white text-xs font-bold rounded border border-black">Mặc định</span>
                                    </div>
                                </div>
                                <div class="flex flex-col items-end gap-3 min-w-[140px]">
                                    <div class="flex items-center gap-3 text-sm">
                                        <button @click="handleUpdate(address)" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">Cập nhật</button>
                                        <button v-if="!address.is_default" @click="handleDelete(address)" class="text-red-500 hover:text-red-700 hover:underline font-medium">Xóa</button>
                                    </div>
                                    <button @click="handleConfirm(address)" :disabled="address.is_default" class="px-4 py-2 text-xs font-bold border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:border-gray-200">
                                        Thiết lập mặc định
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Add/Edit Address Modal -->
    <div v-if="showAddAddressForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="handleCancelAddAddress"></div>
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl relative z-10 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <h2 class="text-lg font-bold text-gray-900">{{ formState.id ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới' }}</h2>
                <button @click="handleCancelAddAddress" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-black">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <div class="p-6 overflow-y-auto custom-scrollbar">
                <form @submit.prevent="handleSubmitAddress" class="space-y-5">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-gray-500 uppercase">Họ và tên</label>
                            <input v-model="formState.name" type="text" placeholder="Nhập họ tên" class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" required />
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-xs font-bold text-gray-500 uppercase">Số điện thoại</label>
                            <input v-model="formState.phone" type="tel" placeholder="Nhập số điện thoại" class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" required />
                        </div>
                    </div>

                    <!-- Address Selectors -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="space-y-1.5 relative">
                            <label class="text-xs font-bold text-gray-500 uppercase">Tỉnh/Thành</label>
                            <select 
                                v-model="selectedProvinceCode" 
                                @change="handleProvinceChange" 
                                class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all appearance-none cursor-pointer"
                                required
                            >
                                <option value="" disabled>Chọn Tỉnh/TP</option>
                                <option v-for="item in provinceList" :key="item.code" :value="item.code">{{ item.name }}</option>
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-3 top-[2.2rem] text-gray-400 text-xs pointer-events-none"></i>
                        </div>
                        
                        <div class="space-y-1.5 relative">
                            <label class="text-xs font-bold text-gray-500 uppercase">Quận/Huyện</label>
                            <select 
                                v-model="selectedDistrictCode" 
                                @change="handleDistrictChange" 
                                :disabled="!selectedProvinceCode"
                                class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all appearance-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
                                required
                            >
                                <option value="" disabled>Chọn Quận/Huyện</option>
                                <option v-for="item in districtList" :key="item.code" :value="item.code">{{ item.name }}</option>
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-3 top-[2.2rem] text-gray-400 text-xs pointer-events-none"></i>
                        </div>

                        <div class="space-y-1.5 relative">
                            <label class="text-xs font-bold text-gray-500 uppercase">Phường/Xã</label>
                            <select 
                                v-model="selectedWardCode" 
                                @change="handleWardChange"
                                :disabled="!selectedDistrictCode"
                                class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all appearance-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
                                required
                            >
                                <option value="" disabled>Chọn Phường/Xã</option>
                                <option v-for="item in wardList" :key="item.code" :value="item.code">{{ item.name }}</option>
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-3 top-[2.2rem] text-gray-400 text-xs pointer-events-none"></i>
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-xs font-bold text-gray-500 uppercase">Địa chỉ cụ thể</label>
                        <textarea v-model="formState.street_address" rows="2" placeholder="Số nhà, tên đường, tòa nhà..." class="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none" required></textarea>
                    </div>

                    <div class="flex items-center gap-3 pt-2">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" v-model="formState.is_default" class="sr-only peer">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                        </label>
                        <span class="text-sm font-medium text-gray-700">Đặt làm địa chỉ mặc định</span>
                    </div>
                </form>
            </div>

            <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0 z-20">
                <button @click="handleCancelAddAddress" class="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-white hover:text-black transition-colors">Trở lại</button>
                <button @click="handleSubmitAddress" class="px-8 py-2.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors shadow-md">Hoàn thành</button>
            </div>
        </div>
    </div>

  </div>

  <Footer />
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
.custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #9ca3af; }
</style>