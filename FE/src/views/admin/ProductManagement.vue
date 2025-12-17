<script setup lang="ts">
import Navbar from "../../components/admin/Navbar.vue";
import { ref, onMounted, onUnmounted, nextTick, computed } from "vue";
import { formatPrice } from "../../utils/format";
import { useRouter } from "vue-router";
import { useProductAdminStore } from "../../stores/admin/product";
import FormAdd from "../../components/admin/ProductFormAdd.vue";
import FormEdit from "../../components/admin/ProductFormEdit.vue";
import * as IProduct from "../../interfaces/product";
import Loading from "@/components/Loading.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
const pendingAction = ref<'hide' | 'active' | ''>('');

const isShow = ref(false);
import Notification from "@/components/Notification.vue";
const isSuccess = ref(false)
const toastText = ref('')
const message = ref('')
const loadingPage = ref(false);
// === Init ===
const productStore = useProductAdminStore();
const router = useRouter();

// === Filter Logic ===
const currentTab = ref<string>("Tất cả");

// Ép kiểu dữ liệu từ store về interface chuẩn
const rawList = computed(
  () => (productStore.listProduct || []) as IProduct.IProductMongoDetail[]
);

const filteredProductList = computed(() => {
  switch (currentTab.value) {
    case "Đang hoạt động":
      return rawList.value.filter((p) => p.status === "active");
    case "Chưa hiển thị":
      return rawList.value.filter((p) => p.status === "hidden");
    case "Bị cấm":
      return rawList.value.filter((p) => p.status === "banned");
    default:
      return rawList.value;
  }
});

// === Tính toán Stats cho Tabs ===
const countActive = computed(
  () => rawList.value.filter((p) => p.status === "active").length
);
const countHidden = computed(
  () => rawList.value.filter((p) => p.status === "hidden").length
);
const countBanned = computed(
  () => rawList.value.filter((p) => p.status === "banned").length
);

// === Logic tính toán hiển thị (Giá, Kho) ===
const totalStockList = computed(() => {
  return filteredProductList.value.map((p) =>
    p.colors.reduce((sum, color) => {
      const stock = color.sizes.reduce((s, size) => s + size.stock, 0);
      return sum + stock;
    }, 0)
  );
});

const minPriceList = computed(() => {
  return filteredProductList.value.map((p) => {
    const prices = p.colors.flatMap((color) =>
      color.sizes.map((s) => s.price || 0)
    );
    return prices.length > 0 ? Math.min(...prices) : 0;
  });
});

// === Logic xử lý hàng loạt ===
const listId = computed(() =>
  filteredProductList.value.map((p) => p.product_id_sql)
);

const listSize = computed(() => {
  let sizes: string[] = [];
  filteredProductList.value.forEach((p) => {
    p.colors.forEach((c) => {
      c.sizes.forEach((s) => {
        if (s._id) sizes.push(s._id);
      });
    });
  });
  return sizes;
});

// === UI State ===
const toggle = ref(false);
const showFormConfirm = ref<boolean>(false);
const messageAction = ref<string>("Xác nhận hành động này");
const showNotification = ref<boolean>(false);
const texNotification = ref<string>("");
const type = ref<string>("active");
const stock = ref<number>(0);
const checkButton = ref<boolean>(true);
const showFormAdd = ref<Boolean>(false);
const showEditForm = ref(false);
const selectedProduct = ref<IProduct.IProductMongoDetail | null>(null);

// === Scroll Logic ===
const isTabVisible = ref(true);
const scrollContainer = ref<HTMLElement | null>(null);
let lastScroll = 0;
let ticking = false;

const handleScroll = () => {
  if (!scrollContainer.value) return;
  const currentScroll = scrollContainer.value.scrollTop;
  if (!ticking) {
    window.requestAnimationFrame(() => {
      const diff = currentScroll - lastScroll;
      if (diff > 15 && currentScroll > 100) {
        isTabVisible.value = false;
      } else if (diff < -15 || currentScroll < 50) {
        isTabVisible.value = true;
      }
      lastScroll = currentScroll;
      ticking = false;
    });
    ticking = true;
  }
};

// === Lifecycle ===
onMounted(async () => {
    loadingPage.value = true;
  await productStore.getAllProductPayloadStore();
  await nextTick();
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener("scroll", handleScroll);
    }
    loadingPage.value = false;
});

onUnmounted(() => {
  if (scrollContainer.value) {
    scrollContainer.value.removeEventListener("scroll", handleScroll);
  }
});

// === Actions ===
const handleRefresh = () => productStore.getAllProductPayloadStore();

const handleAction = async () => {
  showFormConfirm.value = false;
  texNotification.value = "";

  if (checkButton.value) {
    if (stock.value < 0) {
      showNotification.value = false;
      texNotification.value = "❌ Số lượng phải lớn hơn hoặc bằng 0";
      return;
    }
    // await productStore.updateSizesStore(listSize.value.join(','), stock.value);
  } else {
    if (type.value != "active" && type.value != "hidden") {
      showNotification.value = false;
      texNotification.value = "❌ Trạng thái phải là hoạt động hoặc ẩn";
      return;
    }
    // await productStore.updateStatusStore(type.value, listId.value.join(','));
  }
  showNotification.value = true;
  texNotification.value = "✅ Cập nhật thành công";
  await productStore.getAllProductPayloadStore();
};

// === Helper Functions ===
const getStockOfColor = (color: IProduct.IProductColorResponse) => {
  return color.sizes.reduce((sum, s) => sum + s.stock, 0);
};

const expandedProductIds = ref<string[]>([]);
const getSoldOfColor = (color: IProduct.IProductColorResponse) => {
  return color.sizes.reduce((sum, s) => sum + (s.sale_sold || 0), 0);
};
const toggleExpand = (id: string) => {
  if (expandedProductIds.value.includes(id)) {
    expandedProductIds.value = expandedProductIds.value.filter(
      (item) => item !== id
    );
  } else {
    expandedProductIds.value.push(id);
  }
};
const isExpanded = (id: string) => expandedProductIds.value.includes(id);

const calculateSoldProduct = (p: IProduct.IProductMongoDetail) => {
  return p.colors.reduce((acc, color) => acc + getSoldOfColor(color), 0);
};
const productIdTmp = ref('')
const handleHidden = async (item: IProduct.IProductMongoDetail) => {
    productIdTmp.value = item.product_id_sql;
    pendingAction.value = 'hide';
    isShow.value = true;
    message.value = 'Bạn có chắc muốn ẩn sản phẩm này không!'
};
const handleHiddenFinal = async () => {
    loadingPage.value = true;
    await productStore.updateProductStatusStore(productIdTmp.value, "hidden");
    if (productStore.success) {
        isSuccess.value = true;
        toastText.value = 'Tắt sản phẩm thành công!!'
    }
    else {
        isSuccess.value = false;
        toastText.value = 'Tắt sản phẩm thất bại!!'
    }
    await productStore.getAllProductPayloadStore();
    isShow.value = false;
    loadingPage.value = false;
}

const handleActive = async (item: IProduct.IProductMongoDetail) => {
    productIdTmp.value = item.product_id_sql;
    pendingAction.value = 'active'; 
    isShow.value = true;
    message.value = 'Bạn có chắc muốn bật sản phẩm này không!'
    
};

const handleActiveFinal = async () => {
    loadingPage.value = true;
    await productStore.updateProductStatusStore(productIdTmp.value, "active");
    if (productStore.success) {
        isSuccess.value = true;
        toastText.value = 'Bật sản phẩm thành công!!'
    }
    else {
        isSuccess.value = false;
        toastText.value = 'Bật sản phẩm thất bại!!'
    }
    await productStore.getAllProductPayloadStore();
    isShow.value = false;
    loadingPage.value = false;
};
const handleChangeStatus = async () => {
    isShow.value = false;
    if (pendingAction.value === 'hide') {
        await handleHiddenFinal();
    } else if (pendingAction.value === 'active') {
        await handleActiveFinal();
    }
    pendingAction.value = '';
};

const hanldeStock = (value: number) => {
  stock.value = value;
};
const handleType = (value: string) => {
  type.value = value;
};

const openEditModal = (item: IProduct.IProductMongoDetail) => {
  selectedProduct.value = item;
  showEditForm.value = true;
};
</script>

<template>
  <Loading :loading="productStore.loading" />
  <ConfirmDialog v-if="isShow" 
        :message="message"
        @close="isShow = false"
        @confirm="handleChangeStatus"
      ></ConfirmDialog>
      <Notification :isSuccess="isSuccess" :text="toastText"></Notification>
  <ConfirmUpdate
    v-if="showFormConfirm"
        :message="messageAction"
        @close="showFormConfirm = false"
        @confirm="handleAction"
        @type="handleType"
        @stock="hanldeStock"
  />

  <FormEdit
    v-if="showEditForm"
    @close="showEditForm = false"
    :product="selectedProduct"
  />

  <FormAdd v-if="showFormAdd" @close="showFormAdd = false" />

  <Notification :text="texNotification" :isSuccess="showNotification" />

  <div class="flex justify-between h-[100vh] bg-[#f5f5f5]">
    <Navbar />

    <div
      ref="scrollContainer"
      v-if="productStore.listProduct"
      class="w-[82%] max-md:w-full bg-white rounded-l-2xl shadow-[0_0_40px_rgba(0,0,0,0.05)] overflow-y-auto scrollbar-thin overscroll-y-contain"
    >
      <div
        class="sticky top-0 bg-white z-20 shadow-sm transition-all duration-300 border-0"
      >
        <div class="pt-4 px-8 bg-white">
          <h1 class="text-3xl font-bold text-black mb-4 tracking-tight">
            Quản lý sản phẩm
          </h1>
        </div>

        <div
          class="px-8 transition-all duration-500 ease-in-out bg-white"
          :class="
            isTabVisible
              ? 'max-h-[200px] pb-4 opacity-100 overflow-visible'
              : 'max-h-0 pb-0 opacity-0 overflow-hidden'
          "
        >
          <div class="flex justify-between items-center gap-4 flex-wrap">
            <div
              class="flex gap-2 overflow-x-auto scrollbar-none transition-transform duration-300"
            >
              <button
                v-for="item in [
                  { label: 'Tất cả', count: productStore.listProduct.length },
                  { label: 'Đang hoạt động', count: countActive },
                  { label: 'Bị cấm', count: countBanned },
                  { label: 'Chưa hiển thị', count: countHidden },
                ]"
                :key="item.label"
                :class="
                  currentTab === item.label
                    ? 'bg-black text-white'
                    : 'bg-white text-[#555] border border-[#e5e5e5] hover:bg-black hover:text-white'
                "
                class="px-4 py-1.5 rounded-xl font-medium transition-all duration-300 whitespace-nowrap"
                @click="currentTab = item.label"
              >
                {{ item.label }}
                <span class="opacity-60">({{ item.count }})</span>
              </button>
            </div>

            <div class="flex gap-3 items-center">
              <!-- <div class="relative" @click="toggle = false">
                <button
                  @click.stop="toggle = !toggle"
                  class="px-5 py-2.5 border border-black rounded-xl bg-white text-black font-medium hover:bg-black hover:text-white transition-all duration-300 flex items-center gap-2"
                >
                  Xử lý hàng loạt
                  <i
                    class="fa-solid fa-chevron-down text-sm"
                    :class="{ 'rotate-180': toggle }"
                  ></i>
                </button>

                <div
                  v-if="toggle"
                  class="absolute top-full right-0 mt-2 w-56 bg-white border border-[#e5e5e5] rounded-xl shadow-xl overflow-hidden z-20"
                >
                  <button
                    class="w-full px-4 py-3 text-left hover:bg-[#f5f5f5] flex items-center gap-3 border-b border-[#eee]"
                    @click="
                      (showFormConfirm = true),
                        (messageAction = 'Nhập số lượng tồn kho'),
                        (checkButton = true)
                    "
                  >
                    <i class="fa-solid fa-boxes-stacked text-black"></i>
                    <span class="font-medium text-black">Cập nhật tồn kho</span>
                  </button>

                  <button
                    class="w-full px-4 py-3 text-left hover:bg-[#f5f5f5] flex items-center gap-3"
                    @click="
                      (showFormConfirm = true),
                        (messageAction = 'Bật/Tắt hàng loạt'),
                        (checkButton = false)
                    "
                  >
                    <i class="fa-solid fa-toggle-on text-black"></i>
                    <span class="font-medium text-black">Bật/Tắt</span>
                  </button>
                </div>
              </div> -->

              <button
                class="px-5 py-2.5 bg-black text-white rounded-xl border-2 font-medium hover:bg-black-300 hover:text-white transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                @click="showFormAdd = true"
              >
                <i class="fa-solid fa-plus"></i>
                Thêm sản phẩm
              </button>
            </div>
          </div>
        </div>

        <div class="px-8 pb-2 bg-white border-b border-[#e5e5e5]">
          <div
            class="grid grid-cols-12 gap-4 px-6 py-4 bg-[#fafafa] rounded-xl font-semibold text-[#555] text-sm uppercase tracking-wide max-md:min-w-[800px]"
          >
            <span class="col-span-5">Sản phẩm</span>
            <span class="col-span-2 text-center">Lượt bán</span>
            <span class="col-span-2 text-center">Giá</span>
            <span class="col-span-1 text-center">Kho</span>
            <span class="col-span-2 text-center">Thao tác</span>
          </div>
        </div>
      </div>

      <div class="px-8 py-4">
        <div
          v-if="filteredProductList.length == 0"
          class="w-full flex flex-col justify-center items-center py-16"
        >
          <div class="w-64 opacity-60 mb-6">
            <img src="../../assets/none-order.jpg" alt="" class="w-full" />
          </div>
          <span class="text-[#666] text-lg mb-3"
            >Không tìm thấy sản phẩm nào</span
          >
          <button
            @click="handleRefresh"
            class="text-black font-medium hover:underline flex items-center gap-2"
          >
            <i class="fa-solid fa-rotate-right"></i>
            Tải lại trang
          </button>
        </div>

        <div class="space-y-4 max-md:overflow-x-auto pb-10">
          <div
            v-for="(productItem, index) in filteredProductList"
            :key="productItem._id || index"
            class="bg-white border border-[#e5e5e5] rounded-2xl hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:border-[#dcdcdc] transition-all duration-300 max-md:min-w-[800px]"
          >
            <div class="grid grid-cols-12 gap-4 p-2 items-center">
              <div class="col-span-5 flex items-center gap-4">
                <div
                  class="w-20 h-20 rounded-xl overflow-hidden bg-[#f5f5f5] flex-shrink-0"
                >
                  <img
                    :src="productItem.colors?.[0]?.image_main || ''"
                    alt=""
                    class="w-full h-full object-cover"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-black truncate mb-1">
                    {{ productItem.name }}
                  </h3>
                  <span
                    class="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium"
                  >
                    {{ productItem.colors.length }} màu
                  </span>
                </div>
              </div>

              <div class="col-span-2 text-center">
                <span
                  class="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-[#fafafa] text-black font-medium"
                >
                  {{ calculateSoldProduct(productItem) }}
                </span>
              </div>

              <div class="col-span-2 text-center">
                <div class="text-sm font-semibold text-black">
                  {{ formatPrice(minPriceList[index] ?? 0) }}
                </div>
              </div>

              <div class="col-span-1 text-center">
                <span
                  class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#fafafa] text-black font-bold"
                >
                  {{ totalStockList[index] ?? 0 }}
                </span>
              </div>

              <div class="col-span-2 flex justify-center items-center gap-3">
                <button
                  v-if="productItem.status == 'active'"
                  @click="handleHidden(productItem)"
                  class="w-10 h-10 rounded-lg bg-black text-white hover:bg-[#222] transition-all flex items-center justify-center leading-none"
                  title="Đang hoạt động"
                >
                  <i class="fa-solid fa-toggle-on text-xl"></i>
                </button>

                <button
                  v-if="productItem.status == 'hidden'"
                  @click="handleActive(productItem)"
                  class="w-10 h-10 rounded-lg border border-black text-black hover:bg-black hover:text-white transition-all flex items-center justify-center leading-none"
                  title="Đã ẩn"
                >
                  <i class="fa-solid fa-toggle-off text-xl"></i>
                </button>

                <button
                  @click="openEditModal(productItem)"
                  class="w-10 h-10 rounded-lg bg-black text-white hover:bg-[#222] transition-all flex items-center justify-center leading-none"
                  title="Chỉnh sửa"
                >
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
