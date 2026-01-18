import { create } from 'zustand';

export type PromoMediaType = 'image' | 'video';

export type PromoMediaAsset = {
  uri: string;
  type: PromoMediaType;
  name: string;
  size?: number;
  updatedAt?: string;
};

export type AuthenticatedUser = {
  id: string;
  userName: string;
  personId?: string | null;
  personName?: string | null;
  role?: string | null;
};

export type PointOfSaleSummary = {
  id: string;
  name: string;
  deviceId: string | null;
  branchId: string | null;
  branchName: string | null;
};

export type CashSessionStatus = 'OPEN' | 'CLOSED' | 'RECONCILED';

export type CashSessionTenderBreakdown = {
  cash: number;
  debitCard: number;
  creditCard: number;
  transfer: number;
  check: number;
  other: number;
};

export type CashSessionClosingDetails = {
  countedByUserId: string;
  countedByUserName?: string | null;
  countedAt: string;
  notes?: string | null;
  actual: CashSessionTenderBreakdown;
  expected: CashSessionTenderBreakdown;
  difference: {
    cash: number;
    total: number;
  };
};

export type CashSessionSummary = {
  id: string;
  status: CashSessionStatus;
  pointOfSaleId: string;
  openedById: string | null;
  openedAt: string;
  openingAmount: number;
  expectedAmount: number | null;
  createdAt: string;
  updatedAt: string;
  closingAmount: number | null;
  closedAt: string | null;
  difference: number | null;
  notes?: string | null;
  closingDetails?: CashSessionClosingDetails | null;
};

export type ProductSearchResult = {
  productId: string | null;
  productName: string;
  variantId: string;
  sku: string;
  barcode?: string | null;
  unitSymbol?: string | null;
  unitPrice: number;
  unitTaxRate: number;
  unitTaxAmount: number;
  unitPriceWithTax: number;
};

export type CartItem = {
  variantId: string;
  productId: string | null;
  sku: string;
  name: string;
  unitSymbol: string | null;
  qty: number;
  unitPrice: number;
  unitTaxRate: number;
  unitTaxAmount: number;
  unitPriceWithTax: number;
  subtotal: number;
  taxAmount: number;
  total: number;
};

export type UsbPrinterSelection = {
  vendorId: string;
  productId: string;
  deviceName?: string | null;
};

type PosState = {
  user: AuthenticatedUser | null;
  pointOfSale: PointOfSaleSummary | null;
  cashSession: CashSessionSummary | null;
  cartItems: CartItem[];
  preferredUsbPrinter: UsbPrinterSelection | null;
  preferredCustomerDisplayId: string | null;
  promoMediaEnabled: boolean;
  promoMedia: PromoMediaAsset | null;
  backendBaseUrl: string | null;
  setUser: (user: AuthenticatedUser | null) => void;
  setPointOfSale: (pos: PointOfSaleSummary | null) => void;
  setCashSession: (session: CashSessionSummary | null) => void;
  updateCashSessionExpectedAmount: (expectedAmount: number) => void;
  resetSession: () => void;
  addProductToCart: (product: ProductSearchResult) => void;
  incrementItem: (variantId: string) => void;
  decrementItem: (variantId: string) => void;
  updateItemQuantity: (variantId: string, qty: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  setPreferredUsbPrinter: (printer: UsbPrinterSelection | null) => void;
  setPreferredCustomerDisplay: (id: string | null) => void;
  setPromoMediaEnabled: (enabled: boolean) => void;
  setPromoMedia: (asset: PromoMediaAsset | null) => void;
  setBackendBaseUrl: (url: string | null) => void;
};

function recalcTotals(item: CartItem): CartItem {
  const qty = Math.max(0, Math.floor(item.qty));
  const subtotal = Number((qty * item.unitPrice).toFixed(2));
  const taxAmount = Number(((subtotal * item.unitTaxRate) / 100).toFixed(2));
  const total = Number((subtotal + taxAmount).toFixed(2));

  return {
    ...item,
    qty,
    subtotal,
    taxAmount,
    total,
  };
}

export const usePosStore = create<PosState>((set, get) => ({
  user: null,
  pointOfSale: null,
  cashSession: null,
  cartItems: [],
  preferredUsbPrinter: null,
  preferredCustomerDisplayId: null,
  promoMediaEnabled: false,
  promoMedia: null,
  backendBaseUrl: null,
  setUser: (user) => {
    set({ user });
    if (!user) {
      set({ pointOfSale: null, cashSession: null, cartItems: [] });
    }
  },
  setPointOfSale: (pointOfSale) => set({ pointOfSale }),
  setCashSession: (cashSession) => set({ cashSession }),
  updateCashSessionExpectedAmount: (expectedAmount) =>
    set((state) => {
      if (!state.cashSession) {
        return {};
      }
      return {
        cashSession: {
          ...state.cashSession,
          expectedAmount,
        },
      };
    }),
  resetSession: () => set({ pointOfSale: null, cashSession: null, cartItems: [] }),
  addProductToCart: (product) => {
    const existing = get().cartItems.find((item) => item.variantId === product.variantId);
    if (existing) {
      get().updateItemQuantity(existing.variantId, existing.qty + 1);
      return;
    }

    const newItem: CartItem = recalcTotals({
      variantId: product.variantId,
      productId: product.productId,
      sku: product.sku,
      name: product.productName,
      unitSymbol: product.unitSymbol ?? null,
      qty: 1,
      unitPrice: product.unitPrice,
      unitTaxRate: product.unitTaxRate,
      unitTaxAmount: product.unitTaxAmount,
      unitPriceWithTax: product.unitPriceWithTax,
      subtotal: product.unitPrice,
      taxAmount: product.unitTaxAmount,
      total: product.unitPriceWithTax,
    });

    set({ cartItems: [...get().cartItems, newItem] });
  },
  incrementItem: (variantId) => {
    const items = get().cartItems.map((item) =>
      item.variantId === variantId ? recalcTotals({ ...item, qty: item.qty + 1 }) : item,
    );
    set({ cartItems: items });
  },
  decrementItem: (variantId) => {
    const items = get()
      .cartItems.map((item) =>
        item.variantId === variantId ? recalcTotals({ ...item, qty: item.qty - 1 }) : item,
      )
      .filter((item) => item.qty > 0);
    set({ cartItems: items });
  },
  updateItemQuantity: (variantId, qty) => {
    if (!Number.isFinite(qty) || qty <= 0) {
      const filtered = get().cartItems.filter((item) => item.variantId !== variantId);
      set({ cartItems: filtered });
      return;
    }
    const normalized = Math.floor(qty);
    const items = get().cartItems.map((item) =>
      item.variantId === variantId ? recalcTotals({ ...item, qty: normalized }) : item,
    );
    set({ cartItems: items });
  },
  removeItem: (variantId) => {
    set({ cartItems: get().cartItems.filter((item) => item.variantId !== variantId) });
  },
  clearCart: () => set({ cartItems: [] }),
  setPreferredUsbPrinter: (printer) => set({ preferredUsbPrinter: printer }),
  setPreferredCustomerDisplay: (id) => set({ preferredCustomerDisplayId: id }),
  setPromoMediaEnabled: (enabled) => set({ promoMediaEnabled: enabled }),
  setPromoMedia: (asset) => set({ promoMedia: asset }),
  setBackendBaseUrl: (url) => set({ backendBaseUrl: url ?? null }),
}));

export const selectUser = (state: PosState) => state.user;
export const selectPointOfSale = (state: PosState) => state.pointOfSale;
export const selectCashSession = (state: PosState) => state.cashSession;
export const selectCartItems = (state: PosState) => state.cartItems;
export const selectItemCount = (state: PosState) =>
  state.cartItems.reduce((accumulator, item) => accumulator + item.qty, 0);
const computeTotals = (items: CartItem[]) => {
  return items.reduce(
    (accumulator, item) => {
      return {
        subtotal: Number((accumulator.subtotal + item.subtotal).toFixed(2)),
        taxAmount: Number((accumulator.taxAmount + item.taxAmount).toFixed(2)),
        total: Number((accumulator.total + item.total).toFixed(2)),
      };
    },
    { subtotal: 0, taxAmount: 0, total: 0 },
  );
};

let cachedCartRef: CartItem[] | null = null;
let cachedTotals = computeTotals([]);

export const selectCartTotals = (state: PosState) => {
  if (cachedCartRef === state.cartItems) {
    return cachedTotals;
  }
  cachedCartRef = state.cartItems;
  cachedTotals = computeTotals(state.cartItems);
  return cachedTotals;
};
export const selectCartTotal = (state: PosState) => selectCartTotals(state).total;
export const selectPreferredUsbPrinter = (state: PosState) => state.preferredUsbPrinter;
export const selectPreferredCustomerDisplayId = (state: PosState) => state.preferredCustomerDisplayId;
export const selectPromoMediaEnabled = (state: PosState) => state.promoMediaEnabled;
export const selectPromoMedia = (state: PosState) => state.promoMedia;
export const selectBackendBaseUrl = (state: PosState) => state.backendBaseUrl;
