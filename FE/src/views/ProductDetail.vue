<script setup lang="ts">
    import { ref, onMounted, watch, computed } from "vue";
    import { useRoute, useRouter } from "vue-router";
    import Header from "../components/Header.vue";
    import { formatPrice, formatDateTime, getMainProductImage, checkProductSale, getMinProductPrice, getMaxProductPrice } from "../utils/format";
    import type { IProductColorResponse, IProductMongoDetail, IProductSizeResponse } from "../interfaces/product";
    import Notification from "@/components/Notification.vue";
    import Loading from "../components/Loading.vue";
    import { useFavouriteStore } from "../stores/favourite";
    import { useAuthStore } from "@/stores/auth";
    import { useProductStore } from "@/stores/product";
    import type { Category } from "@/interfaces/category";
    import type { BrandRatingResult, IBrandResponse } from "@/interfaces/brand";
    import Footer from "@/components/Footer.vue";
    import Brand from "./Brand.vue";
    import { useCartStore } from "@/stores/cartStore";
    import type { ICartItem } from "@/interfaces/cart";
    import { useReviewStore } from "@/stores/reviewStore"; 
    import { useAnimationStore } from "@/stores/animation";
    
    const loadingAddToCart = ref(false);
    const favourite = useFavouriteStore();
    const auth = useAuthStore();
    const route = useRoute();
    const router = useRouter();
    const product = useProductStore();
    const cart = useCartStore(); 
    const reviewStore = useReviewStore();
    
    const url_main = ref<string>();
    const productId = ref<IProductMongoDetail>();
    const colorChose = ref<IProductColorResponse>();
    const sizeChose = ref<IProductSizeResponse>();
    const quantity = ref<number>(1);
    const listpProducts = ref<IProductMongoDetail[]>();
    const selectedRating = ref<number | null>(null);
    const showReview = ref<boolean>(false);
    const indexImage = ref<number>(-1);
    
    // --- [SỬA ĐỔI 1] THÊM STATE CHO VIDEO ---
    const isShowVideo = ref<boolean>(false); 
    // ---------------------------------------
    
    // isSuccess: true (Xanh - Thành công), false (Đỏ - Lỗi)
    const isSuccess = ref<boolean>(true); 
    const toastText = ref("");
    const copied = ref<Boolean>(false);
    
    const listImg = ref<string[]>([])
    const index = ref<number>(0);
    const category = ref<Category>()
    const brand = ref<IBrandResponse>();
    const showBrandModal = ref(false);
    const currentBrandId = ref<number>(0);
    const brandRating = ref<BrandRatingResult>();
    
    // --- STATE CHO CHỨC NĂNG CHILD REVIEW & UPLOAD ẢNH ---
    const replyingToId = ref<string | null>(null);
    const replyContent = ref("");
    const replyLoading = ref(false);
    const replyFiles = ref<File[]>([]); 
    
    // Dùng Object để quản lý nhiều input file trong v-for
    const fileInputReplyRefs = ref<Record<string, HTMLInputElement>>({}); 
    
    // --- [STATE EDIT] ---
    const editingChildId = ref<string | null>(null);
    const editContent = ref("");
    const editFiles = ref<File[]>([]); 
    // Thêm ref quản lý input file cho edit
    const fileInputEditRefs = ref<Record<string, HTMLInputElement>>({}); 
    
    // --- [HÀM HELPER HIỂN THỊ TOAST] ---
    const showToast = (message: string, success: boolean = true) => {
        isSuccess.value = success; 
        toastText.value = "";      
        setTimeout(() => {
            toastText.value = message; 
        }, 100);
    };
    
    // --- CÁC HÀM HELPER CŨ ---
    const handleOpenBrand = (id: number) => {
        currentBrandId.value = id;
        showBrandModal.value = true;
    };
    
    const handleOrder = (size: IProductSizeResponse) => {
        handleAddToCart();
    }
    
    // --- [SỬA ĐỔI 2] RESET VIDEO KHI LOAD ẢNH MỚI ---
    const loadImg = (color: IProductColorResponse) => {
        listImg.value = [];
        index.value = 0;
        isShowVideo.value = false; // Reset về xem ảnh
        if (color) {
            listImg.value.push(color.image_main);
            color.color_images?.forEach(i => {
                listImg.value.push(i.toString());
            })
        }
    }
    
    const loadData = async () => {
        const id = Number(route.params.id as string);
        productId.value = await product.getProductByIdStore(id);
        await reviewStore.getReviewsByProductIdStore(id);
        console.log("aaaaa", productId.value)
    
        if (productId.value?.colors) {
            colorChose.value = productId.value.colors.find((cl) => cl.is_main == true) || productId.value.colors[0];
        }
        
        if (colorChose.value) {
            loadImg(colorChose.value);
            sizeChose.value = colorChose.value.sizes[0]; 
            url_main.value = colorChose.value.image_main;
        }
        // console.log("aaaa", productId.value);
        let result = await product.searchByCategoryIdStore(productId.value?.category_id || 0);
        listpProducts.value = result;
        listpProducts.value = result.filter((p) => p._id !== productId.value?._id);
    
        if (productId.value?.category_id) {
            category.value = await product.getCategoryNameStore(productId.value.category_id);
        }
        if (productId.value?.brand_id) {
            brand.value = await product.getBrandByIdStore(productId.value.brand_id);
            brandRating.value = await product.getRatingOfbrandStore(productId.value.brand_id);
        }
    };
    
    onMounted(async () => {
        await loadData();
        if (auth.isLogin) {
            await favourite.getFavouriteOfMeStore();
            await auth.getProfileStore();
        }
    });
    
    watch(quantity, (newVal) => {
        const max = sizeChose.value?.stock ?? Infinity;
        if (newVal < 1) quantity.value = 1;
        else if (newVal > max) quantity.value = max;
    });
    
    watch(() => route.params.id, async (newId, oldId) => {
        if (newId !== oldId) {
            reviewStore.resetReviewState();
            router.go(0);
        }
    });
    const animationStore = useAnimationStore();
    const productImageRef = ref<HTMLElement | null>(null);
    
    const getUniqueSizes = () => {
        const getUniqueSizes = new Set<string>();
        productId.value?.colors.forEach((color) => {
            color.sizes.forEach((size) => {
                getUniqueSizes.add(size.size);
            });
        });
        return [...getUniqueSizes].join(" - ");
    };
    
    const filteredReviews = computed(() => {
        if (selectedRating.value === null) return reviewStore.reviews;
        return reviewStore.reviews.filter((r: any) => Math.round(r.rating) === selectedRating.value);
    });
    
    const handleFilter = (rating: number | null) => {
        selectedRating.value = rating;
    };
    
    // --- [SỬA ĐỔI 3] RESET VIDEO KHI NEXT/PREV ẢNH ---
    const handleIncre = () => {
        isShowVideo.value = false; // Chuyển về ảnh
        indexImage.value++;
        if (indexImage.value >= 4) indexImage.value = -1;
        if (index.value < listImg.value.length - 1) index.value++;
        else index.value = 0;
    };
    
    const hanlderDecre = () => {
        isShowVideo.value = false; // Chuyển về ảnh
        indexImage.value--;
        if (indexImage.value < -1) indexImage.value = 3;
        if (index.value > 0) index.value--;
        else index.value = listImg.value.length - 1;
    };
    
    // --- LOGIC MUA NGAY ---
    const handleBuyNow = () => {
        if (!productId.value || !sizeChose.value) {
            showToast("Vui lòng chọn phân loại hàng!", false);
            return;
        }
    
        const token = localStorage.getItem("accessToken");
        if (!token) {
            showToast("Vui lòng đăng nhập để mua ngay!", false);
            setTimeout(() => { router.push('/auth/login'); }, 1500); 
            return;
        }
    
        if (sizeChose.value.stock <= 0) {
            showToast("Sản phẩm này tạm hết hàng!", false);
            return;
        }
    
        const unitPrice = sizeChose.value.sale_price ?? sizeChose.value.price ?? 0;
        const finalQuantity = quantity.value || 1;
        const totalPrice = unitPrice * finalQuantity;
    
        const buyNowItem = {
            _id: sizeChose.value._id,
            product_id_sql: productId.value.product_id_sql,
            name: productId.value.name,
            price: unitPrice,
            quantity: finalQuantity,
            total_price: totalPrice,
            size_id_mongo: sizeChose.value._id,
            variant: {
                color: {
                    image_main: colorChose.value?.image_main || '',
                    color: colorChose.value?.color || ''
                },
                size: {
                    size: sizeChose.value.size,
                    size_id_mongo: sizeChose.value._id
                }
            }
        };
    
        cart.setCheckoutSession({
            items: [JSON.parse(JSON.stringify(buyNowItem))],
            voucher: null, 
            totalAmount: totalPrice,
            discountAmount: 0,
            finalAmount: totalPrice,
            checkout_source: "buy_now"
        });
    
        console.log("✅ Checkout Session Created:", cart.checkoutSession);
        router.push("/payment");
    };
    
    // --- LOGIC CHILD REVIEW & UPLOAD ---
    const isMine = (child: any) => {
        const myId = auth.user?.user_id || localStorage.getItem("user_id"); 
        const creatorId = child.user?.id || child.user_id || child.user;
        return myId && creatorId && (String(creatorId) === String(myId));
    };
    
    const toggleReplyForm = (reviewId: string) => {
        if (replyingToId.value === reviewId) {
            replyingToId.value = null;
        } else {
            replyingToId.value = reviewId;
        }
        replyContent.value = "";
        replyFiles.value = [];
    };
    
    const handleReplyFileChange = (event: Event) => {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            replyFiles.value = [...replyFiles.value, ...Array.from(input.files)];
        }
        if (input) input.value = '';
    };
    
    const removeReplyFile = (index: number) => {
        replyFiles.value.splice(index, 1);
    };
    
    const triggerReplyFileInput = (reviewId: string) => {
        const inputEl = fileInputReplyRefs.value[reviewId];
        if (inputEl) {
            inputEl.click();
        } else {
            console.error("Không tìm thấy input file cho review:", reviewId);
        }
    }
    
    const getPreviewUrl = (file: File) => {
        return URL.createObjectURL(file);
    }
    
    const handleSubmitReply = async (parentId: string) => {
        console.log("🔥 Submitting Reply for Parent ID:", parentId);
        
        if (!replyContent.value.trim() && replyFiles.value.length === 0) {
            showToast("Vui lòng nhập nội dung hoặc chọn ảnh!", false); 
            return;
        }
    
        if (!auth.user) {
            showToast("Vui lòng đăng nhập để trả lời!", false);
            return;
        }
    
        replyLoading.value = true;
        
        const userForStore = {
            id: auth.user.user_id,
            name: auth.user.name,
            avatar: auth.user.avatar
        };
    
        const success = await reviewStore.replyReviewStore(
            parentId, 
            replyContent.value, 
            userForStore,
            replyFiles.value
        );
        
        if (success) {
            showToast("Đã gửi phản hồi thành công!", true); 
            replyingToId.value = null; 
            replyContent.value = "";
            replyFiles.value = []; 
        }
        else {
          if (reviewStore.mustbeLogin) {
            router.push({name:'login'})
          }
        }
        replyLoading.value = false;
    };
    
    // --- LOGIC EDIT ---
    const startEditChild = (child: any) => {
        editingChildId.value = child._id;
        editContent.value = child.comment;
        editFiles.value = []; 
    };
    
    const cancelEdit = () => {
        editingChildId.value = null;
        editContent.value = "";
        editFiles.value = []; 
    };
    
    const handleEditFileChange = (event: Event) => {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            editFiles.value = [...editFiles.value, ...Array.from(input.files)];
        }
        if (input) input.value = '';
    };
    
    const removeEditFile = (index: number) => {
        editFiles.value.splice(index, 1);
    };
    
    const triggerEditFileInput = (childId: string) => {
        const inputEl = fileInputEditRefs.value[childId];
        if (inputEl) {
            inputEl.click();
        }
    }
    

    
    const handleUpdateChild = async (parentId: string, childId: string) => {
        if (!editContent.value.trim() && editFiles.value.length === 0) return;
        
        const success = await reviewStore.editChildReviewStore(
            parentId, 
            childId, 
            editContent.value, 
            editFiles.value 
        );
        
        if (success) {
            cancelEdit();
            showToast("Đã cập nhật phản hồi!", true); 
        }
    };
    
    const handleDeleteChild = async (parentId: string, childId: string) => {
        if(!confirm("Bạn có chắc muốn xóa phản hồi này?")) return;
        
        await reviewStore.deleteChildReviewStore(parentId, childId);
        showToast("Đã xóa thành công!", true); 
    };
    
    // --- CART LOGIC ---
    const handleAddToCart = async (size?: IProductSizeResponse) => { 
        const targetSize = size || sizeChose.value; 
        if (!targetSize || !productId.value) return;
    
        const login = localStorage.getItem("accessToken") ? true : false;
        if (!login) {
            showToast("Vui lòng đăng nhập để thêm vào giỏ hàng!", false); 
            return;
        }
        if (loadingAddToCart.value) return;
        loadingAddToCart.value = true;
    
        try {
            const cartItem: ICartItem = {
                size_id_mongo: targetSize._id,
                product_id_sql: productId.value.product_id_sql,
                quantity: quantity.value || 1
            }
            await cart.addToCartAction(cartItem);
            if (productImageRef.value) {
                const currentImgUrl = colorChose.value?.image_main || getMainProductImage(productId);
                animationStore.triggerFlyToCart(productImageRef.value, currentImgUrl);
            }
            if (!cart.error) { 
                showToast("🛒 Thêm vào giỏ hàng thành công!", true);
            } else {
                showToast(cart.error || "❌ Thêm vào giỏ hàng thất bại!", false);
            }
        } catch (error: any) {
            showToast(error.message || "❌ Lỗi hệ thống!", false);
        } finally {
            loadingAddToCart.value = false;
        }
    };
    const getVideoThumbnail = (videoUrl: string | undefined) => {
    if (!videoUrl) return '';
    // Mẹo: Thay đuôi file (.mp4, .mov...) thành .jpg
    return videoUrl.replace(/\.[^/.]+$/, ".jpg");
}
    const handleSelectColor = (color: IProductColorResponse) => {
        colorChose.value = color;
        sizeChose.value = color.sizes[0];
        loadImg(color);
        quantity.value = 1;
    };
    
    const currentMainImage = computed(() => {
        if (listImg.value && listImg.value.length > 0 && listImg.value[index.value]) {
            return listImg.value[index.value];
        }
        return colorChose.value?.image_main;
    })
    </script>
    
    <template>
      <Header />
      <div class="bg-[#FAFAFA] min-h-screen font-sans text-gray-900">
        <Loading :loading="product.loading || loadingAddToCart || reviewStore.loading" /> 
        
        <main v-if="!product.loading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 relative">
            <div class="lg:col-span-6 space-y-6">
              
              <div class="relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 group aspect-[4/5] lg:aspect-auto lg:h-[670px]">
                <video 
                    v-if="isShowVideo && productId?.video" 
                    :src="productId.video" 
                    controls 
                    autoplay 
                    class="w-full h-full object-contain bg-black"
                ></video>
    
                <img 
                    v-else
                    ref="productImageRef" 
                    :src="currentMainImage" 
                    class="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105 cursor-zoom-in" 
                    alt="Main Product Image" 
                />
    
                <div v-if="!isShowVideo" class="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between lg:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click="hanlderDecre" class="w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center text-black hover:bg-black hover:text-white transition-all"><i class="fa-solid fa-chevron-left"></i></button>
                    <button @click="handleIncre" class="w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center text-black hover:bg-black hover:text-white transition-all"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
    
                <div v-if="sizeChose?.sale_price" class="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wide animate-pulse z-10">
                    Sale -{{ Math.round((1 - (sizeChose.sale_price / (sizeChose.price || 1))) * 100) }}%
                </div>
              </div>
              <div class="grid grid-cols-6 gap-2"> 
                
                <div 
                    v-if="productId?.video" 
                    class="aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-300 transform hover:-translate-y-1 relative group"
                    :class="isShowVideo ? 'border-black ring-2 ring-black/10' : 'border-transparent opacity-80 hover:opacity-100'"
                    @click="isShowVideo = true"
                >
                    <img :src="getVideoThumbnail(productId.video) || ''" class="w-full h-full object-cover blur-[1px]" />
                    <div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                        <div class="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <i class="fa-solid fa-play text-xs text-black ml-0.5"></i>
                        </div>
                    </div>
                </div>
    
                <div 
                    v-for="(imgSrc, i) in listImg" 
                    :key="i" 
                    class="aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-300 transform hover:-translate-y-1" 
                    :class="(!isShowVideo && index === i) ? 'border-black ring-2 ring-black/10' : 'border-transparent opacity-60 hover:opacity-100'" 
                    @click="index = i; isShowVideo = false"
                >
                  <img :src="imgSrc" class="w-full h-full object-cover" />
                </div>
              </div>
              </div>
    
            <div class="lg:col-span-6 relative">
                <div class="lg:sticky lg:top-28 space-y-8 bg-white p-6 lg:p-8 rounded-3xl shadow-xl border border-gray-100/50">
                    <div class="space-y-4">
                        <div class="flex justify-between items-start">
                            <h1 class="text-2xl lg:text-3xl font-black text-gray-900 leading-tight tracking-tight">{{ productId?.name }}</h1>
                            <button @click.stop="productId && favourite.toggleFavouriteInstant(productId.product_id_sql)" class="w-10 h-10 flex-shrink-0 rounded-full bg-gray-50 hover:bg-red-50 flex items-center justify-center transition-colors group focus:outline-none focus:ring-0">
                                 <i :class="productId && favourite.isFavourite(productId.product_id_sql) ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart text-gray-400 group-hover:text-red-500'"></i>
                            </button>
                        </div>
                        <div class="flex items-center gap-4 text-sm">
                            <div class="flex text-yellow-400 text-xs"><i class="fa-solid fa-star" v-for="n in 5" :key="n" :class="n <= 5 ? '' : 'text-gray-200'"></i></div>
                            <span class="text-gray-400">|</span>
                            <span class="text-gray-500">Mã SP: <span class="font-mono font-medium text-black">{{ productId?.product_id_sql }}</span></span>
                        </div>
                        <div class="flex items-end gap-3 pt-2">
                            <span class="text-3xl font-black text-gray-900">{{ formatPrice(sizeChose?.sale_price || sizeChose?.price || 0) }}</span>
                            <span v-if="sizeChose?.sale_price" class="text-lg text-gray-400 line-through mb-1 font-medium">{{ formatPrice(sizeChose?.price || 0) }}</span>
                        </div>
                    </div>
                    <hr class="border-dashed border-gray-200" />
                    <div class="space-y-6">
                        <div>
                            <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Màu sắc</h3>
                            <div class="flex flex-wrap gap-3">
                                <div v-for="(color, i) in productId?.colors" :key="i" class="group relative w-12 h-12 cursor-pointer rounded-full overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md" :class="colorChose?._id === color._id ? 'ring-2 ring-offset-2 ring-black scale-110' : 'hover:scale-105'" @click="handleSelectColor(color)">
                                    <img :src="color.image_main" class="w-full h-full object-cover" />
                                    <div v-if="colorChose?._id === color._id" class="absolute inset-0 bg-black/10 flex items-center justify-center"><i class="fa-solid fa-check text-white text-xs drop-shadow-md"></i></div>
                                </div>
                            </div>
                            <p class="text-xs text-gray-500 mt-2 font-medium">Đang chọn: <span class="text-black">{{ colorChose?.color }}</span></p>
                        </div>
                        <div>
                            <div class="flex justify-between items-center mb-3">
                                 <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wide">Kích thước</h3>
                                 <span class="text-xs text-blue-600 font-medium cursor-pointer hover:underline underline-offset-2">Bảng quy đổi size</span>
                            </div>
                            <div class="grid grid-cols-4 gap-2">
                                <button v-for="(size, i) in colorChose?.sizes" :key="i" class="py-2 text-sm font-bold border rounded-xl transition-all duration-200 relative overflow-hidden" :class="[size._id === sizeChose?._id ? 'border-black bg-black text-white shadow-lg shadow-black/20 transform scale-105' : 'border-gray-200 text-gray-600 hover:border-black hover:text-black bg-white', size.stock <= 0 ? 'opacity-40 cursor-not-allowed bg-gray-50' : '']" :disabled="size.stock <= 0" @click="sizeChose = size">
                                    {{ size.size }}
                                    <div v-if="size.stock <= 0" class="absolute inset-0 flex items-center justify-center"><div class="w-[120%] h-[1px] bg-gray-400 rotate-45"></div></div>
                                </button>
                            </div>
                        </div>
                        <div>
                            <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Số lượng</h3>
                            <div class="flex items-center justify-between bg-gray-50 rounded-xl p-2 border border-gray-200">
                                 <div class="flex items-center">
                                    <button class="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-black hover:shadow-md transition-all active:scale-95" @click="quantity = Math.max(quantity - 1, 1)"><i class="fa-solid fa-minus text-xs"></i></button>
                                    <input v-model="quantity" type="number" class="w-16 text-center bg-transparent border-none font-bold text-lg focus:ring-0 outline-none m-0" />
                                    <button class="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-black hover:shadow-md transition-all active:scale-95" @click="quantity = Math.min(quantity + 1, sizeChose?.stock || 99)"><i class="fa-solid fa-plus text-xs"></i></button>
                                 </div>
                                 <span class="text-xs font-medium px-4 py-1 bg-white rounded-full border border-gray-100 text-gray-500 shadow-sm" :class="{'text-red-500 bg-red-50 border-red-100': sizeChose?.stock === 0}">{{ sizeChose?.stock === 0 ? 'Hết hàng' : `${sizeChose?.stock} có sẵn` }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-3 pt-4">
                         <button @click="handleBuyNow" :disabled="!sizeChose || sizeChose.stock == 0" class="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg shadow-xl shadow-gray-900/20 hover:bg-black hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">MUA NGAY</button>
                        <button @click="handleAddToCart(sizeChose!)" :disabled="!sizeChose || sizeChose.stock == 0 || loadingAddToCart" class="w-full py-4 bg-white text-black border-2 border-black rounded-xl font-bold text-lg hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <i v-if="!loadingAddToCart" class="fa-solid fa-cart-plus"></i>
                            {{ loadingAddToCart ? 'Đang xử lý...' : 'Thêm vào giỏ' }}
                        </button>
                    </div>
                    <div class="grid grid-cols-3 gap-2 pt-4">
                        <div class="flex flex-col items-center text-center gap-1 p-2 bg-gray-50 rounded-lg"><i class="fa-solid fa-shield-halved text-gray-400 mb-1"></i><span class="text-[10px] font-medium text-gray-600 leading-tight">Chính hãng 100%</span></div>
                        <div class="flex flex-col items-center text-center gap-1 p-2 bg-gray-50 rounded-lg"><i class="fa-solid fa-rotate-left text-gray-400 mb-1"></i><span class="text-[10px] font-medium text-gray-600 leading-tight">Đổi trả 7 ngày</span></div>
                         <div class="flex flex-col items-center text-center gap-1 p-2 bg-gray-50 rounded-lg"><i class="fa-solid fa-truck-fast text-gray-400 mb-1"></i><span class="text-[10px] font-medium text-gray-600 leading-tight">Giao nhanh 24h</span></div>
                     </div>
                </div>
            </div>
          </div>
    
          <div class="bg-white rounded-2xl p-6 mb-16 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow duration-300">
            <div class="flex items-center gap-6">
                <div class="w-20 h-20 rounded-full border-4 border-gray-50 overflow-hidden shadow-inner"><img :src="'https://picsum.photos/200/200?random'" class="w-full h-full object-cover" /></div>
                <div>
                    <div class="flex items-center gap-2 mb-1"><h3 class="font-bold text-lg text-black">{{ brand?.name }}</h3><span class="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Official</span></div>
                    <p class="text-sm text-gray-500 mb-3 max-w-md line-clamp-1">{{ brand?.description }}</p>
                    <div class="flex items-center gap-6 text-sm">
                        <div class="flex items-center gap-1.5"><i class="fa-solid fa-star text-yellow-400"></i><span class="text-black font-bold">{{ brandRating?.average_rating?.toFixed(1) || 'N/A' }}</span><span class="text-gray-400 text-xs">Rating</span></div>
                        <div class="w-px h-4 bg-gray-200"></div>
                         <div class="flex items-center gap-1.5"><i class="fa-solid fa-eye text-gray-400"></i><span class="text-black font-bold">{{ brandRating?.total_reviews }}</span><span class="text-gray-400 text-xs">Lượt đánh giá</span></div>
                    </div>
                </div>
            </div>
            <div class="flex gap-3 w-full md:w-auto">
                 <button @click="handleOpenBrand(productId?.brand_id!)" class="flex-1 md:flex-none px-8 py-3 bg-black text-white rounded-xl shadow-lg shadow-gray-300 hover:bg-gray-800 hover:-translate-y-0.5 transition-all text-sm font-bold"><i class="fa-solid fa-store mr-2"></i>Xem Thương Hiệu</button>
                 <button class="flex-1 md:flex-none px-8 py-3 bg-white border border-gray-200 text-black rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-bold">Chat Ngay</button>
            </div>
          </div>
    
          <div class="mb-16 bg-white rounded-3xl shadow-xl border border-gray-120 overflow-hidden">
             <div class="flex border-b border-gray-100 bg-gray-50/50">
                <button class="flex-1 py-5 text-center font-bold text-base transition-colors relative rounded-tl-3xl focus:outline-none focus:ring-0" :class="!showReview ? 'text-black bg-white' : 'text-gray-400 hover:text-gray-600'" @click="showReview = false">Chi tiết sản phẩm<span v-if="!showReview" class="absolute top-0 left-0 w-full h-1 bg-black"></span></button>
                <button class="flex-1 py-5 text-center font-bold text-base transition-colors relative rounded-tr-3xl focus:outline-none focus:ring-0" :class="showReview ? 'text-black bg-white' : 'text-gray-400 hover:text-gray-600'" @click="showReview = true">Đánh giá ({{ reviewStore.total_reviews || 0 }})<span v-if="showReview" class="absolute top-0 left-0 w-full h-1 bg-black"></span></button>
             </div>
    
             <div class="p-8 lg:p-12">
                <div v-if="!showReview" class="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-fade-in">
                    <div class="lg:col-span-2 space-y-6 text-gray-700 leading-loose">
                        <div class="bg-gray-50 p-8 rounded-2xl border border-gray-100" v-if="productId?.attributes && Object.keys(productId.attributes).length > 0">
                            <div class="max-w-5xl mx-auto w-full">
                                <h4 class="font-bold text-black text-lg mb-6 flex items-center gap-2">
                                    <i class="fa-solid fa-circle-info text-gray-400"></i>
                                    Thông số kỹ thuật
                                </h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 w-full">
                                    <div
                                        v-for="([key, value]) in Object.entries(productId?.attributes || {})"
                                        :key="key"
                                        class="flex items-center justify-between border-b border-gray-200 pb-2 w-full"
                                    >
                                        <span class="text-gray-600">
                                            {{ key }}
                                        </span>
                                        <span class="font-bold text-black text-right">
                                            {{ value }}
                                        </span>
                                    </div>
                                </div>
                                
                            </div>
                        </div>
                        <div class="prose max-w-none text-gray-600">
                            <p class="mb-4">Mô tả chi tiết về sản phẩm đang được cập nhật. Sản phẩm này được thiết kế với phong cách hiện đại, phù hợp cho cả đi làm và đi chơi. Chất liệu vải thoáng mát, thấm hút mồ hôi tốt.</p>
                            <p>Hướng dẫn bảo quản: Giặt máy ở nhiệt độ thường, không dùng chất tẩy mạnh, phơi trong bóng râm.</p>
                        </div>
                        <div class="grid grid-cols-3 gap-4 pt-4" >
                            <img v-if="colorChose?.color_images?.[1]" :src="colorChose.color_images[1].toString()" class="rounded-xl w-full h-64 object-cover shadow-sm transition-transform hover:scale-[1.02] duration-500" />
                            <img v-if="colorChose?.color_images?.[2]" :src="colorChose.color_images[2].toString()" class="rounded-xl w-full h-64 object-cover shadow-sm transition-transform hover:scale-[1.02] duration-500" />
                            <img v-if="colorChose?.color_images?.[0]" :src="colorChose.color_images[0].toString()" class="rounded-xl w-full h-64 object-cover shadow-sm transition-transform hover:scale-[1.02] duration-500" />                        
                        </div>
                    </div>
                    <div class="hidden lg:block bg-black text-white rounded-2xl p-8 h-fit sticky top-28">
                        <h4 class="text-xl font-bold mb-4">Tại sao chọn NAVA?</h4>
                        <ul class="space-y-4">
                            <li class="flex gap-3"><i class="fa-solid fa-check text-green-400 mt-1"></i><span class="text-sm text-gray-300">Thiết kế độc quyền, cập nhật xu hướng mới nhất.</span></li>
                            <li class="flex gap-3"><i class="fa-solid fa-check text-green-400 mt-1"></i><span class="text-sm text-gray-300">Kiểm tra hàng thoải mái trước khi thanh toán.</span></li>
                             <li class="flex gap-3"><i class="fa-solid fa-check text-green-400 mt-1"></i><span class="text-sm text-gray-300">Hỗ trợ đổi size nhanh chóng trong 7 ngày.</span></li>
                        </ul>
                    </div>
                </div>
    
                <div v-else class="space-y-10 animate-fade-in">
                    <div class="flex flex-col md:flex-row gap-10 bg-gray-50 p-10 rounded-2xl items-center justify-center">
                        <div class="text-center md:border-r md:border-gray-200 md:pr-10">
                            <div class="text-5xl font-black text-gray-900 mb-2">{{ Math.round((reviewStore.average_rating || 0) * 10) / 10 }}</div>
                            <div class="flex justify-center text-yellow-400 text-xl mb-2"><i class="fa-solid fa-star" v-for="n in 5" :key="n" :class="n <= Math.round(reviewStore.average_rating || 0) ? '' : 'text-gray-200'"></i></div>
                            <div class="text-sm font-medium text-gray-500">Dựa trên {{ reviewStore.total_reviews || 0 }} đánh giá</div>
                        </div>
                        <div class="flex-1 flex flex-wrap gap-3 justify-center md:justify-start">
                            <button @click="handleFilter(null)" class="px-6 py-2 rounded-full border transition-all text-sm font-bold shadow-sm" :class="selectedRating === null ? 'border-black bg-black text-white shadow-md transform scale-105' : 'border-gray-200 bg-white text-gray-600 hover:border-black hover:text-black'">Tất cả</button>
                            <button v-for="n in 5" :key="n" @click="handleFilter(n)" class="px-6 py-2 rounded-full border transition-all text-sm font-bold shadow-sm" :class="selectedRating === n ? 'border-black bg-black text-white shadow-md transform scale-105' : 'border-gray-200 bg-white text-gray-600 hover:border-black hover:text-black'">{{ n }} Sao</button>
                        </div>
                    </div>
    
                    <div class="space-y-6">
                        <div v-if="filteredReviews?.length === 0" class="text-center py-12">
                             <div class="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fa-regular fa-comment-dots text-2xl text-gray-400"></i></div>
                            <p class="text-gray-500 font-medium">Chưa có đánh giá nào cho bộ lọc này.</p>
                        </div>
                        
                        <div v-for="(reviewItem, idx) in filteredReviews" :key="idx" class="bg-gray-50 rounded-2xl p-6 transition-transform hover:bg-gray-100 duration-300">
                            <div class="flex items-start gap-4">
                                <img :src="reviewItem.user?.avatar || 'https://placehold.co/100x100?text=User'" class="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                <div class="flex-1">
                                    <div class="flex justify-between items-start mb-1">
                                        <h5 class="font-bold text-gray-900">{{ reviewItem.user?.name || 'Khách hàng' }}</h5>
                                        <span class="text-xs font-medium text-gray-400 bg-white px-2 py-1 rounded border border-gray-100">{{ formatDateTime(reviewItem.created_at) }}</span>
                                    </div>
                                    <div class="flex text-yellow-400 text-xs mb-3"><i v-for="n in 5" :key="n" class="fa-solid fa-star" :class="n <= Math.round(reviewItem.rating) ? '' : 'text-gray-300'"></i></div>
                                    <p class="text-gray-700 leading-relaxed">{{ reviewItem.comment }}</p>
                                    
                                    <div v-if="reviewItem.images?.length" class="flex gap-3 mt-4">
                                        <img v-for="(img, i) in reviewItem.images" :key="i" :src="img.secure_url || img.image_url" class="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-80 transition" />
                                    </div>
                                    <div v-if="reviewItem.videos?.length" class="flex gap-3 mt-4">
                                        <video v-for="(vid, i) in reviewItem.videos" :key="i" :src="vid.secure_url" class="w-32 h-20 object-cover rounded-lg border border-gray-200" controls></video>
                                    </div>
    
                                    <div class="flex items-center gap-4 mt-3">
                                        <button @click="toggleReplyForm(reviewItem.mongodb_id || reviewItem._id)" class="text-sm font-bold text-gray-500 hover:text-black transition-colors flex items-center gap-1">
                                            <i class="fa-regular fa-comment-dots"></i> Trả lời
                                        </button>
                                    </div>
    
                                    <div v-if="replyingToId === (reviewItem.mongodb_id || reviewItem._id)" class="mt-4 animate-fade-in">
                                        <div class="flex gap-3">
                                            <img :src="auth.user?.avatar || 'https://placehold.co/100x100?text=Me'" class="w-8 h-8 rounded-full object-cover" />
                                            <div class="flex-1 space-y-3">
                                                <textarea 
                                                    v-model="replyContent" 
                                                    class="w-full p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-black focus:border-black outline-none text-sm resize-none bg-white shadow-sm" 
                                                    rows="2" 
                                                    placeholder="Viết phản hồi của bạn..."
                                                ></textarea>
                                                
                                                <div v-if="replyFiles.length > 0" class="flex flex-wrap gap-2">
                                                    <div v-for="(file, index) in replyFiles" :key="index" class="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                                                        <img :src="getPreviewUrl(file)" class="w-full h-full object-cover" />
                                                        <button @click="removeReplyFile(index)" class="absolute top-0 right-0 bg-black/50 text-white w-5 h-5 flex items-center justify-center rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <i class="fa-solid fa-xmark text-xs"></i>
                                                        </button>
                                                    </div>
                                                </div>
    
                                                <div class="flex justify-between items-center">
                                                    <div class="flex items-center gap-2">
                                                        <button @click="triggerReplyFileInput(reviewItem.mongodb_id || reviewItem._id)" class="text-gray-500 hover:text-black p-2 rounded-full hover:bg-gray-100 transition" title="Thêm ảnh">
                                                            <i class="fa-regular fa-image text-lg"></i>
                                                        </button>
                                                        <input type="file" :ref="(el) => { if(el) fileInputReplyRefs[reviewItem.mongodb_id || reviewItem._id] = el as HTMLInputElement }" class="hidden" accept="image/*" multiple @change="handleReplyFileChange" />
                                                    </div>
    
                                                    <div class="flex gap-2">
                                                        <button @click="toggleReplyForm(reviewItem.mongodb_id || reviewItem._id)" class="px-4 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-lg transition">Hủy</button>
                                                        <button 
                                                            @click="handleSubmitReply(reviewItem.mongodb_id || reviewItem._id)" 
                                                            :disabled="(!replyContent.trim() && replyFiles.length === 0) || replyLoading"
                                                            class="px-4 py-1.5 text-xs font-bold text-white bg-black rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                        >
                                                            <i v-if="replyLoading" class="fa-solid fa-spinner fa-spin"></i>
                                                            {{ replyLoading ? 'Đang gửi...' : 'Gửi trả lời' }}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
    
                                    <div v-if="reviewItem.child_reviews && reviewItem.child_reviews.length > 0" class="mt-6 space-y-4">
                                        <div v-for="child in reviewItem.child_reviews" :key="child._id" class="ml-2 md:ml-8 bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group">
                                            <div class="absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45"></div>
                                            <div class="flex items-start gap-3">
                                                <img :src="child.user?.avatar || 'https://placehold.co/100x100?text=A'" class="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                                <div class="flex-1">
                                                    <div class="flex items-center justify-between mb-1">
                                                        <div class="flex items-center gap-2">
                                                            <span class="text-sm font-bold text-gray-900">
                                                                {{ isMine(child) ? 'Tôi' : (child.user?.name || 'Người dùng') }}
                                                            </span>
                                                        </div>
                                                        <div class="flex items-center gap-2">
                                                            <span class="text-[10px] text-gray-400">{{ formatDateTime(child.createdAt) }}</span>
                                                            <div v-if="isMine(child) && editingChildId !== child._id" class="hidden group-hover:flex gap-2 ml-2 transition-opacity">
                                                                <button @click="startEditChild(child)" class="text-gray-400 hover:text-blue-600 p-1" title="Chỉnh sửa"><i class="fa-solid fa-pen text-xs"></i></button>
                                                                <button @click="handleDeleteChild(reviewItem.mongodb_id || reviewItem._id, child._id)" class="text-gray-400 hover:text-red-600 p-1" title="Xóa"><i class="fa-solid fa-trash text-xs"></i></button>
                                                            </div>
                                                        </div>
                                                    </div>
    
                                                    <div v-if="editingChildId !== child._id">
                                                        <p class="text-sm text-gray-600">{{ child.comment }}</p>
                                                        <div v-if="child.images?.length" class="flex gap-2 mt-2">
                                                            <img v-for="(cImg, ci) in child.images" :key="ci" :src="cImg.secure_url" class="w-16 h-16 object-cover rounded border border-gray-100" />
                                                        </div>
                                                        <div v-if="child.videos?.length" class="flex gap-2 mt-2">
                                                            <video v-for="(cVid, cv) in child.videos" :key="cv" :src="cVid.secure_url" class="w-32 h-20 object-cover rounded border border-gray-200" controls></video>
                                                        </div>
                                                    </div>
    
                                                    <div v-else class="mt-2 animate-fade-in">
                                                        <textarea v-model="editContent" class="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-black outline-none resize-none bg-white" rows="2" placeholder="Sửa bình luận..."></textarea>
                                                        
                                                        <div v-if="child.images?.length || child.videos?.length" class="flex gap-2 mt-2 overflow-x-auto pb-2">
                                                            <div v-for="(oldImg, oi) in child.images" :key="'old-img-'+oi" class="relative w-16 h-16 flex-shrink-0 opacity-70" title="Ảnh hiện tại">
                                                                <img :src="oldImg.secure_url" class="w-full h-full object-cover rounded border border-gray-200" />
                                                            </div>
                                                            <div v-for="(oldVid, ov) in child.videos" :key="'old-vid-'+ov" class="relative w-16 h-16 flex-shrink-0 opacity-70">
                                                                <video :src="oldVid.secure_url" class="w-full h-full object-cover rounded border border-gray-200"></video>
                                                            </div>
                                                        </div>
    
                                                        <div v-if="editFiles.length > 0" class="flex flex-wrap gap-2 mt-2">
                                                            <div v-for="(file, idx) in editFiles" :key="idx" class="relative w-16 h-16 rounded-lg overflow-hidden border border-blue-200 shadow-sm">
                                                                <img :src="getPreviewUrl(file)" class="w-full h-full object-cover" />
                                                                <button @click="removeEditFile(idx)" class="absolute top-0 right-0 bg-black/50 text-white w-5 h-5 flex items-center justify-center hover:bg-red-500 transition-colors">
                                                                    <i class="fa-solid fa-xmark text-[10px]"></i>
                                                                </button>
                                                            </div>
                                                        </div>
    
                                                        <div class="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                                                            <div class="flex items-center gap-2">
                                                                <button @click="triggerEditFileInput(child._id)" class="text-gray-500 hover:text-black p-1.5 rounded-full hover:bg-gray-100 transition" title="Thêm ảnh/video mới">
                                                                    <i class="fa-regular fa-image text-lg"></i>
                                                                </button>
                                                                <input type="file" :ref="(el) => { if(el) fileInputEditRefs[child._id] = el as HTMLInputElement }" class="hidden" accept="image/*,video/*" multiple @change="handleEditFileChange" />
                                                            </div>
    
                                                            <div class="flex gap-2">
                                                                <button @click="cancelEdit" class="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded font-medium transition">Hủy</button>
                                                                <button @click="handleUpdateChild(reviewItem.mongodb_id || reviewItem._id, child._id)" class="text-xs px-3 py-1.5 bg-black text-white rounded hover:bg-gray-800 font-bold transition shadow-sm">Lưu lại</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
          </div>
    
          <div v-if="listpProducts && listpProducts.length > 0" class="mb-12">
            <div class="flex items-center justify-between mb-8"><h3 class="text-xl font-black text-gray-900 uppercase tracking-tight">Có thể bạn sẽ thích</h3><a href="#" class="text-sm font-bold text-black border-b border-black pb-0.5 hover:opacity-70 transition">Xem tất cả</a></div>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
                <div v-for="prod in listpProducts.slice(0, 5)" :key="prod._id" class="group cursor-pointer rounded-2xl p-4 shadow-md hover:shadow-xl transition-all duration-300" @click="router.push({ name: 'product-detail', params: { id: prod.product_id_sql } })">
                    <div class="relative aspect-[3/4] overflow-hidden bg-gray-200 rounded-2xl mb-4 shadow-sm border border-gray-100">
                        <img :src="getMainProductImage(prod)" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <span v-if="checkProductSale(prod)" class="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-md tracking-wide">SALE</span>
                        <div class="absolute inset-x-0 bottom-4 flex justify-center gap-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10">
                            <button class="w-10 h-10 bg-white text-black rounded-full shadow-lg hover:bg-black hover:text-white transition-all flex items-center justify-center transform hover:scale-110 focus:outline-none"><i class="fa-solid fa-cart-plus"></i></button>
                            <button class="w-10 h-10 bg-white text-black rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-all flex items-center justify-center transform hover:scale-110 focus:outline-none" @click.stop="favourite.toggleFavouriteInstant(prod.product_id_sql)"><i :class="favourite.isFavourite(prod.product_id_sql) ? 'fa-solid fa-heart text-red-500 hover:text-white' : 'fa-regular fa-heart'"></i></button>
                        </div>
                    </div>
                    <div class="space-y-1">
                        <h4 class="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors" :title="prod.name">{{ prod.name }}</h4>
                        <div class="flex items-center justify-center gap-2 flex-wrap">
                            <span class="text-base  font-black text-red-600">{{ formatPrice(getMinProductPrice(prod) || 0) }}</span>
                            <span v-if="checkProductSale(prod)" class="text-xs text-gray-400 line-through font-medium">{{ formatPrice(getMaxProductPrice(prod) || 0) }}</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>
          <Brand :show="showBrandModal" :brandId="currentBrandId" @close="showBrandModal = false" />
        </main>
      </div>
      <Footer />
    </template>
    
    <style scoped>
    /* CSS Giữ nguyên */
    .overflow-x-auto::-webkit-scrollbar { height: 4px; }
    .overflow-x-auto::-webkit-scrollbar-thumb { background-color: #ddd; border-radius: 4px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
    input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    .cursor-zoom-in { cursor: zoom-in; }
    /* Custom Scrollbar */
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
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
    
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    
    .animate-scale-in {
      animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    </style>