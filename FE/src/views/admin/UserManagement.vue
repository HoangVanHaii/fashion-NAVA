<script setup lang="ts">
    import { ref, computed, watch, onMounted } from "vue";
    import Navbar from "../../components/admin/Navbar.vue";
    import { useUserAdminStore } from '../../stores/admin/user';
    import type { CreateAccountPayload, User, UserAdmin } from "@/interfaces/user";
    // --- 1. INTERFACES ---
    
    
    const userAdmin = useUserAdminStore();
    
    interface LocationOption {
      code: number;
      name: string;
    }
const branches = ref<string[]>(["DN", "HN", "HCM"]);
    

    
    // --- 2. STATE ---
    const users = ref<UserAdmin[]>([]); // Dữ liệu chính hiển thị ra bảng
    const provinces = ref<LocationOption[]>([]);
    const districts = ref<LocationOption[]>([]);
    const wards = ref<LocationOption[]>([]);
    
    // --- 3. API FETCH LOCATION ---
    const fetchProvinces = async () => {
      try {
        const response = await fetch("https://provinces.open-api.vn/api/?depth=1");
        const data = await response.json();
        provinces.value = data;
      } catch (error) {
        console.error("Lỗi lấy tỉnh thành:", error);
      }
    };
    
    const fetchDistricts = async (provinceCode: number) => {
      if (!provinceCode) {
        districts.value = [];
        return;
      }
      try {
        const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
        const data = await response.json();
        districts.value = data.districts || [];
      } catch (error) {
        console.error("Lỗi lấy quận huyện:", error);
      }
    };
    
    const fetchWards = async (districtCode: number) => {
      if (!districtCode) {
        wards.value = [];
        return;
      }
      try {
        const response = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
        const data = await response.json();
        wards.value = data.wards || [];
      } catch (error) {
        console.error("Lỗi lấy phường xã:", error);
      }
    };
    
    onMounted(async () => {
      const rawData = await userAdmin.getAllUserForAdminStore();
            if (rawData && Array.isArray(rawData)) {
                users.value = rawData.map(mapToUserUI);
        }
        console.log(users.value);
      fetchProvinces();
    });
    const mapToUserUI = (u: any): UserAdmin => {
        return {
            id: u.ID, // Map ID hoa sang id thường
            name: u.name,
            email: u.email,
            phone: u.phone,
            date_of_birth: u.date_of_birth,
            gender: u.gender,
            avatar: (!u.avatar || u.avatar === 'default-avatar.png') ? '' : u.avatar,
            role: u.role,
            status: u.status,
            is_verified: u.is_verified,
            created_at: u.created_at,
                branch: u.branch,
            preferences: u.profile?.preferences || {},
            city_code: null,
            city_name: "",
            district_code: null,
            district_name: "",
            ward_code: null,
            ward_name: "",
            address: "" 
        };
    };
    
    // --- 5. LOGIC QUẢN LÝ ---
    const searchQuery = ref("");
    const filterRole = ref("");
    const filterStatus = ref("");
    const currentPage = ref(1);
    const itemsPerPage = 7;
    
    // Modal logic
    const showModal = ref(false);
    const isEditing = ref(false);
    const isViewing = ref(false);
    
    const defaultUserForm: UserAdmin = {
      id: 0,
      name: "",
      email: "",
      phone: "",
      gender: "other",
      avatar: "",
      role: "customer",
      status: "active",
      is_verified: false,
      created_at: "",
      preferences: {},
      city_code: null,
      city_name: "",
      district_code: null,
      district_name: "",
      ward_code: null,
      ward_name: "",
      address: "",
      branch: ""
    };
    
    const formUser = ref<UserAdmin>({ ...defaultUserForm });
    
    // -- LOGIC WATCH ĐỊA CHỈ --
    watch(() => formUser.value.city_code, async (newVal, oldVal) => {
      if (newVal && newVal !== oldVal) {
        const province = provinces.value.find((p) => p.code === newVal);
        if (province) formUser.value.city_name = province.name;
        if (showModal.value) await fetchDistricts(newVal);
      } else if (!newVal) {
        districts.value = [];
        wards.value = [];
      }
    });
    
    watch(() => formUser.value.district_code, async (newVal, oldVal) => {
      if (newVal && newVal !== oldVal) {
        const district = districts.value.find((d) => d.code == newVal);
        if (district) formUser.value.district_name = district.name;
        if (showModal.value) await fetchWards(newVal);
      } else if (!newVal) {
        wards.value = [];
      }
    });
    
    watch(() => formUser.value.ward_code, (newVal) => {
      if (newVal) {
        const ward = wards.value.find((w) => w.code == newVal);
        if (ward) formUser.value.ward_name = ward.name;
      }
    });
    
    const handleCityChange = () => {
      formUser.value.district_code = null;
      formUser.value.district_name = "";
      formUser.value.ward_code = null;
      formUser.value.ward_name = "";
    };
    
    const handleDistrictChange = () => {
      formUser.value.ward_code = null;
      formUser.value.ward_name = "";
    };
    
    const openModal = async (user?: UserAdmin, viewMode: boolean = false) => {
      isViewing.value = viewMode;
    
      if (user) {
        isEditing.value = true;
        formUser.value = JSON.parse(JSON.stringify(user));
    
        if (formUser.value.city_code) await fetchDistricts(formUser.value.city_code);
        if (formUser.value.district_code) await fetchWards(formUser.value.district_code);
      } else {
        isEditing.value = false;
        isViewing.value = false;
        formUser.value = {
          ...defaultUserForm,
          id: Date.now(),
          created_at: new Date().toISOString(),
        };
        districts.value = [];
        wards.value = [];
      }
      showModal.value = true;
    };
    
    const closeModal = () => {
      showModal.value = false;
    };
    
    const handleSave = async() => {
      if (isEditing.value) {
        const index = users.value.findIndex((u) => u.id === formUser.value.id);
        if (index !== -1) users.value[index] = { ...formUser.value };
      } else {
        const payload: CreateAccountPayload = {
            name: formUser.value.name,
            email: formUser.value.email,
            password: "123456",
            phone: formUser.value.phone,
            date_of_birth: new Date().toISOString().split("T")[0]?.toString() || "", 
            gender: formUser.value.gender,

            province: formUser.value.city_name || "",
            district: formUser.value.district_name || "",
            ward: formUser.value.ward_name || "",
            bio: "", // hoặc formUser.value.bio
            preferences: formUser.value.preferences || {},
            
            role: formUser.value.role || 'employee'
          };
          if (formUser.value.address && formUser.value.address?.length > 2) {
              payload.street_address = formUser.value.address;
          }
          await userAdmin.createAccountStore(payload);
          if (userAdmin.success) {
              await userAdmin.getAllUserForAdminStore();
          }
      }
      closeModal();
    };
    
    const handleDelete = (id: number) => {
      if (confirm("Bạn có chắc chắn muốn xóa?")) {
        users.value = users.value.filter((u) => u.id !== id);
      }
    };
    
    // Filter & Pagination logic
    const filteredUsers = computed(() => {
      return users.value.filter((user) => {
        const matchSearch =
          user.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          user.phone.includes(searchQuery.value);
        const matchRole = filterRole.value ? user.role === filterRole.value : true;
        const matchStatus = filterStatus.value ? user.status === filterStatus.value : true;
        return matchSearch && matchRole && matchStatus;
      });
    });
    
    const totalPages = computed(() => Math.ceil(filteredUsers.value.length / itemsPerPage));
    const paginatedUsers = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage;
      return filteredUsers.value.slice(start, start + itemsPerPage);
    });
    const paginationInfo = computed(() => {
      if (filteredUsers.value.length === 0) return "0-0";
      const start = (currentPage.value - 1) * itemsPerPage + 1;
      const end = Math.min(currentPage.value * itemsPerPage, filteredUsers.value.length);
      return `${start}-${end}`;
    });
    const changePage = (page: number) => {
      if (page >= 1 && page <= totalPages.value) currentPage.value = page;
    };
    watch([searchQuery, filterRole, filterStatus], () => (currentPage.value = 1));
    
    const getInitials = (name: string) => name ? name.split(" ").pop()?.charAt(0).toUpperCase() || "?" : "?";
    const formatDate = (date: string) => {
        if(!date) return "---";
        return new Date(date).toLocaleDateString('vi-VN');
    }
    </script>
    
    <template>
      <div class="flex h-screen bg-[#f5f5f5] overflow-hidden">
        <Navbar />
        <div class="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
          <div class="p-8 text-gray-900 font-sans min-h-full">
            <div class="flex justify-between items-end mb-6">
              <div>
                <h1 class="text-3xl font-bold tracking-tight">Quản lý người dùng</h1>
                <p class="text-gray-500 mt-1">Danh sách nhân viên, khách hàng và quản trị viên.</p>
              </div>
              <button @click="openModal(undefined, false)" class="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-lg">
                <i class="fa-solid fa-plus"></i> Thêm người dùng
              </button>
            </div>
    
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center">
              <div class="flex-1 relative min-w-[250px]">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input v-model="searchQuery" type="text" placeholder="Tìm kiếm..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all" />
              </div>
              <select v-model="filterRole" class="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-black bg-white cursor-pointer hover:border-gray-400">
                <option value="">Tất cả vai trò</option>
                <option value="admin">Quản trị viên</option>
                <option value="employee">Nhân viên</option>
                <option value="customer">Khách hàng</option>
              </select>
              <select v-model="filterStatus" class="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-black bg-white cursor-pointer hover:border-gray-400">
                <option value="">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="banned">Đã khóa</option>
              </select>
            </div>
    
            <div class="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col justify-between h-auto">
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead class="bg-black text-white uppercase text-xs tracking-wider">
                    <tr>
                      <th class="p-4 font-semibold">Người dùng</th>
                      <th class="p-4 font-semibold">Thông tin liên hệ</th>
                      <th class="p-4 font-semibold text-center">Chi nhánh</th>
                      <th class="p-4 font-semibold text-center">Vai trò</th>
                      <th class="p-4 font-semibold text-center">Trạng thái</th>
                      <th class="p-4 font-semibold text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    <tr v-for="user in paginatedUsers" :key="user.id" class="hover:bg-gray-50 transition-colors group">
                      
                      <td class="p-4">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-full bg-gray-200 border border-gray-300 overflow-hidden shrink-0 flex items-center justify-center font-bold text-gray-600">
                            <img v-if="user.avatar" :src="user.avatar" class="w-full h-full object-cover" />
                            <span v-else>{{ getInitials(user.name) }}</span>
                          </div>
                          <div>
                            <p class="font-bold text-gray-900">{{ user.name }}</p>
                            <div class="flex items-center gap-1 text-xs text-gray-500">
                              <i class="fa-solid fa-venus-mars"></i>
                              {{ user.gender === "male" ? "Nam" : user.gender === "female" ? "Nữ" : "Khác" }}
                              <span v-if="user.is_verified" class="ml-1 text-blue-600" title="Đã xác thực"><i class="fa-solid fa-circle-check"></i></span>
                            </div>
                          </div>
                        </div>
                      </td>
    
                      <td class="p-4">
                        <div class="flex flex-col">
                          <span class="text-sm font-medium text-gray-800">{{ user.email }}</span>
                          <span class="text-xs text-gray-500">{{ user.phone }}</span>
                        </div>
                      </td>
    
                      <td class="p-4 text-center">
                        <span v-if="user.branch" class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-bold border border-gray-200">
                            {{ user.branch }}
                        </span>
                        <span v-else class="text-gray-400 text-xs">---</span>
                      </td>
    
                      <td class="p-4 text-center">
                        <span class="px-3 py-1 rounded-full text-xs font-bold border" :class="{
                            'bg-black text-white border-black': user.role === 'admin',
                            'bg-white text-black border-black': user.role === 'employee',
                            'bg-gray-100 text-gray-600 border-gray-200': user.role === 'customer',
                          }">
                          {{ user.role === "admin" ? "ADMIN" : user.role === "employee" ? "NHÂN VIÊN" : "KHÁCH" }}
                        </span>
                      </td>
    
                      <td class="p-4 text-center">
                        <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium" :class="user.status === 'active' ? 'text-green-700' : 'text-red-600 bg-red-50'">
                          <i class="fa-solid" :class="user.status === 'active' ? 'fa-circle text-[8px]' : 'fa-ban'"></i>
                          <span>{{ user.status === "active" ? "Hoạt động" : "Đã khóa" }}</span>
                        </div>
                      </td>
    
                      <td class="p-4 text-center">
                        <div class="flex justify-center gap-2 opacity-100 transition-opacity">
                          <button @click="openModal(user, false)" class="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-black hover:text-white transition-all">
                            <i class="fa-solid fa-pen text-xs"></i>
                          </button>
                          <button @click="openModal(user, true)" class="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-200 transition-all" title="Xem chi tiết">
                            <i class="fa-solid fa-eye text-xs"></i>
                          </button>
                          <button @click="handleDelete(user.id)" class="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-black hover:text-white transition-all">
                            <i class="fa-solid fa-trash text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
    
              <div class="p-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-600" v-if="filteredUsers.length > 0">
                <span>Hiển thị {{ paginationInfo }} trên tổng số {{ filteredUsers.length }}</span>
                <div class="flex gap-1">
                  <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1" class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Trước</button>
                  <button v-for="page in totalPages" :key="page" @click="changePage(page)" class="px-3 py-1 rounded border transition-colors" :class="currentPage === page ? 'bg-black text-white border-black' : 'bg-white border-gray-300 hover:bg-gray-100'">
                    {{ page }}
                  </button>
                  <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages" class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Sau</button>
                </div>
              </div>
            </div>
          </div>
        </div>
    
        <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 z-[100000] flex justify-center items-center backdrop-blur-sm transition-opacity">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h3 class="text-lg font-bold text-gray-900">{{ isViewing ? "Chi tiết người dùng" : isEditing ? "Chỉnh sửa" : "Thêm mới" }}</h3>
              <button @click="closeModal()" class="text-gray-400 hover:text-black transition-colors">
                <i class="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
    
            <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2 flex justify-center mb-2">
                  <div class="relative group" :class="{ 'cursor-pointer': !isViewing }">
                    <div class="w-24 h-24 rounded-full bg-gray-200 border-2 border-gray-300 overflow-hidden flex items-center justify-center">
                      <img v-if="formUser.avatar" :src="formUser.avatar" class="w-full h-full object-cover" />
                      <span v-else class="text-3xl font-bold text-gray-500">{{ getInitials(formUser.name) }}</span>
                    </div>
                    <div v-if="!isViewing" class="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <i class="fa-solid fa-camera text-white"></i>
                    </div>
                  </div>
                </div>
    
                <div class="col-span-2 md:col-span-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                  <input v-model="formUser.name" :disabled="isViewing" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none disabled:bg-gray-100" />
                </div>
                <div class="col-span-2 md:col-span-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input v-model="formUser.email" :disabled="isViewing" type="email" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none disabled:bg-gray-100" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input v-model="formUser.phone" :disabled="isViewing" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none disabled:bg-gray-100" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                    <input
                        v-model="formUser.date_of_birth"
                        :disabled="isViewing"
                        type="date"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black disabled:bg-gray-100"
                    />
                    </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                  <select v-model="formUser.gender" :disabled="isViewing" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none bg-white disabled:bg-gray-100">
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
                    <select
                        v-model="formUser.branch"
                        :disabled="isViewing"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black bg-white disabled:bg-gray-100"
                    >
                        <option value="">-- Chọn chi nhánh --</option>
                        <option v-for="b in branches" :key="b" :value="b">
                        {{ b }}
                        </option>
                    </select>
                    </div>

    
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                  <select v-model="formUser.role" :disabled="isViewing" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none bg-white disabled:bg-gray-100">
                    <option value="customer">Khách hàng</option>
                    <option value="employee">Nhân viên</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select v-model="formUser.status" :disabled="isViewing" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none bg-white disabled:bg-gray-100">
                    <option value="active">Hoạt động</option>
                    <option value="banned">Đã khóa</option>
                  </select>
                </div>
    
                <div class="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
                  <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <i class="fa-solid fa-location-dot text-sm"></i> Địa chỉ liên hệ (Chưa có dữ liệu)
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Tỉnh / Thành phố</label>
                      <select v-model="formUser.city_code" :disabled="isViewing" @change="handleCityChange" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none bg-white text-sm disabled:bg-gray-100">
                        <option :value="null">-- Chọn Tỉnh --</option>
                        <option v-for="prov in provinces" :key="prov.code" :value="prov.code">{{ prov.name }}</option>
                      </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Quận / Huyện</label>
                        <select v-model="formUser.district_code" :disabled="isViewing || !formUser.city_code" @change="handleDistrictChange" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none bg-white text-sm disabled:bg-gray-100">
                            <option :value="null">-- Chọn Quận --</option>
                            <option v-for="dist in districts" :key="dist.code" :value="dist.code">{{ dist.name }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">Phường / Xã</label>
                        <select v-model="formUser.ward_code" :disabled="isViewing || !formUser.district_code" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none bg-white text-sm disabled:bg-gray-100">
                            <option :value="null">-- Chọn Phường --</option>
                            <option v-for="w in wards" :key="w.code" :value="w.code">{{ w.name }}</option>
                        </select>
                    </div>
                    <div class="md:col-span-3 mt-2">
                        <label class="block text-xs font-medium text-gray-500 mb-1">Số nhà, tên đường</label>
                        <input v-model="formUser.address" :disabled="isViewing" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black outline-none text-sm disabled:bg-gray-100" placeholder="Ví dụ: 123 Đường ABC" />
                    </div>
                  </div>
                </div>
    
                <div class="col-span-2 flex items-center gap-2 mt-2">
                  <input type="checkbox" id="verified" v-model="formUser.is_verified" :disabled="isViewing" class="w-4 h-4 text-black border-gray-300 rounded focus:ring-black disabled:opacity-50" />
                  <label for="verified" class="text-sm text-gray-700 cursor-pointer" :class="{ 'cursor-not-allowed opacity-70': isViewing }">Đã xác thực tài khoản</label>
                </div>
              </div>
            </div>
    
            <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 flex-shrink-0">
              <button @click="closeModal()" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-white hover:border-gray-400 transition-colors bg-white shadow-sm">{{ isViewing ? "Đóng" : "Hủy bỏ" }}</button>
              <button v-if="!isViewing" @click="handleSave()" class="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors shadow-md">{{ isEditing ? "Lưu thay đổi" : "Tạo mới" }}</button>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <style scoped>
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    </style>