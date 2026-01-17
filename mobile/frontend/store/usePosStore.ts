import { create } from 'zustand';

export type CartItem = {
  id: string;
  name: string;
  qty: number;
  total: number;
};

export type SecondaryDisplayMode = 'cart' | 'promo';

type PosState = {
  cartItems: CartItem[];
  secondaryMode: SecondaryDisplayMode;
  setSecondaryMode: (mode: SecondaryDisplayMode) => void;
  setCartItems: (items: CartItem[]) => void;
  resetCart: () => void;
};

const INITIAL_CART: CartItem[] = [
  { id: '1', name: 'Café Americano', qty: 1, total: 2.5 },
  { id: '2', name: 'Croissant', qty: 2, total: 5.0 }
];

export const usePosStore = create<PosState>(set => ({
  cartItems: INITIAL_CART,
  secondaryMode: 'cart',
  setSecondaryMode: mode => set({ secondaryMode: mode }),
  setCartItems: items => set({ cartItems: items }),
  resetCart: () => set({ cartItems: INITIAL_CART })
}));

export const selectCartItems = (state: PosState) => state.cartItems;
export const selectCartTotal = (state: PosState) =>
  state.cartItems.reduce((accumulator, item) => accumulator + item.total, 0);
export const selectSecondaryMode = (state: PosState) => state.secondaryMode;
export const selectItemCount = (state: PosState) =>
  state.cartItems.reduce((accumulator, item) => accumulator + item.qty, 0);
