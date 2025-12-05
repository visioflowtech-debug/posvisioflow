import { create } from 'zustand';
// Force update

export interface Product {
    id: number;
    name: string;
    price: number;
    icon: string;
    stock?: number;
}

export interface CartItem extends Product {
    qty: number;
}

interface CartState {
    cart: CartItem[];
    addToCart: (product: Product) => void;
    removeFromCart: (productId: number) => void;
    updateQuantity: (productId: number, change: number) => void;
    clearCart: () => void;
    total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
    cart: [],
    addToCart: (product) => set((state) => {
        const existingItem = state.cart.find(item => item.id === product.id);
        if (existingItem) {
            return {
                cart: state.cart.map(item =>
                    item.id === product.id ? { ...item, qty: item.qty + 1 } : item
                )
            };
        }
        return { cart: [...state.cart, { ...product, qty: 1 }] };
    }),
    removeFromCart: (productId) => set((state) => ({
        cart: state.cart.filter(item => item.id !== productId)
    })),
    updateQuantity: (productId, change) => set((state) => ({
        cart: state.cart.map(item => {
            if (item.id === productId) {
                const newQty = item.qty + change;
                return newQty > 0 ? { ...item, qty: newQty } : item;
            }
            return item;
        })
    })),
    clearCart: () => set({ cart: [] }),
    total: () => get().cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
}));
