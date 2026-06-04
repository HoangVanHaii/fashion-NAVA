<script setup lang="ts">
    import { ref, reactive, computed, onMounted } from "vue";
    import * as IProduct from "../../interfaces/product";
    import type { Category } from "@/interfaces/category";
    import type { IBrandResponse } from "../Brand.vue";
    import { useProductStore } from "@/stores/product";
    
    const props = defineProps<{ product?: any }>();
    const emit = defineEmits(["close"]);
    const category = ref<Category>()
    const brand = ref<IBrandResponse>();
    const currentTab = ref<"general" | number>("general");
    const product = useProductStore();
    
    interface LocalAttributeItem {
      key: string;
      value: string;
    }
    
    // 1. Cập nhật Interface cho reactive object (Thêm video)
    const productData = reactive<IProduct.IProductMongoDetail & { video?: string }>({
      _id: "",
      product_id_sql: 0,
      category_id: 0 as any,
      brand_id: 0 as any,
      name: "",
      description: "",
      video: "", // <--- THÊM TRƯỜNG NÀY
      attributes: {},
      colors: [],
    });
    
    const localAttributes = ref<LocalAttributeItem[]>([]);
    
    const activeColor = computed(() =>
      typeof currentTab.value === "number"
        ? productData.colors[currentTab.value]
        : undefined
    );
    
    const formatCurrency = (value: number | null | undefined) => {
      if (value === null || value === undefined) return "N/A";
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(value);
    };
    
    onMounted( async () => {
      const p = props.product;
      if (!p) return;
    
      productData._id = p._id?.$oid || p._id || "";
      productData.product_id_sql = p.product_id_sql || p.id || "";
      productData.name = p.name || "Chưa cập nhật tên";
      productData.category_id = p.category_id || 0;
      productData.brand_id = p.brand_id || 0;
      productData.description = p.description || "Không có mô tả";
      
      // 2. Map dữ liệu Video từ props (Thêm dòng này)
      productData.video = p.video || ""; 
    
      let rawAttrs = p.attributes;
      if (typeof rawAttrs === "string") {
        try {
          rawAttrs = JSON.parse(rawAttrs);
        } catch (e) {
          rawAttrs = {};
        }
      }
      if (rawAttrs && typeof rawAttrs === "object" && !Array.isArray(rawAttrs)) {
        localAttributes.value = Object.entries(rawAttrs).map(([k, v]) => ({
          key: k,
          value: String(v),
        }));
      }
    
      const rawColors = p.colors || [];
      productData.colors = rawColors.map((c: any) => ({
        _id: c._id?.$oid || c._id || "",
        color: c.color,
        is_main: c.is_main || false,
        image_main: c.image_main || c.image_url || "",
        color_images: c.color_images || c.images || [],
        sizes: Array.isArray(c.sizes)
          ? c.sizes.map((s: any) => ({
              _id: s._id?.$oid || s._id || "",
              size: s.size || "",
              price: s.price || null,
              stock: s.stock || 0,
              sale_price: s.sale_price || null,
              sale_stock: s.sale_stock || 0,
              sale_sold: s.sale_sold || 0,
            }))
          : [],
      }));
      category.value = await product.getCategoryNameStore(productData?.category_id!);
      brand.value = await product.getBrandByIdStore(productData?.brand_id!);
    });
    
    const switchTab = (tab: "general" | number) => {
      currentTab.value = tab;
    };
    
    const handleClose = () => emit("close");
    </script>
    
    <template>
      <div
        @click.self="handleClose"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in font-sans"
      >
        <main
          class="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col relative animate-slide-up border border-gray-300 overflow-hidden"
        >
          <div
            class="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center shrink-0"
          >
            <div>
              <h2
                class="text-xl font-extrabold text-black uppercase tracking-tight flex items-center gap-2"
              >
                Chi tiết sản phẩm
              </h2>
              <p class="text-gray-500 text-xs mt-0.5">
                SQL ID:
                <span class="font-mono text-black font-bold">{{
                  productData.product_id_sql
                }}</span>
                <span class="mx-2">|</span>
                Mongo ID: <span class="font-mono text-gray-400">{{ productData._id }}</span>
              </p>
            </div>
            <button
              @click="handleClose"
              class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-black"
            >
              <i class="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>
    
          <div class="flex flex-1 overflow-hidden">
            <div
              class="w-64 bg-gray-50 border-r border-gray-200 flex flex-col overflow-y-auto shrink-0"
            >
              <div class="p-4">
                <div
                  @click="switchTab('general')"
                  class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all mb-6 border border-transparent"
                  :class="
                    currentTab === 'general'
                      ? 'bg-black text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-200 hover:text-black'
                  "
                >
                  <i class="fa-solid fa-layer-group text-sm"></i>
                  <span class="font-bold text-sm">Thông tin chung</span>
                </div>
    
                <div class="mb-3 px-1">
                  <h3
                    class="text-xs font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Danh sách màu ({{ productData.colors.length }})
                  </h3>
                </div>
    
                <div class="space-y-1">
                  <div
                    v-for="(color, index) in productData.colors"
                    :key="index"
                    @click="switchTab(index)"
                    class="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border border-transparent"
                    :class="
                      currentTab === index
                        ? 'bg-white border-gray-300 shadow-sm'
                        : 'hover:bg-gray-200'
                    "
                  >
                    <div class="flex items-center gap-3 overflow-hidden">
                      <div
                        class="w-3 h-3 rounded-full border border-gray-300 shadow-sm"
                        :style="{ backgroundColor: 'gray' }" 
                        :class="currentTab === index ? 'ring-2 ring-black ring-offset-1' : ''"
                      ></div>
                      
                      <div class="flex flex-col min-w-0">
                        <span
                          class="text-sm font-semibold truncate"
                          :class="
                            currentTab === index ? 'text-black' : 'text-gray-600'
                          "
                        >
                          {{ color.color || "Không tên" }}
                        </span>
                        <span
                          v-if="color.is_main"
                          class="text-[10px] text-blue-600 font-bold bg-blue-50 px-1 rounded w-fit"
                          >Mặc định</span
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
    
            <div class="flex-1 overflow-y-auto bg-white p-8">
              
              <div
                v-if="currentTab === 'general'"
                class="animate-fade-in max-w-3xl mx-auto"
              >
               <div class="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
                <h3 class="text-lg font-bold text-black">
                  Thông tin cơ bản
                </h3>
    
                <div
                  class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border"
                  :class="productData.status === 'active'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'"
                >
                  <span
                    class="w-2 h-2 rounded-full"
                    :class="productData.status === 'active'
                      ? 'bg-green-600'
                      : 'bg-red-600'"
                  ></span>
                  {{ productData.status === 'active' ? 'Đang hoạt động' : 'Đã ẩn / Cấm' }}
                </div>
              </div>
                
                <div class="space-y-6">
                  <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1"
                      >Tên sản phẩm</label
                    >
                    <div class="text-base font-medium text-black bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {{ productData.name }}
                    </div>
                  </div>
    
                  <div v-if="productData.video">
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-2">
                        Video giới thiệu
                    </label>
                    <div class="rounded-xl overflow-hidden border border-gray-200 bg-black shadow-sm">
                        <video 
                            :src="productData.video" 
                            controls 
                            class="w-full max-h-[400px] object-contain mx-auto"
                        ></video>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-6">
                    <div>
                      <label class="block text-xs font-bold text-gray-500 uppercase mb-1"
                        >Thể loại</label
                      >
                       <div class="text-sm font-medium text-black bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {{ category?.category_name }}
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-gray-500 uppercase mb-1"
                        >Thương hiệu</label
                      >
                      <div class="text-sm font-medium text-black bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {{ brand?.name }}
                      </div>
                    </div>
                  </div>
    
                  <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-2"
                      >Thông số kỹ thuật</label
                    >
                    <div class="border border-gray-200 rounded-lg overflow-hidden">
                        <table class="w-full text-sm text-left">
                            <tr v-for="(attr, idx) in localAttributes" :key="idx" class="border-b last:border-0 hover:bg-gray-50">
                                <td class="px-4 py-3 font-semibold text-gray-600 w-1/3 bg-gray-50/50 border-r">{{ attr.key }}</td>
                                <td class="px-4 py-3 text-black font-medium">{{ attr.value }}</td>
                            </tr>
                            <tr v-if="localAttributes.length === 0">
                                <td colspan="2" class="px-4 py-3 text-gray-400 italic text-center">Không có thông số nào</td>
                            </tr>
                        </table>
                    </div>
                  </div>
    
                  <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1"
                      >Mô tả chi tiết</label
                    >
                    <div class="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-800 whitespace-pre-line leading-relaxed min-h-[100px]">
                        {{ productData.description }}
                    </div>
                  </div>
                </div>
              </div>
    
              <div
                v-else-if="typeof currentTab === 'number' && activeColor"
                class="animate-fade-in max-w-4xl mx-auto"
              >
                <div class="flex justify-between items-end mb-8 border-b border-gray-100 pb-4">
                  <div>
                    <label
                      class="block text-xs font-bold text-gray-400 uppercase mb-1"
                      >Tên phân loại</label
                    >
                    <h1 class="text-3xl font-extrabold text-black tracking-tight">
                        {{ activeColor.color }}
                    </h1>
                  </div>
                  <div v-if="activeColor.is_main" class="flex items-center gap-2 bg-black text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    <i class="fa-solid fa-star text-yellow-400"></i> Ảnh đại diện chính
                  </div>
                </div>
    
                <div class="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 mb-10">
                  <div>
                    <label class="block text-xs font-bold text-gray-500 mb-2 uppercase"
                      >Ảnh màu (Main)</label
                    >
                    <div class="w-full aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50 relative group">
                        <img 
                            v-if="activeColor.image_main"
                            :src="activeColor.image_main as string" 
                            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            alt="Main color image"
                        />
                        <div v-else class="flex flex-col items-center justify-center w-full h-full text-gray-300">
                            <i class="fa-solid fa-image text-3xl mb-2"></i>
                            <span class="text-xs">No Image</span>
                        </div>
                    </div>
                  </div>
    
                  <div>
                    <label class="block text-xs font-bold text-gray-500 mb-2 uppercase"
                      >Ảnh chi tiết ({{ (activeColor.color_images as string[]).length }})</label
                    >
                    <div class="flex flex-wrap gap-3">
                      <div
                        v-for="(img, idx) in (activeColor.color_images as string[])"
                        :key="idx"
                        class="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 relative group bg-gray-50"
                      >
                        <img :src="img" class="w-full h-full object-cover" />
                      </div>
                      <div v-if="(activeColor.color_images as string[]).length === 0" class="text-sm text-gray-400 italic py-2">
                        Không có ảnh phụ.
                      </div>
                    </div>
                  </div>
                </div>
    
                <div>
                  <label class="block text-xs font-bold text-gray-500 mb-3 uppercase"
                    >Kho hàng & Giá bán</label
                  >
                  <div class="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <table class="w-full text-sm text-left">
                      <thead class="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                        <tr>
                          <th class="px-4 py-3">Size</th>
                          <th class="px-4 py-3 text-right">Giá Gốc</th>
                          <th class="px-4 py-3 text-right text-red-600">Giá Sale</th>
                          <th class="px-4 py-3 text-center">Tồn Kho</th>
                          <th class="px-4 py-3 text-center text-red-600">Kho Sale</th>
                          <th class="px-4 py-3 text-center">Đã Bán (Sale)</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100">
                        <tr
                          v-for="(size, sIdx) in activeColor.sizes"
                          :key="sIdx"
                          class="hover:bg-gray-50"
                        >
                          <td class="px-4 py-3 font-bold text-black bg-gray-50/50">
                            {{ size.size }}
                          </td>
                          <td class="px-4 py-3 text-right font-mono text-gray-700">
                            {{ formatCurrency(size.price) }}
                          </td>
                          <td class="px-4 py-3 text-right font-mono font-bold text-red-600">
                            {{ size.sale_price ? formatCurrency(size.sale_price) : '-' }}
                          </td>
                          <td class="px-4 py-3 text-center font-medium">
                            {{ size.stock }}
                          </td>
                          <td class="px-4 py-3 text-center text-red-600 font-medium">
                             {{ size.sale_stock || '-' }}
                          </td>
                          <td class="px-4 py-3 text-center text-gray-500">
                            {{ size.sale_sold || 0 }}
                          </td>
                        </tr>
                        <tr v-if="activeColor.sizes.length === 0">
                             <td colspan="6" class="px-4 py-4 text-center text-gray-400 italic">Chưa cấu hình kích thước</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </template>
    
    <style scoped>
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.2s ease-out forwards;
    }
    .animate-slide-up {
      animation: slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    /* Custom Scrollbar */
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: #f1f1f1; }
    ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #555; }
    </style>