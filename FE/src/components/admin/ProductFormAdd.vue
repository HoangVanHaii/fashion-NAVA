<script setup lang="ts">
    import { ref, reactive, computed, onMounted } from "vue";
    import type { Category } from "@/interfaces/category";
    import * as Brand from "../../interfaces/brand";
    import { useProductAdminStore } from "../../stores/admin/product";
    import { useBrandStore } from "@/stores/brand";
    import { useCategoryStore } from "@/stores/category";
    import Notification from "../Notification.vue";
    import Loading from "../Loading.vue";
    
    const brandStore = useBrandStore();
    const categoryStore = useCategoryStore();
    const productAdmin = useProductAdminStore();
    
    const category_id = ref<string>("");
    const brand_id = ref<string>("");
    const name = ref<string>("");
    const description = ref<string>("");
    const status = ref<string>("active");
    const listBrand = ref<Brand.IBrandResponse[]>([]);
    const listCategory = ref<Category[]>([]);
    
    const isSuccess = ref(false);
    const toastText = ref("");
    const loadingPage = ref(false);
    
    const attributes = ref<{ key: string; value: string }[]>([
        { key: "", value: "" },
    ]);
    
    onMounted(async () => {
        loadingPage.value = true;
        const [brandsPM, categoriesPM] = await Promise.all([
            brandStore.getAllBrandStore(),
            categoryStore.getActiveCategoryStore(),
        ]);
        listBrand.value = brandsPM;
        listCategory.value = categoriesPM;
        loadingPage.value = false;
    });
    
    const colors = ref<any[]>([
        {
            color: "",
            is_main: true,
            sizes: [{ size: "", stock: 0, price: 0 }],
        },
    ]);
    
    const listImageMain = reactive<any[]>([]);
    const listImageColor = reactive<any[]>([]);
    
    interface ImageFiles {
        mainImage: File | null;
        mainImagePreview: string;
        subImages: File[];
        subImagePreviews: string[];
    }
    
    const colorImages = ref<Map<number, ImageFiles>>(
        new Map([
            [
                0,
                {
                    mainImage: null,
                    mainImagePreview: "",
                    subImages: [],
                    subImagePreviews: [],
                },
            ],
        ])
    );
    
    const emit = defineEmits(["close"]);
    
    const nameLength = computed(() => name.value.length);
    const descLength = computed(() => description.value.length || 0);
    
    const syncImagesToList = () => {
        listImageMain.length = 0;
        listImageColor.length = 0;
    
        colors.value.forEach((color: any, index: number) => {
            const imgFiles = colorImages.value.get(index);
            if (!imgFiles) return;
    
            if (imgFiles.mainImage) {
                listImageMain.push({
                    [`image_main_${index}`]: imgFiles.mainImage,
                });
            }
    
            if (imgFiles.subImages.length > 0) {
                imgFiles.subImages.forEach((file: File) => {
                    listImageColor.push({
                        [`color_images_${index}`]: file,
                    });
                });
            }
        });
    };
    
    const addAttribute = () => {
        const lastAttr = attributes.value[attributes.value.length - 1];
        if (lastAttr && (!lastAttr.key.trim() || !lastAttr.value.trim())) {
            isSuccess.value = false;
            setTimeout(() => {
                toastText.value = "Vui lòng điền dòng hiện tại trước!";
            }, 0);
            return;
        }
        attributes.value.push({ key: "", value: "" });
    };
    
    const removeAttribute = (index: number) => {
        attributes.value.splice(index, 1);
    };
    
    const initImageFiles = (colorIndex: number) => {
        if (!colorImages.value.has(colorIndex)) {
            colorImages.value.set(colorIndex, {
                mainImage: null,
                mainImagePreview: "",
                subImages: [],
                subImagePreviews: [],
            });
        }
    };
    
    const handleMainImageUpload = (colorIndex: number, event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
            initImageFiles(colorIndex);
            const imageData = colorImages.value.get(colorIndex)!;
            imageData.mainImage = file;
            const reader = new FileReader();
            reader.onload = (e) =>
                (imageData.mainImagePreview = e.target?.result as string);
            reader.readAsDataURL(file);
    
            setTimeout(syncImagesToList, 100); // Sync ngay
        }
    };
    
    const handleSubImagesUpload = (colorIndex: number, event: Event) => {
        const target = event.target as HTMLInputElement;
        const files = target.files;
        if (files) {
            initImageFiles(colorIndex);
            const imageData = colorImages.value.get(colorIndex)!;
            Array.from(files).forEach((file) => {
                if (imageData.subImages.length < 7) {
                    imageData.subImages.push(file);
                    const reader = new FileReader();
                    reader.onload = (e) =>
                        imageData.subImagePreviews.push(e.target?.result as string);
                    reader.readAsDataURL(file);
                }
            });
            setTimeout(syncImagesToList, 100); // Sync ngay
        }
    };
    
    const removeSubImage = (colorIndex: number, imageIndex: number) => {
        const imageData = colorImages.value.get(colorIndex);
        if (imageData) {
            imageData.subImages.splice(imageIndex, 1);
            imageData.subImagePreviews.splice(imageIndex, 1);
            syncImagesToList();
        }
    };
    
    const addSize = (colorIndex: number) => {
        colors.value[colorIndex].sizes.push({ size: "", stock: 0, price: 0 });
    };
    
    const removeSize = (colorIndex: number, sizeIndex: number) => {
        if (colors.value[colorIndex].sizes.length > 1) {
            colors.value[colorIndex].sizes.splice(sizeIndex, 1);
        }
    };
    
    const addColor = () => {
        const newIndex = colors.value.length;
        colors.value.push({
            color: "",
            is_main: false,
            sizes: [{ size: "", stock: 0, price: 0 }],
        });
        initImageFiles(newIndex);
    };
    
    const removeColor = (index: number) => {
        if (colors.value.length > 1) {
            colors.value.splice(index, 1);
    
            const newMap = new Map<number, ImageFiles>();
            colorImages.value.forEach((value, key) => {
                if (key < index) newMap.set(key, value);
                else if (key > index) newMap.set(key - 1, value);
            });
            colorImages.value = newMap;
    
            if (!colors.value.some((c) => c.is_main)) colors.value[0].is_main = true;
    
            syncImagesToList();
        }
    };
    
    const handleCancel = () => {
        emit("close");
    };
    
    const validateForm = (): boolean => {
        toastText.value = "";
        if (!name.value.trim()) {
            isSuccess.value = false;
            setTimeout(() => {
                toastText.value = "Nhập tên sản phẩm";
            }, 0);
            return false;
        }
        if (name.value.length < 11) {
            isSuccess.value = false;
            setTimeout(() => {
                toastText.value = "Tên sản phẩm quá ngắn";
            }, 0);
            return false;
        }
        if (!category_id.value) {
            isSuccess.value = false;
            setTimeout(() => {
                toastText.value = "Chọn thể loại";
            }, 0);
            return false;
        }
        if (!brand_id.value) {
            isSuccess.value = false;
            setTimeout(() => {
                toastText.value = "Chọn thương hiệu";
            }, 0);
            return false;
        }
    
        if (listImageMain.length === 0) {
            isSuccess.value = false;
            toastText.value = "Vui lòng chọn ít nhất 1 ảnh đại diện!";
            return false;
        }
    
        for (const color of colors.value) {
            for (const size of color.sizes) {
                if (!size.size.trim()) {
                    isSuccess.value = false;
                    setTimeout(() => {
                        toastText.value = "Nhập tên size";
                    }, 0);
                    return false;
                }
            }
        }
    
        for (const attr of attributes.value) {
            toastText.value = "";
            if (
                attr.key.length < 2 ||
                attr.key === undefined ||
                attr.value.length < 2 ||
                attr.value === undefined
            ) {
                isSuccess.value = false;
                setTimeout(() => {
                    toastText.value = "Điền đủ thông tin thuộc tính!";
                }, 0);
                return false;
            }
        }
        if (!description.value || description.value.length < 10) {
            isSuccess.value = false;
            setTimeout(() => {
                toastText.value = "Vui lòng nhập mô tả!";
            }, 0);
            return false;
        }
    
        return true;
    };
    
    const convertArrayToObject = (arr: any[]) => {
        const result: any = {};
        arr.forEach((item) => {
            if (
                item.key &&
                item.value &&
                item.key.length >= 2 &&
                item.value.length >= 2
            ) {
                result[item.key] = item.value;
            }
        });
        return result;
    };
    
    const MapFormData = () => {
        const formData = new FormData();
        const attributesObject = convertArrayToObject(attributes.value);
        formData.append("name", name.value);
        formData.append("description", description.value);
        formData.append("brand_id", brand_id.value);
        formData.append("category_id", category_id.value);
        formData.append("status", status.value);
        formData.append("attributes", JSON.stringify(attributesObject));
        formData.append("colors", JSON.stringify(colors.value));
        
        listImageMain.forEach((item: any) => {
            const key = Object.keys(item)[0];
            if (!key) return;
            const file = item[key];
            formData.append(key, file);
        });
        
        listImageColor.forEach((item: any) => {
            const key = Object.keys(item)[0];
            if (!key) return;
            const file = item[key];
            formData.append(key, file);
        });
        
        return formData;
    };
    
    const handleCreateProduct = async () => {
        if (!validateForm()) return;
    
        try {
            loadingPage.value = true;
            const formData = MapFormData();
            await productAdmin.addProductStore(formData);
            loadingPage.value = false;
            isSuccess.value = true;
            toastText.value = "Thêm sản phẩm thành công!";
            emit("close");
        } catch (error: any) {
            isSuccess.value = false;
            toastText.value = "Thêm sản phẩm thất bại!";
            loadingPage.value = false;
            console.error(error);
            emit("close");
        }
    };
    </script>
<template>
    <Loading :loading="loadingPage"></Loading>
    <Notification :isSuccess="isSuccess" :text="toastText"></Notification>
  <div
    @click="handleCancel"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
  >
    <main
      @click.stop
      class="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-slide-up"
    >
      <div
        class="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0"
      >
        <div>
          <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <span class="text-3xl">📦</span> Thêm sản phẩm mới
          </h2>
          <p class="text-gray-500 mt-1 text-sm">
            Điền đầy đủ thông tin bên dưới
          </p>
        </div>
        <button
          @click="handleCancel"
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
        >
          <i class="fa-solid fa-xmark text-gray-500"></i>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
        <h3
          class="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-l-4 border-blue-500 pl-3"
        >
          1. Thông tin cơ bản
        </h3>

        <div class="mb-6 relative">
          <label class="block font-semibold text-gray-700 mb-2 text-sm"
            >Tên sản phẩm <span class="text-red-500">*</span></label
          >
          <input
            v-model="name"
            type="text"
            placeholder="Nhập tên sản phẩm..."
            maxlength="200"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
          />
          <span class="absolute right-2 -bottom-5 text-xs text-gray-400"
            >{{ nameLength }}/200</span
          >
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div class="relative">
            <label class="block font-semibold text-gray-700 mb-2 text-sm"
              >Thể loại <span class="text-red-500">*</span></label
            >
            <div class="relative">
              <select
                v-model="category_id"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none cursor-pointer focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white"
              >
                <option :value="0">-- Chọn thể loại --</option>
                <option
                  v-for="cat in listCategory"
                  :key="cat.category_id!"
                  :value="cat.category_id!"
                >
                  {{ cat.category_name }}
                </option>
              </select>
              <span
                class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs"
                >▼</span
              >
            </div>
          </div>
          <div class="relative">
            <label class="block font-semibold text-gray-700 mb-2 text-sm"
              >Thương hiệu <span class="text-red-500">*</span></label
            >
            <div class="relative">
              <select
                v-model="brand_id"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none cursor-pointer focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white"
              >
                <option :value="0">-- Chọn thương hiệu --</option>
                <option
                  v-for="br in listBrand"
                  :key="br.brand_id"
                  :value="br.brand_id"
                >
                  {{ br.name }}
                </option>
              </select>
              <span
                class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs"
                >▼</span
              >
            </div>
          </div>
        </div>

        <hr class="border-gray-100 my-8" />

        <h3
          class="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-l-4 border-purple-500 pl-3"
        >
          2. Phân loại & Giá bán
        </h3>

        <div
          v-for="(color, colorIndex) in colors"
          :key="colorIndex"
          class="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-xl relative"
        >
          <div class="flex justify-between items-start mb-6">
            <label class="flex-1 block">
              <span class="font-semibold text-gray-700 mb-1 block"
                >Tên màu sắc (Tùy chọn)</span
              >
              <input
                v-model="color.color"
                type="text"
                placeholder="VD: Trắng..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </label>
            <button
              v-if="colors.length > 1"
              @click="removeColor(colorIndex)"
              class="ml-4 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 transition-all"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 mb-6">
            <div>
              <label class="font-semibold text-gray-600 mb-2 text-sm block"
                >Ảnh đại diện</label
              >
              <div class="w-full aspect-square relative group">
                <input
                  type="file"
                  accept="image/*"
                  @change="handleMainImageUpload(colorIndex, $event)"
                  :id="`main-image-${colorIndex}`"
                  class="hidden"
                />
                <label
                  :for="`main-image-${colorIndex}`"
                  class="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all bg-white overflow-hidden"
                >
                  <img
                    v-if="colorImages.get(colorIndex)?.mainImagePreview"
                    :src="colorImages.get(colorIndex)?.mainImagePreview"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="text-center p-2">
                    <span class="text-2xl opacity-30 mb-1 block">📷</span
                    ><span class="text-[10px] text-gray-400 font-medium"
                      >Tải ảnh</span
                    >
                  </div>
                </label>
              </div>
            </div>
            <div>
              <label class="font-semibold text-gray-600 mb-2 text-sm block"
                >Ảnh chi tiết (Max 7)</label
              >
              <div class="flex flex-wrap gap-3">
                <div
                  v-for="(preview, imgIndex) in colorImages.get(colorIndex)
                    ?.subImagePreviews || []"
                  :key="imgIndex"
                  class="w-24 h-24 relative rounded-xl overflow-hidden border border-gray-200 group"
                >
                  <img :src="preview" class="w-full h-full object-cover" />
                  <button
                    @click="removeSubImage(colorIndex, imgIndex)"
                    class="absolute top-1 right-1 bg-black/50 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] hover:bg-red-500"
                  >
                    ✕
                  </button>
                </div>
                <label
                  v-if="!colorImages.get(colorIndex)?.subImagePreviews || colorImages.get(colorIndex)!.subImagePreviews.length < 7"
                  class="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all bg-white"
                >
                  <input
                    type="file"
                    accept="image/*"
                    @change="handleSubImagesUpload(colorIndex, $event)"
                    class="hidden"
                    multiple
                  /><span class="text-xl text-gray-300 hover:text-blue-500"
                    >+</span
                  >
                </label>
              </div>
            </div>
          </div>

          <div
            class="overflow-x-auto mb-4 border border-gray-200 rounded-xl bg-white"
          >
            <table class="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                  <th class="p-3 font-semibold text-gray-600 text-sm pl-4">
                    Size <span class="text-red-500">*</span>
                  </th>
                  <th class="p-3 font-semibold text-gray-600 text-sm">
                    Giá (₫)
                  </th>
                  <th class="p-3 font-semibold text-gray-600 text-sm">Kho</th>
                  <th class="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(size, sizeIndex) in color.sizes"
                  :key="sizeIndex"
                  class="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td class="p-2 pl-4">
                    <input
                      v-model="size.size"
                      type="text"
                      placeholder="Size"
                      class="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white outline-none focus:border-blue-500"
                    />
                  </td>
                  <td class="p-2">
                    <input
                      v-model.number="size.price"
                      type="number"
                      class="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    />
                  </td>
                  <td class="p-2">
                    <input
                      v-model.number="size.stock"
                      type="number"
                      class="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    />
                  </td>
                  <td class="p-2 text-center">
                    <button
                      v-if="color.sizes.length > 1"
                      @click="removeSize(colorIndex, sizeIndex)"
                      class="text-gray-400 hover:text-red-500"
                    >
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button
            @click="addSize(colorIndex)"
            class="w-full py-2 border border-dashed border-blue-300 text-blue-600 bg-blue-50/30 rounded-lg text-sm font-medium"
          >
            + Thêm kích thước
          </button>
        </div>

        <button
          @click="addColor"
          class="w-full py-3 bg-white border-2 border-dashed border-gray-300 text-gray-500 font-semibold rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all"
        >
          + Thêm nhóm màu khác
        </button>

        <hr class="border-gray-100 my-8" />

        <h3
          class="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-l-4 border-green-500 pl-3"
        >
          3. Thông tin chi tiết
        </h3>

        <div class="mb-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
          <label class="block font-semibold text-gray-700 mb-4 text-sm"
            >Thông số kỹ thuật</label
          >
          <div
            v-for="(attr, index) in attributes"
            :key="index"
            class="flex gap-4 mb-3 items-center"
          >
            <input
              v-model="attr.key"
              type="text"
              placeholder="Tên thuộc tính"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
            />
            <input
              v-model="attr.value"
              type="text"
              placeholder="Giá trị"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
            />
            <button
              @click="removeAttribute(index)"
              class="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 transition-all"
            >
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
          <button
            @click="addAttribute"
            class="mt-2 text-sm text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1"
          >
            <i class="fa-solid fa-plus"></i> Thêm dòng thuộc tính
          </button>
        </div>

        <div class="mb-6 relative">
          <label class="block font-semibold text-gray-700 mb-2 text-sm"
            >Nội dung mô tả <span class="text-red-500">*</span></label
          >
          <textarea
            v-model="description"
            placeholder="Nhập mô tả..."
            rows="8"
            maxlength="5000"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none resize-y"
          ></textarea>
          <span class="absolute right-2 -bottom-5 text-xs text-gray-400"
            >{{ descLength }}/5000</span
          >
        </div>
      </div>

      <div
        class="p-4 bg-white border-t border-gray-200 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0"
      >
        <button
          @click="handleCancel"
          class="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 font-semibold rounded-lg hover:bg-gray-50 transition-all"
        >
          Hủy bỏ
        </button>
        <button
          @click="handleCreateProduct"
          class="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
        >
          Xuất bản ngay
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(50px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.animate-fade-in {
  animation: fade-in 0.2s ease-out forwards;
}
.animate-slide-up {
  animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}
</style>
