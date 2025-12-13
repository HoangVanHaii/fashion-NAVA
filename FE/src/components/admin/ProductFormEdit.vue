<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from "vue";
import { useProductAdminStore } from "../../stores/admin/productStore";
import * as IProduct from "../../interfaces/product";
import type { Category } from "@/interfaces/category";
import * as Brand from "../../interfaces/brand";
import { useBrandStore } from "@/stores/brandStore";
import { useCategoryStore } from "@/stores/categoryStore";
const listBrand = ref<Brand.IBrandResponse[]>([]);
const listCategory = ref<Category[]>([]);

const productAdmin = useProductAdminStore();

const props = defineProps<{ product?: any }>();
const emit = defineEmits(["close", "refresh"]);

const currentTab = ref<"general" | number>("general");
const textToast = ref<string>("");
const showNotification = ref<boolean>(false);

const currentTabSnapshot = ref<string>("");
const brandStore = useBrandStore();
const categoryStore = useCategoryStore();

// Interface cục bộ để lưu trữ thuộc tính dưới dạng MẢNG KEY-VALUE cho giao diện
interface LocalAttributeItem {
  key: string;
  value: string;
}

interface ImageFiles {
  mainImage: File | null;
  mainImagePreview: string;
  subImages: File[];
  subImagePreviews: string[];
}

const productData = reactive<IProduct.IProductMongoDetail>({
  _id: "",
  product_id_sql: "",
  category_id: 0 as any,
  brand_id: 0 as any,
  name: "",
  description: "",
  // Attributes dạng Object (theo Interface IProductMongoDetail)
  attributes: {},
  colors: [],
});

// STATE TRUNG GIAN DÙNG CHO INPUT (MẢNG CÁC CẶP KEY-VALUE)
const localAttributes = ref<LocalAttributeItem[]>([]);

const colorImages = ref<Map<number, ImageFiles>>(new Map());
const activeColor = computed(() =>
  typeof currentTab.value === "number"
    ? productData.colors[currentTab.value]
    : undefined
);

const getCurrentTabData = () => {
  if (currentTab.value === "general") {
    return {
      name: productData.name,
      category_id: productData.category_id,
      brand_id: productData.brand_id,
      description: productData.description,
      // So sánh cả localAttributes (biến state trung gian)
      attributes: localAttributes.value,
    };
  } else if (typeof currentTab.value === "number") {
    return productData.colors[currentTab.value];
  }
  return null;
};

const isModified = computed(() => {
  const currentData = JSON.stringify(getCurrentTabData());
  return currentData !== currentTabSnapshot.value;
});

onMounted(async () => {
  const p = props.product;

  productData._id = p._id?.$oid || p._id || "";
  productData.product_id_sql = p.product_id_sql || p.id || "";
  productData.name = p.name || "";
  productData.category_id = p.category_id || 0;
  productData.brand_id = p.brand_id || 0;
  productData.description = p.description || "";

  let rawAttrs = p.attributes;
  if (typeof rawAttrs === "string") {
    try {
      rawAttrs = JSON.parse(rawAttrs);
    } catch (e) {
      rawAttrs = {};
    }
  }

  // CHUYỂN OBJECT SANG MẢNG KEY-VALUE (dùng cho localAttributes)
  if (rawAttrs && typeof rawAttrs === "object" && !Array.isArray(rawAttrs)) {
    localAttributes.value = Object.entries(rawAttrs).map(([k, v]) => ({
      key: k,
      value: String(v),
    }));
  }
  // Đảm bảo luôn có ít nhất 1 dòng trống để thêm mới
  if (localAttributes.value.length === 0) {
    localAttributes.value.push({ key: "", value: "" });
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
      : ([
          { _id: "", size: "", stock: 0, price: 0 },
        ] as IProduct.IProductSizeResponse[]),
  }));

  productData.colors.forEach((color, index) => {
    colorImages.value.set(index, {
      mainImage: null,
      mainImagePreview: (color.image_main as string) || "",
      subImages: [],
      subImagePreviews: (color.color_images as string[]) || [],
    });
  });

  // Lưu snapshot ban đầu của localAttributes
  currentTabSnapshot.value = JSON.stringify(getCurrentTabData());
  const [brandsPM, categoriesPM] = await Promise.all([
    brandStore.getAllBrandStore(),
    categoryStore.getActiveCategoryStore(),
  ]);
  listBrand.value = brandsPM;
  listCategory.value = categoriesPM;
});

const showToast = (msg: string) => {
  textToast.value = msg;
  showNotification.value = true;
  setTimeout(() => (showNotification.value = false), 3000);
};

const switchTab = (tab: "general" | number) => {
  if (isModified.value) {
    showToast(
      "⚠️ Bạn có thay đổi chưa lưu! Vui lòng lưu lại trước khi chuyển tab."
    );
    return;
  }

  currentTab.value = tab;

  nextTick(() => {
    currentTabSnapshot.value = JSON.stringify(getCurrentTabData());
  });
};

const addColor = () => {
  if (currentTab.value === "general" && isModified.value) {
    showToast("Vui lòng lưu Thông tin chung trước khi thêm màu!");
    return;
  }

  const lastColor = productData.colors[productData.colors.length - 1];
  if (lastColor && !lastColor.color?.trim()) {
    showToast("Nhập tên màu hiện tại trước khi thêm!");
    switchTab(productData.colors.length - 1);
    return;
  }

  const newIndex = productData.colors.length;
  productData.colors.push({
    _id: "",
    color: "",
    image_main: "",
    is_main: false,
    sizes: [
      { _id: "", size: "", stock: 0, price: 0 },
    ] as IProduct.IProductSizeResponse[],
    color_images: [],
  });
  colorImages.value.set(newIndex, {
    mainImage: null,
    mainImagePreview: "",
    subImages: [],
    subImagePreviews: [],
  });

  currentTab.value = newIndex;
  nextTick(() => {
    currentTabSnapshot.value = JSON.stringify(getCurrentTabData());
  });
};

const removeColor = async (index: number) => {
  const targetColor = productData.colors[index];
  alert(1);
  if (!targetColor) return;
  alert(2);
  if (!targetColor._id || targetColor._id === "") {
    productData.colors.splice(index, 1);
    const newImageMap = new Map<number, ImageFiles>();
    productData.colors.forEach((c, i) => {
      newImageMap.set(i, {
        mainImage: null,
        mainImagePreview: (c.image_main as string) || "",
        subImages: [],
        subImagePreviews: (c.color_images as string[]) || [],
      });
    });
    colorImages.value = newImageMap;

    currentTab.value = "general";
    return;
  }
  alert(4);
  if (targetColor?._id) {
    console.log(productData.product_id_sql, targetColor._id);
    await productAdmin.deleteProductColorStore(
      productData.product_id_sql,
      targetColor?._id
    );
  }
  if (!targetColor?._id || productAdmin.success) {
    targetColor.sizes.forEach((sizeItem) => {
      sizeItem.price = null;
      sizeItem.sale_price = null;
      sizeItem.sale_stock = 0;
      sizeItem.stock = 0;
    });
  }

  currentTab.value = "general";
  nextTick(
    () => (currentTabSnapshot.value = JSON.stringify(getCurrentTabData()))
  );
};
const setMainColor = (index: number) => {
  productData.colors.forEach((c, i) => (c.is_main = i === index));
};

const handleMainImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file && typeof currentTab.value === "number") {
    const imgData = colorImages.value.get(currentTab.value)!;
    imgData.mainImage = file;
    const reader = new FileReader();
    reader.onload = (e) =>
      (imgData.mainImagePreview = e.target?.result as string);
    reader.readAsDataURL(file);
  }
};
const handleSubImagesUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files && typeof currentTab.value === "number") {
    const imgData = colorImages.value.get(currentTab.value)!;
    Array.from(files).forEach((file) => {
      if (imgData.subImages.length + imgData.subImagePreviews.length < 7) {
        imgData.subImages.push(file);
        const reader = new FileReader();
        reader.onload = (e) =>
          imgData.subImagePreviews.push(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    });
  }
};
const removeSubImage = (imgIndex: number) => {
  if (typeof currentTab.value !== "number" || !activeColor.value) return;
  const imgData = colorImages.value.get(currentTab.value);
  if (imgData) {
    imgData.subImagePreviews.splice(imgIndex, 1);
    if (
      activeColor.value.color_images &&
      imgIndex < activeColor.value.color_images.length
    ) {
      activeColor.value.color_images.splice(imgIndex, 1);
    } else {
      imgData.subImages.pop();
    }
  }
};
const addSize = () => {
  if (!activeColor.value) return;

  // Lấy dòng size cuối cùng
  const lastSize = activeColor.value.sizes[activeColor.value.sizes.length - 1];

  // Kiểm tra validate dòng cuối trước khi thêm dòng mới
  if (lastSize) {
    // 1. Kiểm tra Tên Size
    if (!lastSize.size.trim()) {
      return showToast("Vui lòng nhập tên Size trước khi thêm dòng mới!");
    }
    // 2. Kiểm tra Giá (Phải lớn hơn 0)
    if (!lastSize.price || lastSize.price <= 0) {
      return showToast("Vui lòng nhập Giá bán hợp lệ (> 0) trước khi thêm!");
    }
    // 3. Kiểm tra Stock (Phải nhập và không được âm)
    // Lưu ý: Nếu cho phép stock = 0 thì dùng điều kiện < 0.
    // Ở đây mình check null/undefined phòng trường hợp user xóa trắng ô input
    if (
      lastSize.stock === null ||
      lastSize.stock === undefined ||
      String(lastSize.stock) === ""
    ) {
      return showToast("Vui lòng nhập Số lượng kho!");
    }
  }

  // Nếu tất cả ok thì mới push dòng mới
  activeColor.value.sizes.push({ _id: "", size: "", stock: 0, price: 0 });
};
const removeSize = async (idx: number) => {
  if (activeColor.value && activeColor.value.sizes.length > 0) {
    const targetSize = activeColor.value.sizes[idx];
    if (!targetSize || !targetSize._id || targetSize._id === "") {
      activeColor.value.sizes.splice(idx, 1);
      return;
    }
    const deleted: IProduct.deleteInventory = {
      product_id: productData.product_id_sql,
      color_id_mongo: activeColor.value._id,
      size_id_mongo: targetSize?._id!,
    };
    await productAdmin.deleteBranchInnventoryStore(deleted);
    if (productAdmin.success) {
      const targetSize = activeColor.value.sizes[idx];
      if (targetSize) {
        targetSize.price = null;
        targetSize.stock = 0;
        targetSize.sale_price = null;
        targetSize.sale_stock = 0;
        targetSize.sale_sold = 0;
      }
    }
    nextTick(
      () => (currentTabSnapshot.value = JSON.stringify(getCurrentTabData()))
    );
  }
};

// LOGIC THÊM/XÓA ATTRIBUTE DÙNG localAttributes
const addAttribute = () => {
  const lastAttr = localAttributes.value[localAttributes.value.length - 1];
  if (lastAttr && (!lastAttr.key.trim() || !lastAttr.value.trim()))
    return showToast("Điền đủ thông số dòng cuối!");
  localAttributes.value.push({ key: "", value: "" });
};
const removeAttribute = (idx: number) => localAttributes.value.splice(idx, 1);

const updateGeneralInfo = async () => {
  if (!productData.name!.trim()) return showToast("Thiếu tên sản phẩm");

  try {
    console.log("AA");
    const attributesObject: Record<string, string | number | boolean> = {};

    localAttributes.value.forEach((curr) => {
      if (curr.key.trim() && curr.value.trim()) {
        const value = curr.value.toString();
        attributesObject[curr.key.trim()] = value;
      }
    });

    console.log(productData);
    await productAdmin.updateProductInfoStore(
      productData.product_id_sql,
      productData.name || "",
      productData.description,
      productData.brand_id || "",
      productData.category_id || "",
      attributesObject
    );
    showToast("✅ Đã lưu thông tin cơ bản!");

    currentTabSnapshot.value = JSON.stringify(getCurrentTabData());
  } catch (error: any) {
    console.log("error", error);
    showToast("Lỗi: " + error.message);
  }
};

const updateColorDetail = async () => {
  if (typeof currentTab.value !== "number" || !activeColor.value) return;
  const colorIndex = currentTab.value;
  const color = activeColor.value;
  const sizesPayload: IProduct.updateSize[] = color.sizes.map((s) => ({
    size_id_mongo: s._id,
    size: s.size,
    price: s.price ?? 0,
    stock: s.stock ?? 0,
  }));
  const formData = new FormData();
  formData.append("product_id_sql", String(productData.product_id_sql));
  formData.append("color_id_mongo", color._id);
  if (color.color) {
    formData.append("color", color.color);
  }
  formData.append("is_main", String(color.is_main));
  formData.append("sizes", JSON.stringify(sizesPayload));
  const imgData = colorImages.value.get(currentTab.value);
  if (!imgData) return;
  const oldUrls = (imgData.subImagePreviews || []).filter(
    (preview) => typeof preview === "string" && !preview.startsWith("data:")
  );

  oldUrls.forEach((url) => {
    formData.append("color_images", url);
  });
  if (imgData.subImages && imgData.subImages.length > 0) {
    imgData.subImages.forEach((file: File) => {
      formData.append("color_images", file);
    });
  }
  if (imgData && imgData.mainImage) {
    formData.append("image_main", imgData.mainImage);
  } else {
    formData.append("image_main", color.image_main || "");
  }
  await productAdmin.updateProductColorStore(formData);
  if (productAdmin.success) {
    showToast(`✅ Đã lưu màu: ${color.color}`);
    if (imgData) {
      imgData.subImages = [];
    }
    currentTabSnapshot.value = JSON.stringify(getCurrentTabData());
  }
};
const createNewColor = async (colorData: any, index: number) => {
  if (colorData.sizes.length === 0) return showToast("Phải có ít nhất 1 size");

  const sizesList: IProduct.IProductSizePayload[] = colorData.sizes.map(
    (s: any) => ({
      size: s.size,
      price: Number(s.price) || 0,
      stock: Number(s.stock) || 0,
    })
  );
  const formData = new FormData();

  if (colorData.color && colorData.color.trim() !== "") {
    formData.append("color", JSON.stringify(colorData.color.trim()));
  }
  formData.append("is_main", JSON.stringify(false));
  formData.append("sizes", JSON.stringify(sizesList));
  const imgData = colorImages.value.get(index);
  if (imgData) {
    if (imgData.mainImage) {
      formData.append("image_main", imgData.mainImage);
    }
    if (imgData.subImages && imgData.subImages.length > 0) {
      imgData.subImages.forEach((file: File) => {
        formData.append("color_images", file);
      });
    }
  }
  await productAdmin.addProductColorStore(productData.product_id_sql, formData);
  if (productAdmin.success) {
    showToast(`✅ Đã thêm mới màu: ${colorData.color}`);
    if (imgData) {
      imgData.mainImage = null;
      imgData.subImages = [];
    }
  }
};
const handleSave = () => {
  if (currentTab.value === "general") {
    updateGeneralInfo();
    return;
  }
  if (typeof currentTab.value === "number" && activeColor.value) {
    const colorObj = activeColor.value;
    const colorIndex = currentTab.value;
    if (!colorObj._id || colorObj._id === "") {
      createNewColor(colorObj, colorIndex);
    } else {
      updateColorDetail();
    }
  }
};

const handleCancel = () => emit("close");

const handleFocus = (e: FocusEvent, size: IProduct.IProductSizeResponse) => {
  if (size.price === null) {
    size.price = 0;
    const target = e.target as HTMLInputElement;
    setTimeout(() => target.select(), 0);
  }
};

const handlePriceInput = (e: Event, size: IProduct.IProductSizeResponse) => {
  const target = e.target as HTMLInputElement;
  let val = target.value;
  val = val.replace(/[^0-9]/g, "");
  if (target.value !== val) {
    target.value = val;
  }
  size.price = val === "" ? null : Number(val);
};
const handleBlur = (size: IProduct.IProductSizeResponse) => {
  if (size.price === 0) {
    size.price = null;
  }
};
</script>

<template>
  <Notification :text="textToast" :isSuccess="showNotification" />

  <div
    @click.self="handleCancel"
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
            Chỉnh sửa sản phẩm
          </h2>
          <p class="text-gray-500 text-xs mt-0.5">
            ID:
            <span class="font-mono text-black">{{
              productData.product_id_sql
            }}</span>
          </p>
        </div>
        <button
          @click="handleCancel"
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
              <span class="font-bold text-sm">Thông tin cơ bản</span>
              <span
                v-if="currentTab === 'general' && isModified"
                class="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"
              ></span>
            </div>

            <div class="flex justify-between items-center mb-3 px-1">
              <h3
                class="text-xs font-bold text-gray-400 uppercase tracking-wider"
              >
                Danh sách màu
              </h3>
              <button
                @click.stop="addColor"
                class="text-black hover:bg-gray-200 w-6 h-6 rounded flex items-center justify-center transition-all"
                title="Thêm màu"
              >
                <i class="fa-solid fa-plus text-xs"></i>
              </button>
            </div>

            <div class="space-y-1">
              <div
                v-for="(color, index) in productData.colors"
                :key="index"
                @click="switchTab(index)"
                class="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all group border border-transparent"
                :class="
                  currentTab === index
                    ? 'bg-white border-gray-300 shadow-sm'
                    : 'hover:bg-gray-200'
                "
              >
                <div class="flex items-center gap-3 overflow-hidden">
                  <div
                    class="w-2 h-2 rounded-full"
                    :class="currentTab === index ? 'bg-black' : 'bg-gray-300'"
                  ></div>
                  <div class="flex flex-col min-w-0">
                    <span
                      class="text-sm font-semibold truncate"
                      :class="
                        currentTab === index ? 'text-black' : 'text-gray-600'
                      "
                    >
                      {{ color.color || "Màu mới" }}
                    </span>
                    <span
                      v-if="color.is_main"
                      class="text-[10px] text-gray-400 font-medium"
                      >Mặc định</span
                    >
                  </div>
                </div>
                <span
                  v-if="currentTab === index && isModified"
                  class="w-2 h-2 bg-red-500 rounded-full animate-pulse"
                ></span>

                <button
                  v-else-if="productData.colors.length > 0"
                  @click.stop="removeColor(index)"
                  class="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity px-2"
                >
                  <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto bg-white p-8">
          <div
            v-if="currentTab === 'general'"
            class="animate-fade-in max-w-3xl mx-auto"
          >
            <h3
              class="text-lg font-bold text-black mb-6 pb-2 border-b border-gray-100"
            >
              Cập nhật thông tin chung
            </h3>
            <div class="space-y-6">
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1"
                  >Tên sản phẩm</label
                >
                <input
                  v-model="productData.name"
                  type="text"
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-black focus:ring-0 outline-none transition-colors bg-gray-50 focus:bg-white text-sm"
                />
              </div>
              <div class="grid grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-bold text-gray-700 mb-1"
                    >Thể loại</label
                  >
                  <select
                    v-model="productData.category_id"
                    class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-black focus:ring-0 outline-none bg-gray-50 focus:bg-white text-sm"
                  >
                    <option
                      v-for="cat in listCategory"
                      :key="cat.category_id!"
                      :value="cat.category_id!"
                    >
                      {{ cat.category_name }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-bold text-gray-700 mb-1"
                    >Thương hiệu</label
                  >
                  <select
                    v-model="productData.brand_id"
                    class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-black focus:ring-0 outline-none bg-gray-50 focus:bg-white text-sm"
                  >
                    <option
                      v-for="br in listBrand"
                      :key="br.brand_id"
                      :value="br.brand_id"
                    >
                      {{ br.name }}
                    </option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-2"
                  >Thông số kỹ thuật</label
                >
                <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div
                    v-for="(attr, idx) in localAttributes"
                    :key="idx"
                    class="flex gap-3 mb-2"
                  >
                    <input
                      v-model="attr.key"
                      placeholder="Tên (VD: Chất liệu)"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:ring-0 outline-none"
                    />
                    <input
                      v-model="attr.value"
                      placeholder="Giá trị"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:ring-0 outline-none"
                    />
                    <button
                      @click="removeAttribute(idx)"
                      class="text-gray-400 hover:text-black px-2"
                    >
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                  <button
                    @click="addAttribute"
                    class="text-sm text-black font-bold hover:underline mt-1 flex items-center gap-1"
                  >
                    <i class="fa-solid fa-plus text-xs"></i> Thêm dòng
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-1"
                  >Mô tả chi tiết</label
                >
                <textarea
                  v-model="productData.description"
                  rows="6"
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-black focus:ring-0 outline-none bg-gray-50 focus:bg-white text-sm resize-y"
                ></textarea>
              </div>
            </div>
          </div>

          <div
            v-else-if="typeof currentTab === 'number' && activeColor"
            class="animate-fade-in max-w-4xl mx-auto"
          >
            <div
              class="flex justify-between items-end mb-8 border-b border-gray-100 pb-4"
            >
              <div class="w-2/3">
                <label
                  class="block text-xs font-bold text-gray-400 uppercase mb-1"
                  >Tên phân loại (Màu sắc)</label
                >
                <input
                  v-model="activeColor.color"
                  type="text"
                  placeholder="Nhập tên màu..."
                  class="w-full text-2xl font-bold text-black border-none p-0 focus:ring-0 placeholder-gray-300 bg-transparent outline-none"
                />
              </div>
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  :checked="activeColor.is_main"
                  @change="setMainColor(currentTab)"
                  class="w-4 h-4 text-black border-gray-300 focus:ring-0 rounded"
                />
                <span class="text-sm font-medium text-gray-700"
                  >Ảnh đại diện chính</span
                >
              </label>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-8 mb-10">
              <div>
                <label
                  class="block text-xs font-bold text-gray-500 mb-2 uppercase"
                  >Ảnh màu</label
                >
                <div class="w-full aspect-square relative group">
                  <input
                    type="file"
                    accept="image/*"
                    @change="handleMainImageUpload"
                    class="hidden"
                    id="edit-main-img"
                  />
                  <label
                    for="edit-main-img"
                    class="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-black transition-all bg-gray-50 overflow-hidden"
                  >
                    <img
                      v-if="colorImages.get(currentTab)?.mainImagePreview"
                      :src="colorImages.get(currentTab)?.mainImagePreview"
                      class="w-full h-full object-cover"
                    />
                    <div v-else class="text-center">
                      <i
                        class="fa-solid fa-camera text-2xl text-gray-300 mb-1"
                      ></i>
                      <div
                        class="text-[10px] text-gray-400 uppercase font-bold"
                      >
                        Upload
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-gray-500 mb-2 uppercase"
                  >Ảnh chi tiết (Max 7)</label
                >
                <div class="flex flex-wrap gap-3">
                  <div
                    v-for="(preview, idx) in colorImages.get(currentTab)
                      ?.subImagePreviews || []"
                    :key="idx"
                    class="w-24 h-24 relative border border-gray-200 group rounded-lg overflow-hidden"
                  >
                    <img :src="preview" class="w-full h-full object-cover" />
                    <button
                      @click="removeSubImage(idx)"
                      class="absolute top-0 right-0 bg-black text-white w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                  <label
                    v-if="!colorImages.get(currentTab)?.subImagePreviews || colorImages.get(currentTab)!.subImagePreviews.length < 7"
                    class="w-24 h-24 flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-black hover:bg-gray-50 transition-all"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      @change="handleSubImagesUpload"
                      class="hidden"
                      multiple
                    />
                    <span
                      class="text-2xl text-gray-300 hover:text-black font-light"
                      >+</span
                    >
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label
                class="block text-xs font-bold text-gray-500 mb-3 uppercase"
                >Danh sách kích thước</label
              >
              <div class="border border-gray-200 rounded-lg overflow-hidden">
                <table
                  class="w-full text-left text-sm table-fixed border-separate border-spacing-y-2"
                >
                  <thead
                    class="bg-gray-100 text-black font-bold uppercase text-xs"
                  >
                    <tr>
                      <th class="p-3 pl-4 text-center w-[19%]">Size</th>
                      <th class="p-3 w-[19%] text-center">Giá Gốc (VNĐ)</th>

                      <th
                        class="p-3 w-[19%] text-red-600 text-center bg-red-50"
                        title="Chế độ xem"
                      >
                        <i class="fa-solid fa-lock text-[10px] mr-1"></i> Giá
                        Sale
                      </th>

                      <th class="p-3 w-[19%] text-center">Kho Gốc</th>

                      <th
                        class="p-3 w-[19%] text-red-600 text-center bg-red-50"
                        title="Chế độ xem"
                      >
                        <i class="fa-solid fa-lock text-[10px] mr-1"></i> Kho
                        Sale
                      </th>

                      <th class="p-3 w-[5%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(size, sIdx) in activeColor.sizes"
                      :key="sIdx"
                      class="group transition-transform hover:-translate-y-0.5"
                    >
                      <td
                        class="p-1 pl-4 align-top py-2 border-l border-t border-b rounded-l-lg shadow-sm"
                        :class="
                          size.price === null
                            ? 'bg-gray-100 border-gray-300'
                            : 'bg-green-50 border-green-200'
                        "
                      >
                        <input
                          v-model="size.size"
                          type="text"
                          class="w-full px-2 py-1.5 border rounded focus:border-black outline-none font-bold text-center uppercase bg-white"
                          :class="
                            size.price === null
                              ? 'text-gray-500 border-gray-300'
                              : 'border-green-300 text-black'
                          "
                        />
                      </td>

                      <td
                        class="p-1 align-top py-2 border-t border-b shadow-sm"
                        :class="
                          size.price === null
                            ? 'bg-gray-100 border-gray-300'
                            : 'bg-green-50 border-green-200'
                        "
                      >
                        <input
                          class="border rounded px-2 py-1.5 w-full text-center font-medium transition-colors focus:ring-1 focus:outline-none"
                          :class="
                            size.price !== null
                              ? 'border-green-400 bg-white text-black focus:ring-green-500'
                              : 'border-gray-300 bg-white text-gray-400 focus:border-black focus:text-black'
                          "
                          :value="size.price === null ? 'null' : size.price"
                          @input="handlePriceInput($event, size)"
                          @focus="handleFocus($event, size)"
                          @blur="handleBlur(size)"
                          placeholder="Nhập giá..."
                        />
                      </td>

                      <td
                        class="p-1 align-top py-2 border-t border-b shadow-sm"
                        :class="
                          size.price === null
                            ? 'bg-gray-100 border-gray-300'
                            : 'bg-green-50 border-green-200'
                        "
                      >
                        <div
                          class="w-full px-2 py-1.5 font-medium rounded border border-transparent text-sm cursor-not-allowed text-center truncate"
                          :class="
                            size.price === null
                              ? 'text-gray-400 bg-gray-200'
                              : 'text-green-700 bg-green-100/50'
                          "
                        >
                          {{
                            size.sale_price
                              ? size.sale_price.toLocaleString("vi-VN")
                              : "null"
                          }}
                        </div>
                      </td>

                      <td
                        class="p-1 align-top py-2 border-t border-b shadow-sm"
                        :class="
                          size.price === null
                            ? 'bg-gray-100 border-gray-300'
                            : 'bg-green-50 border-green-200'
                        "
                      >
                        <input
                          v-model.number="size.stock"
                          type="number"
                          class="w-full px-2 py-1.5 border rounded focus:border-black outline-none text-center font-medium bg-white"
                          :class="
                            size.price === null
                              ? 'border-gray-300 text-gray-400'
                              : 'border-green-300 text-black'
                          "
                        />
                      </td>

                      <td
                        class="p-1 align-top py-2 border-t border-b shadow-sm"
                        :class="
                          size.price === null
                            ? 'bg-gray-100 border-gray-300'
                            : 'bg-green-50 border-green-200'
                        "
                      >
                        <div
                          class="w-full px-2 py-1.5 font-medium rounded border border-transparent text-sm cursor-not-allowed text-center truncate"
                          :class="
                            size.price === null
                              ? 'text-gray-400 bg-gray-200'
                              : 'text-green-700 bg-green-100/50'
                          "
                        >
                          {{ size.sale_stock ?? "null" }}
                        </div>
                      </td>

                      <td
                        class="p-1 text-center align-middle py-2 border-r border-t border-b rounded-r-lg shadow-sm"
                        :class="
                          size.price === null
                            ? 'bg-gray-100 border-gray-300'
                            : 'bg-green-50 border-green-200'
                        "
                      >
                        <button
                          v-if="activeColor.sizes.length > 1"
                          @click="removeSize(sIdx)"
                          class="w-8 h-8 flex items-center justify-center rounded-full transition-colors mx-auto"
                          :class="
                            size.price === null
                              ? 'text-gray-400 hover:bg-gray-200'
                              : 'text-green-600 hover:bg-green-200'
                          "
                        >
                          <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <button
                  @click="addSize"
                  class="w-full py-2 text-center text-xs font-bold uppercase text-black hover:bg-gray-100 border-t border-gray-200 transition-colors"
                >
                  + Thêm kích thước
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="px-6 py-4 bg-white border-t border-gray-200 flex justify-end gap-3 shrink-0"
      >
        <button
          @click="handleCancel"
          class="px-6 py-2.5 border border-gray-300 text-black font-bold text-sm hover:bg-gray-100 transition-all uppercase tracking-wide rounded-lg"
        >
          Hủy bỏ
        </button>
        <button
          @click="handleSave"
          :disabled="!isModified"
          class="px-6 py-2.5 font-bold text-sm transition-all uppercase tracking-wide shadow-lg rounded-lg flex items-center gap-2"
          :class="
            isModified
              ? 'bg-black text-white hover:bg-gray-800 cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
          "
        >
          <span>{{
            currentTab === "general" ? "Lưu thông tin chung" : "Lưu màu này"
          }}</span>
          <i v-if="isModified" class="fa-solid fa-check"></i>
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
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fade-in 0.2s ease-out forwards;
}
.animate-slide-up {
  animation: slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
/* Custom Scrollbar for Chrome/Safari/Webkit */
::-webkit-scrollbar {
  width: 5px;
}
::-webkit-scrollbar-track {
  background: #f1f1f1;
}
::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
