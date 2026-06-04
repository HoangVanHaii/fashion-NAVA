<script setup lang="ts">
import { ref, watch,  } from 'vue';
import { formatDateTime, formatPrice, getMainProductImage, getMaxProductPrice, getMinProductPrice, getTotalSold } from '../../utils/format';
import Loading from '../../components/Loading.vue';
import { flashSaleStore } from '@/stores/flashSale';
import type { IProductMongoDetail } from '@/interfaces/product';
import type { FlashSale } from '@/interfaces/flashSale';

const props = defineProps<{
    show: boolean;
    flashSale: FlashSale | null;

}>();

const emit = defineEmits(['close']);

const flashSale = flashSaleStore();
const loading = ref(false);
const products = ref<IProductMongoDetail[]>([]);
const flashSaleInfo = ref<FlashSale>();

const fetchData = async () => {
    if (!props.flashSale) return;
    loading.value = true;
    try {
        flashSaleInfo.value = props.flashSale;
        products.value = await flashSale.getProductActiveByFlashSaleIdStore(flashSaleInfo.value.id || 0);

    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

watch(() => props.show, (newVal) => {
    if (newVal) {
        fetchData();
    }
});

const totalSoldFlashSale = (products: IProductMongoDetail[]) => {
    let total = 0;
    products.forEach(p => {
        total += getTotalSold(p);
    });
    return total;
}
const handleClose = () => {
    emit('close');
};

const getStatusBadgeColor = (status: string) => {
    switch(status) {
        case 'active': return 'bg-green-100 text-green-700 border-green-200';
        case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'expired': return 'bg-gray-100 text-gray-600 border-gray-200';
        default: return 'bg-gray-50 text-gray-500 border-gray-200';
    }
}
</script>

<template>
    <teleport to="body">
        <div v-if="show" class="fixed inset-0 z-[9999] flex items-center justify-center p-4" @click="handleClose">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"></div>

            <!-- Modal Content -->
            <div class="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in" @click.stop>
                <Loading :loading="loading" />

                <!-- Header -->
                <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h3 class="text-lg font-black text-gray-900 uppercase tracking-wide flex items-center gap-3">
                            Chi tiết chiến dịch
                            <span v-if="flashSaleInfo" class="text-xs px-2 py-0.5 rounded border font-bold normal-case" :class="getStatusBadgeColor(flashSaleInfo.status || 'active')">
                                {{ flashSaleInfo.status }}
                            </span>
                        </h3>
                        <p class="text-xs text-gray-500 mt-1" v-if="flashSaleInfo">
                            {{ flashSaleInfo.title }} | 
                            {{ formatDateTime(flashSaleInfo.start_date) }} - {{ formatDateTime(flashSaleInfo.end_date) }}
                        </p>
                    </div>
                    <button @click="handleClose" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-600">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <!-- Body -->
                <div class="p-6 overflow-y-auto bg-[#FAFAFA] custom-scrollbar flex-1">
                    
                    <!-- Stats Overview (Optional) -->
                    <div class="grid grid-cols-3 gap-4 mb-6">
                        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p class="text-xs text-gray-500 uppercase font-bold">Số lượng SP</p>
                                <p class="text-xl font-black text-gray-900">{{ products.length }}</p>
                            </div>
                            <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                                <i class="fa-solid fa-layer-group"></i>
                            </div>
                        </div>
                         <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p class="text-xs text-gray-500 uppercase font-bold">Đã bán</p>
                                <p class="text-xl font-black text-gray-900">{{ totalSoldFlashSale(products) }}</p>
                            </div>
                            <div class="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                                <i class="fa-solid fa-cart-arrow-down"></i>
                            </div>
                        </div>
                         <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p class="text-xs text-gray-500 uppercase font-bold">Doanh thu dự kiến</p>
                                <p class="text-xl font-black text-gray-900">{{ formatPrice(10100100) }}</p>
                            </div>
                            <div class="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center">
                                <i class="fa-solid fa-coins"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Product List Table -->
                    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm text-left">
                                <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th class="px-6 py-3 font-bold">Sản phẩm</th>
                                        <th class="px-6 py-3 font-bold text-center">Giá gốc</th>
                                        <th class="px-6 py-3 font-bold text-center">Giá Flash Sale</th>
                                        <th class="px-6 py-3 font-bold text-center">Đã bán</th>
                                        <th class="px-6 py-3 font-bold text-center">Kho</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-50">
                                    <tr v-for="product in products" :key="product.product_id_sql" class="hover:bg-gray-50/80 transition-colors">
                                        <td class="px-6 py-4">
                                            <div class="flex items-center gap-3">
                                                <div class="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                                                    <img :src="getMainProductImage(product)" class="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <p class="font-bold text-gray-900 line-clamp-1 max-w-[200px]">{{ product.name }}</p>
                                                    <p class="text-xs text-gray-500">ID: {{ product.product_id_sql }}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 text-center text-gray-500 line-through">
                                            {{ formatPrice(getMaxProductPrice(product) || 0) }}
                                        </td>
                                        <td class="px-6 py-4 text-center">
                                            <span class="text-red-600 font-bold">{{ formatPrice(getMinProductPrice(product) || 0) }}</span> <!-- Demo price logic -->
                                        </td>
                                        <td class="px-6 py-4 text-center">
                                            <div class="flex flex-col items-center gap-1">
                                                <span class="font-bold">{{ getTotalSold(product) }}</span>
                                                <div class="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                                                    <div class="h-full bg-red-500" style="width: 40%"></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 text-center font-medium">
                                            100
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Empty State -->
                        <div v-if="products.length === 0 && !loading" class="p-10 text-center text-gray-500">
                             <i class="fa-solid fa-box-open text-3xl mb-2 opacity-50"></i>
                             <p>Không có sản phẩm nào trong chương trình này.</p>
                        </div>
                    </div>

                </div>

                <!-- Footer Actions -->
                <div class="p-4 bg-white border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 z-10">
                    <button @click="handleClose" class="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors text-sm">
                        Đóng
                    </button>
                    <!-- <button class="px-6 py-2.5 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors text-sm">
                        Chỉnh sửa
                    </button> -->
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

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
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