<script setup lang="ts">
import type { IProductMongoDetail } from "../interfaces/product";
import { checkProductSale, formatPrice, getMainProductImage, getMaxProductPrice, getMinProductPrice } from "../utils/format";
import { onMounted, computed, ref } from "vue";
import { useRouter } from "vue-router";
import Header from "../components/Header.vue";
import Footer from "../components/Footer.vue"; // Added footer
// import AddToCart from "../components/AddToCart.vue";
import { useFavouriteStore } from "../stores/favourite";
import Loading from "../components/Loading.vue"; // Added loading
import { useProductStore } from "@/stores/product";

const router = useRouter();
const product = useProductStore();
const products = ref<IProductMongoDetail[]>([]);
const showFormAdd = ref(false);
const showMore = ref(false);
const favourite = useFavouriteStore();
const isLoading = ref(false);

onMounted(async () => {
  isLoading.value = true;
  // Fetch similar products (e.g., category "áo" or random recommendations)
  products.value = await product.searchByCategoryGenderStore("Nam");
  await favourite.getFavouriteOfMeStore();
  isLoading.value = false;
});

const productDetail = ref<IProductMongoDetail>();
const handleCart = async (id: number) => {
  productDetail.value = await product.getProductByIdStore(id);
  if (productDetail.value) {
    showFormAdd.value = true;
  }
};

const btnShowMore = () => {
  showMore.value = !showMore.value;
};

const displayProduct = computed(() => {
  if (!products.value) return [];
  return showMore.value ? products.value : products.value.slice(0, 10);
});
</script>

<template>
  <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900 flex flex-col">
    <Header />
    <Loading :loading="isLoading" />
    
    <main class="flex-1 pb-10">
        <div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            
            <!-- Success Message Card -->
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 sm:p-16 text-center max-w-2xl mx-auto mt-10 animate-scale-up">
                <div class="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-100">
                    <i class="fa-solid fa-check text-4xl text-green-500"></i>
                </div>
                
                <h1 class="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tight mb-3">Đặt hàng thành công!</h1>
                <p class="text-gray-500 mb-8 leading-relaxed">
                    Cảm ơn bạn đã tin tưởng và mua sắm tại NAVA.<br class="hidden sm:block">
                    Đơn hàng của bạn đang được xử lý và sẽ sớm được giao đến tay bạn.
                </p>
                
                <div class="flex flex-col sm:flex-row justify-center gap-4">
                    <button 
                        @click="router.push('/profile/orderOfme')" 
                        class="px-8 py-3 border-2 border-black text-black font-bold rounded-lg hover:bg-black hover:text-white transition-all uppercase tracking-wide text-sm"
                    >
                        Xem đơn hàng
                    </button>
                    <button 
                        @click="router.push('/home')" 
                        class="px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-all shadow-lg uppercase tracking-wide text-sm"
                    >
                        Tiếp tục mua sắm
                    </button>
                </div>
            </div>

            <!-- Recommendation Section -->
            <div class="mt-10" v-if="products.length > 0">
                <div class="text-center mb-10">
                    <h2 class="text-2xl font-black text-gray-900 uppercase tracking-widest mb-2">Xem thêm sản phẩm</h2>
                    <div class="w-12 h-1 bg-black mx-auto rounded-full"></div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <div 
                        v-for="(prod, index) in displayProduct" 
                        :key="index"
                        class="group cursor-pointer"
                        @click="router.push({ name: 'product-detail', params: { id: prod.product_id_sql } })"
                    >
                        <div class="relative aspect-[3/4] bg-white rounded-xl overflow-hidden mb-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                            <img :src="getMainProductImage(prod)" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            
                            <!-- Badge -->
                            <div class="absolute top-3 left-3 flex flex-col gap-1">
                                <span v-if="checkProductSale(prod)" class="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-md tracking-wider">SALE</span>
                            </div>

                            <!-- Action Buttons -->
                            <div class="absolute bottom-3 right-3 flex flex-col gap-2 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <button @click.stop="handleCart(prod.product_id_sql)" class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-black hover:text-white transition-colors">
                                    <i class="fa-solid fa-cart-plus text-sm"></i>
                                </button>
                                <button @click.stop="favourite.toggleFavouriteInstant(prod.product_id_sql)" class="w-9 h-9 bg-white text-black rounded-full shadow-md flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                                    <i :class="favourite.isFavourite(prod.product_id_sql) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-sm'"></i>
                                </button>
                            </div>
                        </div>

                        <div class="px-1">
                            <p class="text-[10px] text-gray-400 uppercase font-bold mb-0.5 line-clamp-1">NAVA Collection</p>
                            <h4 class="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors mb-1">{{ prod.name }}</h4>
                            <div class="flex items-center gap-2">
                                <span class="text-red-600 font-black text-base">{{ formatPrice(getMinProductPrice(prod) || 0) }}</span>
                                <span v-if="checkProductSale(prod)" class="text-gray-400 text-xs line-through font-medium">{{ formatPrice(getMaxProductPrice(prod) || 0) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-12 text-center">
                    <button 
                        @click="btnShowMore" 
                        class="inline-flex items-center gap-2 px-8 py-3 border border-gray-300 text-gray-600 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white hover:border-black transition-all rounded-full"
                    >
                        {{ showMore ? "Thu gọn" : "Xem thêm sản phẩm" }}
                        <i :class="showMore ? 'fa-solid fa-angle-up' : 'fa-solid fa-arrow-right'"></i>
                    </button>
                </div>
            </div>

        </div>
    </main>

    <Footer />
    
    <AddToCart
      v-if="showFormAdd && productDetail"
      :product="productDetail"
      @close="showFormAdd = false"
    />
  </div>
</template>

<style scoped>
.animate-scale-up {
    animation: scaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes scaleUp {
    from { opacity: 0; transform: scale(0.9) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>