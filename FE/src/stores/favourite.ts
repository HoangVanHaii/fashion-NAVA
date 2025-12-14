import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { createFavourite, deleteFavouriteOfme, getFavouriteOfme } from "../services/favourite";
import type { FavouriteDetail } from "@/interfaces/favourite";

export const useFavouriteStore = defineStore("favourite", () => {
    const listFavourite = ref<FavouriteDetail[]>([]);
    const loading = ref<boolean>(false);
    const error = ref<string | null>(null);

    const searchText = ref<string>("");

    const searchFilteredFavourite = computed(() => {
        if (!searchText.value.trim()) return listFavourite.value;
        const keyword = normalizeText(searchText.value);
        return listFavourite.value.filter(
            p => normalizeText(p.name).includes(keyword)
        );
    });

    const getFavouriteOfMeStore = async () => {
        loading.value = true;
        try {
            const data = await getFavouriteOfme();
            listFavourite.value = data.data;
            return data.data as FavouriteDetail[];
        } catch (err) {
            console.log(err);
            loading.value = false;
            error.value = "Không thể tải danh sách yêu thích";
        } finally {
            loading.value = false;
        }
    };

    const deleteFavouriteStore = async (product_id: string) => {
        loading.value = true;
        error.value = null;
        try {
            await deleteFavouriteOfme(product_id);
            listFavourite.value = listFavourite.value.filter(p => p.product_id_sql !== product_id)
        } catch (err) {
            console.log(err);
            error.value = "Xóa sản phẩm khỏi mục yêu thích thất bại";
        } finally {
            loading.value = false;
        }
    };

    const addFavouriteStore = async (product_id: string) => {
        loading.value = true;
        error.value = null;
        try {
            await createFavourite(product_id);
            await getFavouriteOfMeStore();
        } catch (err) {
            console.log(err);
            error.value = "Thêm sản phẩm vào yêu thích thất bại";
        } finally {
            loading.value = false;
        }
    };

    const isFavourite = (productId: string) => {
        return listFavourite.value.some(
            product => product.product_id_sql === productId
        );
    };
    function normalizeText(str: string): string {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }
    const toggleLocalFavourite = (productId: string, isFav: boolean) => {
        if (isFav) {
            listFavourite.value = listFavourite.value
                .filter(
                    p => p.product_id_sql !== productId
                )
                
        } else {
            listFavourite.value.push({
                favourite_id: ``,
                product_id_mongo: ``,
                product_id_sql: productId,
                name: '',
                description: '',

                colors: [
                    {
                        _id: ``,
                        is_main: true,
                        image_main: '',
                        color_images: [''],
                        sizes: [
                            {
                                _id: '',
                                size: '',
                                price: 0,
                                stock: 0,
                                sale_price: 0
                            }
                        ],
                    },
                ],

                // Các trường tùy chọn/thời gian
                brand_id: undefined,
                category_id: undefined,
                status: 'active',
                attributes: {},
                created_at: new Date(),
            });
        }
    };

    const toggleFavouriteInstant = async (productId: string) => {
        const currentStatus = isFavourite(productId);

        toggleLocalFavourite(productId, currentStatus);

        try {
            if (currentStatus) {
                await deleteFavouriteStore(productId);
            } else {
                await addFavouriteStore(productId);
            }
        } catch (err) {
            console.log("API lỗi → rollback");
            toggleLocalFavourite(productId, !currentStatus);
        }
    };
    return {            
        listFavourite,
        searchText,
        searchFilteredFavourite,
        loading,
        error,
        getFavouriteOfMeStore,
        deleteFavouriteStore,
        isFavourite,
        addFavouriteStore,
        toggleFavouriteInstant,
        toggleLocalFavourite
    };
});
