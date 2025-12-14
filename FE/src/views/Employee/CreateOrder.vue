<script setup lang="ts">
import { ref, computed, watch } from 'vue';
// import { useProductStore } from '../../stores/productStore'; // Giả sử store sản phẩm ở đây
// import type { ProductSummary, ProductPayload } from '../../interfaces/product';
import { formatPrice, getImage } from '../../utils/format';
import type { IProductMongoDetail } from '@/interfaces/product';
import { useOrderEmployeeStore } from '@/stores/order';
// import Loading from '../../components/Loading.vue';

const props = defineProps<{
    show: boolean;
}>();

const emit = defineEmits(['close', 'create']);

// const productStore = useProductStore();
const loading = ref(false);
const searchTerm = ref('');
const searchResult = ref<IProductMongoDetail | null>(null);
const selectedProducts = ref<any[]>([]);
const errorText = ref('');
const orderEmployee = useOrderEmployeeStore();

// Hàm tìm kiếm sản phẩm (Giả lập gọi API getProductById)
const handleSearch = async () => {
    if (!searchTerm.value) return;
    
    loading.value = true;
    errorText.value = '';
    searchResult.value = null;

    try {
        const id = searchTerm.value;
        
        if (id.length > 2) {
            const res = await orderEmployee.getProductBySizeStore(id);
            console.log(res);
             if (res) searchResult.value = res;
             else errorText.value = "Không tìm thấy sản phẩm với ID này.";
        } else {
             // Nếu không phải số, có thể tìm theo tên (nếu store hỗ trợ)
             // const res = await productStore.getProductByNameStore(searchTerm.value);
             // ... logic xử lý danh sách kết quả ...
             errorText.value = "Vui lòng nhập ID sản phẩm (số).";
        }
    } catch (e) {
        errorText.value = "Lỗi khi tìm kiếm sản phẩm.";
    } finally {
        loading.value = false;
    }
};

// Hàm thêm sản phẩm vào danh sách đơn hàng
const addToOrder = () => {
    if (!searchResult.value) return;
    
    const existing = selectedProducts.value.find(p => p.id === searchResult.value?.product_id_sql);
    
    if (existing) {
        existing.quantity++;
    } else {
        // Mặc định chọn size/màu đầu tiên nếu có
        const defaultColor = searchResult.value.colors?.[0]?.color || 'Mặc định';
        const defaultSize = searchResult.value.colors?.[0]?.sizes?.[0]?.size || 'Free';
        const price = searchResult.value.colors?.[0]?.sizes?.[0]?.price || 100000;

        selectedProducts.value.push({
            id: searchResult.value.product_id_sql,
            name: searchResult.value.name,
            thumbnail: searchResult.value.colors[0]?.image_main,
            price: price,
            quantity: 1,
            color: defaultColor,
            size: defaultSize,
            size_id: searchResult.value?.colors[0]?.sizes[0]?._id
        });
    }
    
    // Reset search
    searchTerm.value = '';
    searchResult.value = null;
};

const removeFromOrder = (index: number) => {
    selectedProducts.value.splice(index, 1);
};

const increaseQty = (item: any) => {
    item.quantity++;
};

const decreaseQty = (item: any) => {
    if (item.quantity > 1) item.quantity--;
};

const totalAmount = computed(() => {
    return selectedProducts.value.reduce((sum, item) => sum + (item.price * item.quantity), 0);
});

const handleCreateOrder = async () => {
    if (selectedProducts.value.length === 0) return;
    // Emit sự kiện tạo đơn kèm danh sách sản phẩm
    emit('create', selectedProducts.value);

    await orderEmployee.createOrderByEmployeeStore(selectedProducts.value)
    // alert('thành công')
    // Reset và đóng
    selectedProducts.value = [];
    emit('close');
};

const handleClose = () => {
    emit('close');
};
</script>

<template>
    <teleport to="body">
        <div v-if="show" class="fixed inset-0 z-[9999] flex items-center justify-center p-4" @click="handleClose">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"></div>

            <!-- Modal Content -->
            <div 
                class="relative w-full max-w-4xl bg-[#FAFAFA] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in" 
                @click.stop
            >
                <Loading :loading="loading" />

                <!-- Header -->
                <div class="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center">
                    <h3 class="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                        <i class="fa-solid fa-cart-plus"></i> Tạo đơn hàng tại quầy
                    </h3>
                    <button @click="handleClose" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-600">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <!-- Body -->
                <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
                    
                    <!-- LEFT: Search & Product Info -->
                    <div class="w-full md:w-2/5 p-6 border-r border-gray-100 overflow-y-auto custom-scrollbar">
                        
                        <!-- Search Input -->
                        <div class="relative mb-6">
                            <input 
                                v-model="searchTerm" 
                                @keyup.enter="handleSearch"
                                type="text" 
                                placeholder="Nhập Mã sản phẩm (ID) và nhấn Enter..." 
                                class="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all shadow-sm"
                            />
                            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <button 
                                @click="handleSearch"
                                class="absolute right-2 top-1/2 -translate-y-1/2 bg-black text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
                            >
                                <i class="fa-solid fa-arrow-right text-xs"></i>
                            </button>
                        </div>

                        <!-- Error Message -->
                        <div v-if="errorText" class="p-3 mb-4 bg-red-50 text-red-600 text-xs font-bold rounded-lg flex items-center gap-2">
                            <i class="fa-solid fa-circle-exclamation"></i> {{ errorText }}
                        </div>

                        <!-- Search Result Card -->
                        <div v-if="searchResult" class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm animate-fade-in">
                            <div class="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                                <img :src="searchResult.colors[0]?.image_main" class="w-full h-full object-cover" />
                            </div>
                            <div class="space-y-2">
                                <h4 class="font-bold text-lg text-gray-900 leading-tight">{{ searchResult.name }}</h4>
                                <p class="text-xs text-gray-500">Mã SP: {{ searchResult.product_id_sql }}</p>
                                <p class="text-xs text-gray-500">Màu: {{ searchResult.colors[0]?.color }}</p>
                                <p class="text-xs text-gray-500">Size: {{ searchResult.colors[0]?.sizes[0]?.size }}</p>

                                <div class="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                                    <span class="text-xl font-black text-red-600">{{ formatPrice(searchResult.colors[0]?.sizes[0]?.sale_price || searchResult.colors[0]?.sizes[0]?.sale_price || 10000) }}</span> <!-- Demo price -->
                                    <button 
                                        @click="addToOrder"
                                        class="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                                    >
                                        <i class="fa-solid fa-plus"></i> Thêm
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Empty Search State -->
                        <div v-else class="h-64 flex flex-col items-center justify-center text-gray-400">
                            <i class="fa-solid fa-barcode text-4xl mb-2 opacity-20"></i>
                            <p class="text-xs">Nhập mã sản phẩm để tìm kiếm</p>
                        </div>
                    </div>

                    <!-- RIGHT: Order List & Summary -->
                    <div class="w-full md:w-3/5 flex flex-col bg-white">
                        <!-- List Header -->
                        <div class="p-4 border-b border-gray-100 bg-gray-50/50 font-bold text-sm text-gray-700 flex justify-between items-center">
                            <span>Danh sách đơn hàng</span>
                            <span class="text-xs bg-black text-white px-2 py-0.5 rounded-full">{{ selectedProducts.length }}</span>
                        </div>

                        <!-- Order Items List -->
                        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                            <div v-if="selectedProducts.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
                                <i class="fa-solid fa-basket-shopping text-3xl mb-2 opacity-20"></i>
                                <p class="text-xs">Chưa có sản phẩm nào</p>
                            </div>

                            <div 
                                v-for="(item, index) in selectedProducts" 
                                :key="index" 
                                class="flex gap-3 p-3 border border-gray-100 rounded-xl hover:border-gray-300 transition-colors group bg-white shadow-sm"
                            >
                                <div class="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                                    <img :src="getImage(item.thumbnail)" class="w-full h-full object-cover" />
                                </div>
                                <div class="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                        <h5 class="text-sm font-bold text-gray-900 line-clamp-1">{{ item.name }}</h5>
                                        <p class="text-[10px] text-gray-500">{{ item.color }}, {{ item.size }}</p>
                                    </div>
                                    <div class="flex justify-between items-end">
                                        <span class="text-sm font-bold text-black">{{ formatPrice(item.price * item.quantity) }}</span>
                                        
                                        <div class="flex items-center border border-gray-200 rounded bg-white">
                                            <button @click="decreaseQty(item)" class="px-2 py-0.5 text-gray-500 hover:bg-gray-100 hover:text-black transition-colors text-xs">-</button>
                                            <span class="px-2 text-xs font-bold w-6 text-center">{{ item.quantity }}</span>
                                            <button @click="increaseQty(item)" class="px-2 py-0.5 text-gray-500 hover:bg-gray-100 hover:text-black transition-colors text-xs">+</button>
                                        </div>
                                    </div>
                                </div>
                                <button @click="removeFromOrder(index)" class="text-gray-300 hover:text-red-500 transition-colors self-start p-1">
                                    <i class="fa-solid fa-trash text-xs"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Summary Footer -->
                        <div class="p-4 border-t border-gray-100 bg-gray-50">
                            <div class="flex justify-between items-center mb-4">
                                <span class="text-sm text-gray-500 font-bold">Tổng tiền</span>
                                <span class="text-xl font-black text-red-600">{{ formatPrice(totalAmount) }}</span>
                            </div>
                            <button 
                                @click="handleCreateOrder"
                                :disabled="selectedProducts.length === 0"
                                class="w-full py-3 bg-black text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-gray-800 transition-all shadow-lg shadow-black/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Tạo đơn hàng
                            </button>
                        </div>
                    </div>

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
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

.animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
}
</style>