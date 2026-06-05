<script setup lang="ts">
    import { ref, watch, computed, onMounted } from 'vue';
    import { flashSaleStore } from "@/stores/flashSale";
    import { getMainProductImage } from '@/utils/format';
    
    import type { IProductColorResponse, IProductSizeResponse, IProductMongoDetail } from '@/interfaces/product';
    import type { FlashSaleItem } from '@/interfaces/flashSale';
    import Loading from '../Loading.vue';
    import Notification from '../Notification.vue';
    
    const isNotifi = ref(false);
    const toastText = ref("");
    const loadingPage = ref(false)
    
    // --- PROPS & EMITS ---
    const props = defineProps<{
        isOpen: boolean;
        flashSale: any;
        viewMode: boolean;
    }>();
    
    const emit = defineEmits(['close', 'added']);
    const useFlashSale = flashSaleStore();
    
    // --- STATE QUẢN LÝ UI ---
    const step = ref(1); 
    const selectedProduct = ref<IProductMongoDetail | null>(null);
    
    // --- CONFIG CHI NHÁNH ---
    const branches = [
        { id: 'DN', name: 'Đà Nẵng' },
        { id: 'HN', name: 'Hà Nội' },
        { id: 'HCM', name: 'Hồ Chí Minh' }
    ];
    const selectedBranch = ref('DN');
    
    // --- DATA ---
    const productsInSale = ref<IProductMongoDetail[]>([]);  
    const productsAvailable = ref<IProductMongoDetail[]>([]); 
    
    const productVariants = ref<any[]>([]); 
    
    // Cập nhật Type để lưu trực tiếp ID
    const selectionData = ref<Record<string, { 
        price: number, 
        stock: number, 
        isSelected: boolean,
        productId: number,
        colorId: string,
        sizeId: string
    }>>({});
    
    // --- FILTER TABS LOGIC ---
    const currentFilter = ref('in_sale'); 
    
    const filterOptions = computed(() => [
        { label: 'Sản phẩm đang tham gia', value: 'in_sale', count: productsInSale.value.length },
        { label: 'Thêm sản phẩm mới', value: 'available', count: productsAvailable.value.length }
    ]);
    
    // --- COMPUTED: CHECK QUYỀN SỬA ---
    const canEdit = computed(() => {
        if (!props.flashSale) return true;
        const status = props.flashSale.status;
        return status === 'pending' || status === 'active';
    });
    
    // --- 2. FETCH DATA ---
    const fetchData = async () => {
        if (!props.isOpen) return;
        
        // Reset state UI
        step.value = 1;
        selectedProduct.value = null;
        productsInSale.value = [];
        productsAvailable.value = [];
        
        // Reset selectionData MỖI KHI tải lại dữ liệu (bao gồm đổi chi nhánh)
        selectionData.value = {}; 
        
        try {
            loadingPage.value = true;
            // Lấy danh sách đang tham gia
            const dataActive = await useFlashSale.getProductActiveByFlashSaleIdBranchStore(props.flashSale.id || 0);
            
            // Lấy danh sách chưa tham gia (Theo chi nhánh đang chọn)
            const dataNoActive = await useFlashSale.getProductNotSaleStore();
            
            if (dataActive) productsInSale.value = (dataActive || []) as IProductMongoDetail[];
            if (dataNoActive) productsAvailable.value = (dataNoActive || []) as IProductMongoDetail[];
            
            loadingPage.value = false;
        } catch (e) {
            console.error("Lỗi lấy sản phẩm:", e);
            loadingPage.value = false;
        }
    };
    
    // --- WATCHERS QUAN TRỌNG ---
    
    // 1. Khi mở Modal -> Reset về mặc định và gọi API

watch(() => props.isOpen, async (newVal) => {
    if (newVal) {
        selectedBranch.value = 'DN'; // Reset về mặc định nếu cần
        await fetchData();
    }
})      ;
onMounted(async () => {
    selectedBranch.value = 'DN';
    await fetchData()
})
  
onMounted(() => {
    if (props.isOpen) fetchData();
});
    
    // --- 3. LOGIC CHUYỂN BƯỚC ---
    const openProductDetail = (product: IProductMongoDetail) => {
        selectedProduct.value = product;
        const variants: any[] = [];
    
        if (product.colors && product.colors.length > 0) {
            product.colors.forEach((c: IProductColorResponse) => {
                if (c.sizes && c.sizes.length > 0) {
                    c.sizes.forEach((s: IProductSizeResponse) => {
                        const key = `${product.product_id_sql}-${c._id}-${s._id}`;
                        const safeOriginalPrice = s.price || 0;
    
                        variants.push({
                            key: key,
                            productId: product.product_id_sql,
                            productName: product.name,
                            colorId: c._id,
                            colorName: c.color,
                            sizeId: s._id,
                            sizeName: s.size,
                            image: c.image_main || getMainProductImage(product),
                            originalPrice: safeOriginalPrice,
                            stock: s.stock
                        });
    
                        if (!selectionData.value[key]) {
                            // Logic giá: Ưu tiên giá API trả về. Nếu null thì bằng 0.
                            let initialPrice = 0;
                            if (s.sale_price && s.sale_price > 0) {
                                initialPrice = s.sale_price;
                            } 
    
                            selectionData.value[key] = {
                                price: initialPrice,
                                stock: s.sale_stock || 0,
                                isSelected: false,
                                // Lưu ID vào đây luôn
                                productId: product.product_id_sql,
                                colorId: c._id,
                                sizeId: s._id
                            };
                        }
                    });
                }
            });
        }
    
        productVariants.value = variants;
        step.value = 2;
    };
    
    const goBack = () => {
        step.value = 1;
        selectedProduct.value = null;
    };
    
    // --- 4. COMPUTED & HELPERS ---
    const totalSelectedItems = computed(() => {
        return Object.values(selectionData.value).filter(item => item.isSelected).length;
    });
    
    const countSelectedByProduct = (productId: number) => {
        let count = 0;
        Object.keys(selectionData.value).forEach(key => {
            if (key.startsWith(productId + '-') && selectionData.value[key]?.isSelected) {
                count++;
            }
        });
        return count;
    };
    
    const formatCurrency = (val: number | null | undefined) => {
        if (!val) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };
    
    // --- 5. SUBMIT ---
    const handleFinalSave = async () => {
        if (!canEdit.value) {
            toastText.value = "Sự kiện này không thể chỉnh sửa được nữa!";
            isNotifi.value = true;
            return;
        }
    
        const selectedEntries = Object.entries(selectionData.value).filter(([_, val]) => val.isSelected);
    
        if (selectedEntries.length === 0) {
            toastText.value = "Bạn chưa chọn biến thể sản phẩm nào!";
            isNotifi.value = true;
            return;
        }
    
        // VALIDATION
        for (const [key, val] of selectedEntries) {
            const originalItem = productVariants.value.find(item => item.key === key);
            if (originalItem) {
                if (!originalItem.originalPrice || originalItem.originalPrice <= 0) {
                    toastText.value = `Sản phẩm "${originalItem.productName} - ${originalItem.colorName}" chưa có giá gốc!`;
                    isNotifi.value = true;
                    return;
                }
                if (val.stock > originalItem.stock) {
                    toastText.value = `Lỗi: "${originalItem.productName} - ${originalItem.sizeName}"\nSố lượng Sale (${val.stock}) > Tồn kho (${originalItem.stock})!`;
                    isNotifi.value = true;
                    return;
                }
                if (val.price >= originalItem.originalPrice) {
                    toastText.value = `Lỗi: "${originalItem.productName} - ${originalItem.sizeName}"\nGiá Sale phải nhỏ hơn giá gốc!`;
                    isNotifi.value = true;
                    return;
                }
            }
        }
    
        // Map dữ liệu
        const itemsPayload: FlashSaleItem[] = selectedEntries.map(([key, val]) => {
            return {
                product_id: val.productId,   
                color_id_mongo: val.colorId, 
                size_id_mongo: val.sizeId,   
                flash_sale_price: val.price, 
                stock: val.stock             
            };
        });
    
        try {
            loadingPage.value = true;
            const res = await useFlashSale.addFlashSaleItemStore(props.flashSale.id, itemsPayload);
            
            loadingPage.value = false;
            
            // Thành công: Set true
            isNotifi.value = true;
            isNotifi.value = true;
            toastText.value = "Thêm sản phẩm vào Flash Sale thành công!";
            
            emit('added');
            emit('close');
        } catch (e) {
            console.error(e);
            loadingPage.value = false;
            // Lỗi API: Set true để hiện thông báo lỗi
            isNotifi.value = true; 
            toastText.value = "Có lỗi xảy ra khi lưu dữ liệu!";
        }
    };
    </script>
    
    <template>
        <Loading :loading="loadingPage"></Loading>
        
        <Notification 
            :show="isNotifi" 
            :text="toastText"
            @update:show="isNotifi = $event"
        ></Notification>
    
        <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')"></div>
    
            <div class="relative bg-white rounded-xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden transition-all duration-300">
    
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div class="flex items-center gap-4 flex-1">
                        <button v-if="step === 2" @click="goBack"
                            class="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-600 transition-colors shadow-sm">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <div>
                            <h3 class="font-bold text-lg text-gray-800">
                                {{ step === 1 ? 'Quản lý Sản phẩm' : 'Cấu hình Biến thể' }}
                            </h3>
                            <p class="text-xs text-gray-500 font-medium mt-0.5">
                                <span v-if="canEdit" class="text-green-600">● Đang hoạt động</span>
                                <span v-else class="text-red-500">● Đã kết thúc</span>
                            </p>
                        </div>
    
                        
                    </div>
    
                    <button @click="$emit('close')" class="text-gray-400 hover:text-red-500 transition-colors">
                        <i class="fa-solid fa-xmark text-2xl"></i>
                    </button>
                </div>
    
                <div class="flex-1 overflow-hidden flex flex-col relative bg-gray-50/50">
                    <div v-if="step === 1" class="flex-1 overflow-hidden flex flex-col">
                        
                        <div class="px-4 pt-4 pb-2 bg-gray-50/50 backdrop-blur-sm z-10">
                            <div class="bg-gray-200/80 p-1 rounded-lg inline-flex gap-1 w-full sm:w-auto">
                                <button 
                                    v-for="option in filterOptions" 
                                    :key="option.value"
                                    @click="currentFilter = option.value"
                                    class="px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex-1 sm:flex-none text-center whitespace-nowrap"
                                    :class="[
                                        currentFilter === option.value
                                        ? 'bg-white text-green-600 shadow-sm ring-1 ring-black/5'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200',
                                    ]"
                                >
                                    {{ option.label }}
                                    <span class="ml-1 text-xs px-1.5 py-0.5 rounded-full" 
                                          :class="currentFilter === option.value ? 'bg-green-100 text-green-700' : 'bg-gray-300 text-gray-600'">
                                        {{ option.count }}
                                    </span>
                                </button>
                            </div>
                        </div>
    
                        <div class="flex-1 overflow-auto p-4 custom-scrollbar">
                            
                            <div v-if="currentFilter === 'in_sale'">
                                <div v-if="productsInSale.length === 0" class="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                    <i class="fa-solid fa-box-open text-3xl mb-2"></i>
                                    <p class="text-sm">Chưa có sản phẩm nào đang chạy Flash Sale.</p>
                                    <button @click="currentFilter = 'available'" class="mt-3 text-blue-600 hover:underline text-sm font-medium">
                                        Thêm sản phẩm ngay
                                    </button>
                                </div>
    
                                <div class="grid grid-cols-1 gap-3">
                                    <div v-for="prod in productsInSale" :key="prod.product_id_sql"
                                        class="bg-white p-3 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer ring-1 ring-blue-50"
                                        @click="openProductDetail(prod)">
                                        <div class="flex items-center gap-4">
                                            <img :src="getMainProductImage(prod)" class="w-14 h-14 rounded object-cover border bg-gray-100" />
                                            <div>
                                                <h4 class="font-semibold text-gray-800 text-sm group-hover:text-blue-600">{{ prod.name }}</h4>
                                                <p class="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                                    <span class="bg-blue-100 text-blue-700 px-1.5 rounded text-[10px] font-bold">ĐANG CHẠY</span>
                                                    <span>{{ prod.colors?.length || 0 }} Màu</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <div v-if="countSelectedByProduct(prod.product_id_sql) > 0" class="text-right">
                                                <span class="block text-[10px] text-gray-500 uppercase">Sửa đổi</span>
                                                <span class="font-bold text-blue-600">{{ countSelectedByProduct(prod.product_id_sql) }}</span>
                                            </div>
                                            <button class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100">
                                                <i class="fa-solid fa-pen text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
    
                            <div v-else-if="currentFilter === 'available'">
                                <div v-if="productsAvailable.length === 0" class="text-center py-10 text-gray-400">
                                    Không tìm thấy sản phẩm khả dụng nào khác.
                                </div>
    
                                <div class="grid grid-cols-1 gap-3">
                                    <div v-for="prod in productsAvailable" :key="prod.product_id_sql"
                                        class="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer opacity-95 hover:opacity-100"
                                        @click="openProductDetail(prod)">
                                        <div class="flex items-center gap-4">
                                            <img :src="getMainProductImage(prod)" class="w-14 h-14 rounded object-cover border bg-gray-100 grayscale group-hover:grayscale-0 transition-all" />
                                            <div>
                                                <h4 class="font-semibold text-gray-700 text-sm group-hover:text-green-600">{{ prod.name }}</h4>
                                                <p class="text-xs text-gray-500 mt-0.5">{{ prod.colors?.length || 0 }} Màu</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <div v-if="countSelectedByProduct(prod.product_id_sql) > 0" class="text-right">
                                                <span class="block text-[10px] text-gray-500 uppercase">Sẽ thêm</span>
                                                <span class="font-bold text-green-600">{{ countSelectedByProduct(prod.product_id_sql) }}</span>
                                            </div>
                                            <button class="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center group-hover:bg-green-50 group-hover:text-green-600 transition-colors">
                                                <i class="fa-solid fa-plus text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
    
                        </div>
                    </div>
    
                    <div v-if="step === 2" class="flex-1 overflow-auto p-4 custom-scrollbar">
                        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                            <table class="w-full text-left border-collapse">
                                <thead class="bg-blue-50/50 text-xs uppercase text-gray-600 font-semibold sticky top-0 z-10">
                                    <tr>
                                        <th class="px-4 py-3 w-12 text-center">#</th>
                                        <th class="px-4 py-3">Phân loại</th>
                                        <th class="px-4 py-3 text-right">Giá gốc</th>
                                        <th class="px-4 py-3 text-center">Kho</th>
                                        <th class="px-4 py-3 w-40 text-right">Giá Sale <span class="text-red-500">*</span></th>
                                        <th class="px-4 py-3 w-32 text-center">SL Sale <span class="text-red-500">*</span></th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    <tr v-for="item in productVariants" :key="item.key"
                                        class="hover:bg-gray-50 transition-colors"
                                        :class="{ 'bg-blue-50/30': selectionData[item.key]?.isSelected }">
                                        
                                        <template v-if="selectionData[item.key]">
                                            <td class="px-4 py-3 text-center">
                                                <input type="checkbox" v-model="selectionData[item.key]!.isSelected"
                                                    :disabled="!canEdit || !item.originalPrice || item.originalPrice <= 0" 
                                                    class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:bg-gray-200" />
                                            </td>
                                            
                                            <td class="px-4 py-3">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-10 h-10 rounded border overflow-hidden bg-gray-100">
                                                        <img v-if="item.image" :src="item.image" class="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <div class="text-sm font-medium text-gray-700">{{ item.colorName }}</div>
                                                        <div class="text-xs font-bold text-gray-500 bg-gray-100 inline-block px-1.5 rounded mt-0.5">Size: {{ item.sizeName }}</div>
                                                    </div>
                                                </div>
                                            </td>
    
                                            <td class="px-4 py-3 text-right text-sm text-gray-400 line-through">{{ formatCurrency(item.originalPrice) }}</td>
                                            <td class="px-4 py-3 text-center text-sm font-medium text-gray-600">{{ item.stock }}</td>
    
                                            <td class="px-4 py-3">
                                                <div class="relative">
                                                    <input type="number" v-model="selectionData[item.key]!.price" :disabled="!canEdit || !selectionData[item.key]!.isSelected"
                                                        class="w-full pl-3 pr-2 py-1.5 text-right text-sm border rounded-md outline-none transition-all disabled:bg-gray-100"
                                                        :class="{ 'border-red-300 bg-red-50 text-red-600': selectionData[item.key]!.price >= item.originalPrice && selectionData[item.key]!.isSelected }" />
                                                    <div v-if="selectionData[item.key]!.price >= item.originalPrice && selectionData[item.key]!.isSelected"
                                                        class="absolute -bottom-4 right-0 text-[10px] text-red-500 whitespace-nowrap">Phải nhỏ hơn giá gốc</div>
                                                </div>
                                            </td>
    
                                            <td class="px-4 py-3">
                                                <div class="relative">
                                                    <input type="number" v-model="selectionData[item.key]!.stock" :disabled="!canEdit || !selectionData[item.key]!.isSelected"
                                                        class="w-full px-2 py-1.5 text-center text-sm border rounded-md outline-none transition-all disabled:bg-gray-100"
                                                        :class="{ 'border-red-300 bg-red-50 text-red-600': selectionData[item.key]!.stock > item.stock && selectionData[item.key]!.isSelected }" />
                                                    <div v-if="selectionData[item.key]!.stock > item.stock && selectionData[item.key]!.isSelected"
                                                        class="absolute -bottom-4 left-0 right-0 text-center text-[10px] text-red-500 font-bold whitespace-nowrap">Quá tồn kho ({{ item.stock }})</div>
                                                </div>
                                            </td>
                                        </template>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
    
                <div class="px-6 py-4 border-t border-gray-200 bg-white flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div class="text-sm text-gray-600">
                        Đang chọn: <b class="text-blue-600 text-lg ml-1">{{ totalSelectedItems }}</b> phân loại
                    </div>
                    <div class="flex gap-3">
                        <button @click="$emit('close')" class="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors">Đóng</button>
                        <button v-if="canEdit" @click="handleFinalSave" :disabled="totalSelectedItems === 0 || loadingPage"
                            class="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            <i class="fa-solid fa-check-circle mr-2"></i> Xác nhận & Lưu
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </template>
    
    <style scoped>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    </style>