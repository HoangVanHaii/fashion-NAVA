import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { 
    addToCart, 
    getCartItems, 
    updateCartItemQuantity, 
    removeCartItem, 
    clearCart, 
    updateCartItemVariant,
    getCartCount
} from "../services/cart";
import type { ICartFull, ICartItem } from "../interfaces/cart";
import type { Voucher } from "../interfaces/voucher";

interface CartResult {
    success: boolean;
    message: string;
}

// Interface cho Checkout Session
interface CheckoutSession {
    items: any[];
    voucher: Voucher | null;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    checkout_source?: "cart" | "buy_now";
}

export const useCartStore = defineStore('cart', () => {
    const cartCount = ref<number>(0);
    const cart = ref<ICartFull | null>(null);
    const loading = ref(false); 
    const error = ref<string | null>(null);
    let snapshotCart: ICartFull | null = null; 
    const success = ref(false);

    const getStoredSession = (): CheckoutSession | null => {
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('checkout_session');
            try {
                return stored ? JSON.parse(stored) : null;
            } catch (e) {
                return null;
            }
        }
        return null;
    };
    const checkoutSession = ref<CheckoutSession | null>(getStoredSession());

    const setCheckoutSession = (data: CheckoutSession) => {
        checkoutSession.value = data;
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('checkout_session', JSON.stringify(data));
        }
    };

    const clearCheckoutSession = () => {
        checkoutSession.value = null;
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('checkout_session');
        }
    }

    const totalQuantity = computed(() => cart.value?.total_quantity || 0);
    const totalAmount = computed(() => cart.value?.total_amount || 0);

    const takeSnapshot = () => { snapshotCart = cart.value ? JSON.parse(JSON.stringify(cart.value)) : null; };
    const restoreSnapshot = () => { cart.value = snapshotCart; snapshotCart = null; };
    
    const findAndUpdateItem = (itemId: string, newQuantity?: number, removed: boolean = false) => {
        if (!cart.value || !cart.value.items) return; 
        
        const items = cart.value.items as any[]; 
        const itemIndex = items.findIndex(i => i._id === itemId);

        if (itemIndex === -1) return;

        const item = items[itemIndex];
        if (!item) return; 

        const itemPrice = item.price ?? 0; 
        
        if (removed) {
            const itemQuantity = item.quantity ?? 0;
            const itemTotalPrice = item.total_price ?? 0; 
            if (cart.value.total_quantity !== null) cart.value.total_quantity -= itemQuantity;
            if (cart.value.total_amount !== null) cart.value.total_amount -= itemTotalPrice;
            items.splice(itemIndex, 1); 
        } else if (newQuantity !== undefined) {
            const oldQuantity = item.quantity ?? 0;
            const quantityDiff = newQuantity - oldQuantity;
            item.quantity = newQuantity;
            item.total_price = itemPrice * newQuantity; 
            if (cart.value.total_quantity !== null) cart.value.total_quantity += quantityDiff;
            if (cart.value.total_amount !== null) cart.value.total_amount += (itemPrice * quantityDiff);
        }
    };
    const fetchCartAction = async () => {
        loading.value = true;
        error.value = null;
        try {
            const res = await getCartItems();
            if (res.success && res.data) cart.value = res.data;
            else cart.value = null; 
            cartCount.value = cart.value?.items.length || 0;
        } catch (err: any) {
            console.error("Error fetching cart:", err);
            error.value = err.response?.data?.message || "Failed to load cart";
        } finally { loading.value = false; }
    };

    const addToCartAction = async (payload: ICartItem): Promise<CartResult> => {
        loading.value = true;
        error.value = null;
        success.value = false;
        try {
            const res = await addToCart(payload);
            if (res.success) { 
                await fetchCartAction(); 
                await getCartCountStore();
                return { success: true, message: "Product added!" }; }
            throw new Error("Failed to add.");
        } catch (err: any) {
            success.value = false;
            error.value = err.message;
            throw new Error(err.message); 
        } finally { loading.value = false; }
    };

    const updateQuantityAction = async (cartItem_mongo_id: string, newQuantity: number): Promise<CartResult> => {
        if (newQuantity < 1) throw new Error("Quantity must be > 0.");
        takeSnapshot(); 
        try {
            findAndUpdateItem(cartItem_mongo_id, newQuantity);
            const res = await updateCartItemQuantity(cartItem_mongo_id, newQuantity);
            if (res.success) { await fetchCartAction(); return { success: true, message: "Updated!" }; }
            throw new Error("Failed.");
        } catch (err: any) { 
            restoreSnapshot(); 
            error.value = err.message;
            throw new Error(err.message);
        } 
    };

    const updateVariantAction = async (cartItem_mongo_id: string, new_size_id_mongo: string): Promise<CartResult> => {
        loading.value = true;
        error.value = null;
        try {
            const res = await updateCartItemVariant(cartItem_mongo_id, new_size_id_mongo);
            if (res.success) { await fetchCartAction(); return { success: true, message: "Variant updated!" }; }
            throw new Error("Failed.");
        } catch (err: any) { 
            error.value = err.message;
            throw new Error(err.message);
        } finally { loading.value = false; }
    };

    const removeItemAction = async (cartItem_mongo_id: string): Promise<CartResult> => {
        takeSnapshot(); 
        try {
            findAndUpdateItem(cartItem_mongo_id, undefined, true);
            const res = await removeCartItem(cartItem_mongo_id);
            if (res.success) { await fetchCartAction(); return { success: true, message: "Removed!" }; }
            throw new Error("Failed.");
        } catch (err: any) { 
            restoreSnapshot(); 
            error.value = err.message;
            throw new Error(err.message);
        } 
    };
    
    const clearCartAction = async (): Promise<CartResult> => {
        loading.value = true;
        error.value = null;
        try {
            const res = await clearCart();
            if (res.success) { cart.value = null; return { success: true, message: "Cleared." }; }
            throw new Error("Failed.");
        } catch (err: any) { 
            error.value = err.message;
            throw new Error(err.message);
        } finally { loading.value = false; }
    };

    const getCartCountStore = async () => {
        try {
            const res = await getCartCount();
            if (res.success) {
                cartCount.value = res.data;
            }
        } catch (err) {
            console.error("Failed to get cart count", err);
        }
    };

    return {
        cart, loading, error, totalQuantity, totalAmount, checkoutSession, success, cartCount,
        fetchCartAction, addToCartAction, updateQuantityAction, updateVariantAction, removeItemAction, clearCartAction,
        setCheckoutSession, clearCheckoutSession, getCartCountStore
    };
});