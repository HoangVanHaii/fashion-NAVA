<script setup lang="ts">
import { ref, computed, watch } from 'vue';

// --- INTERFACES ---
interface Size {
    _id: string;
    size: string;
    price: number;
    stock: number;
    // Các trường để nhập liệu Flash Sale
    sale_price: number | null;
    sale_stock: number;
    sale_sold: number;
    // Biến tạm để UI toggle (bật/tắt sale cho size này)
    is_enabled?: boolean; 
}

interface Color {
    _id: string;
    color: string;
    is_main: boolean;
    image_main: string;
    sizes: Size[];
}

interface ProductDetail {
    _id: string; 
    product_id_sql: string; 
    name: string;
    description: string;
    status: string;
    colors: Color[]; 
}

interface FlashSale {
    ID: string;
    title: string;
    start_date: string;
    end_date: string;
    status: string;
    product_count: number;
}

// --- PROPS & EMITS ---
const props = defineProps<{
    modelValue: boolean;
    sale: FlashSale | null;
    isViewMode: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'products-updated']);

// --- MOCK DATA (Thay bằng API thật của bạn) ---
const allProducts = ref<ProductDetail[]>([
    {
        _id: 'p1', product_id_sql: 'PROD-001', name: 'Áo Thun Basic Cotton', description: 'Thoáng mát', status: 'active',
        colors: [
            { _id: 'c1', color: 'Trắng', is_main: true, image_main: 'https://placehold.co/50', sizes: [{ _id: 's1', size: 'M', price: 150000, stock: 50, sale_price: null, sale_stock: 0, sale_sold: 0 }, { _id: 's2', size: 'L', price: 160000, stock: 40, sale_price: null, sale_stock: 0, sale_sold: 0 }] },
            { _id: 'c1b', color: 'Đen', is_main: false, image_main: 'https://placehold.co/50/black/white', sizes: [{ _id: 's3', size: 'M', price: 150000, stock: 55, sale_price: null, sale_stock: 0, sale_sold: 0 }] }
        ]
    },
    {
        _id: 'p2', product_id_sql: 'PROD-002', name: 'Quần Jeans Slim Fit', description: 'Co giãn', status: 'active',
        colors: [{ _id: 'c2', color: 'Xanh', is_main: true, image_main: 'https://placehold.co/50', sizes: [{ _id: 's4', size: '30', price: 350000, stock: 30, sale_price: null, sale_stock: 0, sale_sold: 0 }] }]
    }
]);

// --- STATE QUẢN LÝ ---
const currentView = ref<'list' | 'config'>('list'); // Quản lý màn hình hiện tại
const currentProduct = ref<ProductDetail | null>(null); // Sản phẩm đang được cấu hình
const selectedProductsMap = ref<Map<string, ProductDetail>>(new Map()); // Lưu các sản phẩm đã cấu hình xong (Key: Product ID)
const searchQuery = ref('');

// --- LOGIC ---

// Lọc sản phẩm
const filteredProducts = computed(() => {
    if (!searchQuery.value) return allProducts.value;
    return allProducts.value.filter(p => 
        p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
        p.product_id_sql.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
});

// Chuyển sang màn hình cấu hình chi tiết
const openConfigProduct = (product: ProductDetail) => {
    if (props.isViewMode) return;
    
    // Clone deep object để không sửa trực tiếp vào list gốc khi chưa lưu
    // Nếu sản phẩm đã có trong danh sách đã chọn, lấy từ đó ra để sửa tiếp
    if (selectedProductsMap.value.has(product._id)) {
        currentProduct.value = JSON.parse(JSON.stringify(selectedProductsMap.value.get(product._id)));
    } else {
        // Nếu chưa chọn, lấy từ gốc
        currentProduct.value = JSON.parse(JSON.stringify(product));
        // Mặc định enable input cho tất cả size (tuỳ chọn)
        currentProduct.value?.colors.forEach(c => c.sizes.forEach(s => s.is_enabled = false));
    }
    
    currentView.value = 'config';
};

// Lưu cấu hình của 1 sản phẩm
const confirmProductConfig = () => {
    if (!currentProduct.value) return;

    // Kiểm tra logic đơn giản (ví dụ: giá sale < giá gốc)
    let hasError = false;
    currentProduct.value.colors.forEach(c => {
        c.sizes.forEach(s => {
            if (s.is_enabled) {
                if (!s.sale_price || s.sale_price <= 0) hasError = true;
                if (!s.sale_stock || s.sale_stock <= 0 || s.sale_stock > s.stock) hasError = true;
            }
        });
    });

    // (Bạn có thể thêm thông báo lỗi ở đây nếu cần)
    
    // Lưu vào Map
    selectedProductsMap.value.set(currentProduct.value._id, currentProduct.value);
    
    // Quay về list
    currentView.value = 'list';
    currentProduct.value = null;
};

// Xóa sản phẩm khỏi danh sách đã chọn
const removeProductFromSale = (productId: string) => {
    selectedProductsMap.value.delete(productId);
};

// Lưu toàn bộ vào Database (Nút Lưu ở Footer)
const handleSaveAll = () => {
    const finalData = Array.from(selectedProductsMap.value.values());
    console.log("Dữ liệu gửi lên server:", finalData);
    
    alert(`Đã lưu ${finalData.length} sản phẩm vào Flash Sale!`);
    emit('products-updated', finalData.length);
    closeModal();
};

const closeModal = () => {
    emit('update:modelValue', false);
    currentView.value = 'list';
    searchQuery.value = '';
};

const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString('vi-VN') + ' ₫';
};

// Reset khi mở modal
watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        // Nếu là mode Add mới thì reset
        // Nếu là Edit mode thì cần code đổ dữ liệu cũ vào selectedProductsMap ở đây
        if (!props.isViewMode) {
             // selectedProductsMap.value.clear(); // Uncomment nếu muốn reset mỗi lần mở
        }
    }
});
</script>

<template>
    <div v-if="modelValue" class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            
            <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                    <h4 class="text-xl font-bold text-gray-800">
                        <span v-if="currentView === 'config'" class="text-gray-500 font-normal cursor-pointer hover:text-blue-600" @click="currentView = 'list'">
                            Danh sách SP <i class="fa-solid fa-chevron-right text-xs mx-2"></i>
                        </span>
                        {{ currentView === 'list' ? 'Thêm Sản phẩm vào Sale' : 'Thiết lập Giá & Số lượng' }}
                    </h4>
                    <p class="text-sm text-gray-500 mt-1" v-if="sale">
                        Chiến dịch: <span class="font-semibold text-blue-600">{{ sale.title }}</span>
                    </p>
                </div>
                <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <div class="flex-1 overflow-hidden bg-white relative">
                
                <div v-if="currentView === 'list'" class="h-full flex flex-col p-6">
                    <div class="mb-4 relative">
                        <input v-model="searchQuery" type="text" placeholder="Tìm kiếm sản phẩm..."
                            class="w-full border border-gray-300 rounded-lg py-2.5 pl-4 pr-10 focus:border-blue-500 outline-none">
                        <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    </div>

                    <div class="flex-1 overflow-y-auto custom-scrollbar border border-gray-200 rounded-lg">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                                    <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Giá gốc</th>
                                    <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Kho</th>
                                    <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Hành động</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                <tr v-for="product in filteredProducts" :key="product._id" class="hover:bg-gray-50 transition-colors">
                                    <td class="px-6 py-4">
                                        <div class="flex items-center space-x-3">
                                            <img :src="product.colors.find(c => c.is_main)?.image_main" class="w-10 h-10 rounded border object-cover">
                                            <div>
                                                <div class="font-medium text-gray-900 text-sm">{{ product.name }}</div>
                                                <div class="text-xs text-gray-500">{{ product.product_id_sql }}</div>
                                            </div>
                                            <span v-if="selectedProductsMap.has(product._id)" class="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                                                Đã thiết lập
                                            </span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-center text-sm">{{ formatCurrency(product.colors[0]?.sizes[0]?.price) }}</td>
                                    <td class="px-6 py-4 text-center text-sm">{{ product.colors.reduce((acc, c) => acc + c.sizes.reduce((sAcc, s) => sAcc + s.stock, 0), 0) }}</td>
                                    <td class="px-6 py-4 text-center">
                                        <div v-if="selectedProductsMap.has(product._id)" class="flex items-center justify-center gap-2">
                                            <button @click="openConfigProduct(product)" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Sửa</button>
                                            <button @click="removeProductFromSale(product._id)" class="text-red-500 hover:text-red-700 text-sm font-medium">Xóa</button>
                                        </div>
                                        <button v-else @click="openConfigProduct(product)" 
                                            class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm font-medium transition-colors">
                                            <i class="fa-solid fa-gear mr-1"></i> Thiết lập
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div v-if="currentView === 'config' && currentProduct" class="h-full flex flex-col p-6 animate-fade-in-right">
                    <div class="flex items-start gap-4 mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <img :src="currentProduct.colors.find(c => c.is_main)?.image_main" class="w-16 h-16 rounded-md object-cover bg-white border">
                        <div>
                            <h3 class="font-bold text-gray-900 text-lg">{{ currentProduct.name }}</h3>
                            <p class="text-sm text-gray-500">Mã SP: {{ currentProduct.product_id_sql }}</p>
                            <p class="text-sm text-blue-600 mt-1"><i class="fa-solid fa-circle-info mr-1"></i> Vui lòng chọn size tham gia và nhập giá sale.</p>
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto custom-scrollbar border border-gray-200 rounded-lg">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Phân loại hàng</th>
                                    <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">Giá gốc</th>
                                    <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tồn kho</th>
                                    <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 w-32">Giá Khuyến Mãi</th>
                                    <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 w-32">SL Khuyến Mãi</th>
                                    <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 w-20">Bật/Tắt</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                <template v-for="color in currentProduct.colors" :key="color._id">
                                    <tr v-for="(size, index) in color.sizes" :key="size._id" :class="{'bg-gray-50': !size.is_enabled}">
                                        <td class="px-4 py-3">
                                            <div class="flex items-center gap-2">
                                                <img v-if="index === 0" :src="color.image_main" class="w-8 h-8 rounded border object-cover">
                                                <div v-else class="w-8 h-8"></div> <div>
                                                    <div class="text-sm font-medium">{{ color.color }}</div>
                                                    <div class="text-xs text-gray-500">Size: {{ size.size }}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-4 py-3 text-center text-sm text-gray-500">{{ formatCurrency(size.price) }}</td>
                                        <td class="px-4 py-3 text-center text-sm text-gray-500">{{ size.stock }}</td>
                                        
                                        <td class="px-4 py-3">
                                            <div class="relative">
                                                <input type="number" v-model="size.sale_price" :disabled="!size.is_enabled"
                                                    class="w-full border rounded px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                                    placeholder="Nhập giá">
                                                <span v-if="size.is_enabled && (!size.sale_price || size.sale_price >= size.price)" class="text-[10px] text-red-500 block text-center mt-1">Giá không hợp lệ</span>
                                            </div>
                                        </td>

                                        <td class="px-4 py-3">
                                            <div class="relative">
                                                <input type="number" v-model="size.sale_stock" :disabled="!size.is_enabled"
                                                    class="w-full border rounded px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                                    placeholder="SL">
                                                <span v-if="size.is_enabled && (!size.sale_stock || size.sale_stock > size.stock)" class="text-[10px] text-red-500 block text-center mt-1">SL quá kho</span>
                                            </div>
                                        </td>

                                        <td class="px-4 py-3 text-center">
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" v-model="size.is_enabled" class="sr-only peer">
                                                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <div class="p-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-xl">
                <template v-if="currentView === 'list'">
                    <div class="text-sm text-gray-600">
                        Đã thiết lập: <span class="font-bold text-blue-600">{{ selectedProductsMap.size }}</span> sản phẩm
                    </div>
                    <div class="flex gap-3">
                        <button @click="closeModal" class="px-5 py-2 text-sm font-medium rounded-lg bg-white border border-gray-300 hover:bg-gray-100">Đóng</button>
                        <button @click="handleSaveAll" :disabled="selectedProductsMap.size === 0" class="px-5 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            <i class="fa-solid fa-save mr-1"></i> Lưu Flash Sale
                        </button>
                    </div>
                </template>

                <template v-else>
                    <button @click="currentView = 'list'" class="text-sm text-gray-500 hover:text-gray-800 font-medium">
                        <i class="fa-solid fa-arrow-left mr-1"></i> Quay lại danh sách
                    </button>
                    <button @click="confirmProductConfig" class="px-6 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-md">
                        Xác nhận SP này
                    </button>
                </template>
            </div>

        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

/* Hiệu ứng trượt nhẹ khi chuyển view */
@keyframes fadeInRight {
    from { opacity: 0; transform: translateX(10px); }
    to { opacity: 1; transform: translateX(0); }
}
.animate-fade-in-right {
    animation: fadeInRight 0.3s ease-out;
}
</style>