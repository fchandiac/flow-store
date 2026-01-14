'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useState,
    useTransition,
} from 'react';
import { getPointOfSaleContext, type POSCustomerSummary } from '@/actions/pointOfSale';
import type {
    POSContextDTO,
    POSPriceListSummary,
    POSProductListItem,
} from '@/actions/pointOfSale';
import { PaymentMethod } from '@/data/entities/Transaction';

export interface POSCartItem extends POSProductListItem {
    quantity: number;
    applyTaxes: boolean;
}

export interface POSPaymentEntry {
    id: string;
    method: PaymentMethod;
    amount: number;
    reference?: string;
}

type CartAction =
    | { type: 'ADD_ITEM'; item: POSProductListItem }
    | { type: 'SET_QUANTITY'; variantId: string; quantity: number }
    | { type: 'TOGGLE_TAXES'; variantId: string }
    | { type: 'REMOVE_ITEM'; variantId: string }
    | { type: 'CLEAR' };

interface POSContextValue {
    isLoading: boolean;
    isFetching: boolean;
    error?: string;
    context?: POSContextDTO | null;
    branchName?: string | null;
    storageName?: string | null;
    priceLists: POSPriceListSummary[];
    selectedPriceListId?: string;
    setSelectedPriceListId: (id: string | null | undefined) => void;
    cart: POSCartItem[];
    addItemToCart: (item: POSProductListItem) => void;
    updateItemQuantity: (variantId: string, quantity: number) => void;
    toggleItemTaxes: (variantId: string) => void;
    removeItem: (variantId: string) => void;
    clearCart: () => void;
    totals: {
        subtotal: number;
        total: number;
        taxAmount: number;
        hasTaxesApplied: boolean;
    };
    isPaymentDialogOpen: boolean;
    openPaymentDialog: () => void;
    closePaymentDialog: () => void;
    selectedCustomer: POSCustomerSummary | null;
    setSelectedCustomer: (customer: POSCustomerSummary | null) => void;
    paymentAllocations: POSPaymentEntry[];
    addPaymentAllocation: (method?: PaymentMethod) => void;
    updatePaymentAllocation: (id: string, patch: Partial<Omit<POSPaymentEntry, 'id'>>) => void;
    removePaymentAllocation: (id: string) => void;
    paymentSummary: {
        due: number;
        paid: number;
        remaining: number;
        change: number;
    };
}

const PointOfSaleContext = createContext<POSContextValue | undefined>(undefined);

const cartReducer = (state: POSCartItem[], action: CartAction): POSCartItem[] => {
    switch (action.type) {
        case 'ADD_ITEM': {
            const index = state.findIndex((entry) => entry.variantId === action.item.variantId);
            if (index >= 0) {
                const updated = [...state];
                const current = updated[index];
                const nextQuantity = current.quantity + 1;
                updated[index] = { ...current, quantity: nextQuantity };
                return updated;
            }
            return [
                ...state,
                {
                    ...action.item,
                    quantity: 1,
                    applyTaxes: true,
                },
            ];
        }
        case 'SET_QUANTITY': {
            if (action.quantity <= 0) {
                return state.filter((entry) => entry.variantId !== action.variantId);
            }
            return state.map((entry) =>
                entry.variantId === action.variantId
                    ? { ...entry, quantity: action.quantity }
                    : entry
            );
        }
        case 'TOGGLE_TAXES': {
            return state.map((entry) =>
                entry.variantId === action.variantId
                    ? { ...entry, applyTaxes: !entry.applyTaxes }
                    : entry
            );
        }
        case 'REMOVE_ITEM': {
            return state.filter((entry) => entry.variantId !== action.variantId);
        }
        case 'CLEAR':
            return [];
        default:
            return state;
    }
};

interface ProviderState {
    isLoading: boolean;
    error?: string;
    context: POSContextDTO | null;
    selectedPriceListId?: string;
}

const initialProviderState: ProviderState = {
    isLoading: true,
    context: null,
    selectedPriceListId: undefined,
};

const createPaymentEntry = (method: PaymentMethod, amount = 0): POSPaymentEntry => ({
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${method}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    method,
    amount,
    reference: '',
});

export function PointOfSaleProvider({ children }: { children: React.ReactNode }) {
    const [providerState, setProviderState] = useState<ProviderState>(initialProviderState);
    const [cart, dispatch] = useReducer(cartReducer, []);
    const [isFetching, startTransition] = useTransition();
    const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomerState] = useState<POSCustomerSummary | null>(null);
    const [paymentAllocations, setPaymentAllocations] = useState<POSPaymentEntry[]>([]);

    useEffect(() => {
        startTransition(async () => {
            try {
                const ctx = await getPointOfSaleContext();
                setProviderState({
                    isLoading: false,
                    context: ctx,
                    selectedPriceListId: ctx.defaultPriceListId,
                });
            } catch (error) {
                console.error('Error cargando contexto POS', error);
                setProviderState({
                    isLoading: false,
                    context: null,
                    error: 'No fue posible cargar el contexto del punto de venta.',
                });
            }
        });
    }, []);

    const setSelectedPriceListId = useCallback((id: string | null | undefined) => {
        setProviderState((prev) => {
            if (!prev.context) {
                return prev;
            }
            const effectiveId = id ?? prev.context.defaultPriceListId;
            if (prev.selectedPriceListId === effectiveId) {
                return prev;
            }
            dispatch({ type: 'CLEAR' });
            return {
                ...prev,
                selectedPriceListId: effectiveId,
            };
        });
    }, []);

    const addItemToCart = useCallback((item: POSProductListItem) => {
        dispatch({ type: 'ADD_ITEM', item });
    }, []);

    const updateItemQuantity = useCallback((variantId: string, quantity: number) => {
        dispatch({ type: 'SET_QUANTITY', variantId, quantity });
    }, []);

    const toggleItemTaxes = useCallback((variantId: string) => {
        dispatch({ type: 'TOGGLE_TAXES', variantId });
    }, []);

    const removeItem = useCallback((variantId: string) => {
        dispatch({ type: 'REMOVE_ITEM', variantId });
    }, []);

    const clearCart = useCallback(() => {
        dispatch({ type: 'CLEAR' });
    }, []);

    const totals = useMemo(() => {
        return cart.reduce(
            (acc, item) => {
                const lineSubtotal = item.quantity * item.netPrice;
                const lineTotal = item.applyTaxes ? item.quantity * item.grossPrice : lineSubtotal;
                return {
                    subtotal: acc.subtotal + lineSubtotal,
                    total: acc.total + lineTotal,
                    taxAmount: acc.taxAmount + Math.max(lineTotal - lineSubtotal, 0),
                    hasTaxesApplied: acc.hasTaxesApplied || item.applyTaxes,
                };
            },
            { subtotal: 0, total: 0, taxAmount: 0, hasTaxesApplied: false }
        );
    }, [cart]);

    const paymentSummary = useMemo(() => {
        const paid = paymentAllocations.reduce((acc, entry) => acc + entry.amount, 0);
        const due = totals.total;
        const remaining = Math.max(due - paid, 0);
        const change = paid > due ? paid - due : 0;
        return { due, paid, remaining, change };
    }, [paymentAllocations, totals.total]);

    const openPaymentDialog = useCallback(() => {
        setPaymentAllocations([createPaymentEntry(PaymentMethod.CASH, totals.total)]);
        setPaymentDialogOpen(true);
    }, [totals.total]);

    const closePaymentDialog = useCallback(() => {
        setPaymentDialogOpen(false);
    }, []);

    const setSelectedCustomer = useCallback((customer: POSCustomerSummary | null) => {
        setSelectedCustomerState(customer);
    }, []);

    const addPaymentAllocation = useCallback(
        (method?: PaymentMethod) => {
            setPaymentAllocations((entries) => {
                const paid = entries.reduce((acc, entry) => acc + entry.amount, 0);
                const suggestedAmount = Math.max(totals.total - paid, 0);
                return [...entries, createPaymentEntry(method ?? PaymentMethod.CASH, suggestedAmount)];
            });
        },
        [totals.total]
    );

    const updatePaymentAllocation = useCallback(
        (id: string, patch: Partial<Omit<POSPaymentEntry, 'id'>>) => {
            setPaymentAllocations((entries) =>
                entries.map((entry) => {
                    if (entry.id !== id) {
                        return entry;
                    }
                    const next: POSPaymentEntry = { ...entry, ...patch };
                    if (patch.amount !== undefined) {
                        const numericAmount = Number(patch.amount);
                        next.amount = Math.max(0, Number.isFinite(numericAmount) ? numericAmount : 0);
                    }
                    if (patch.method !== undefined) {
                        next.method = patch.method;
                    }
                    if (patch.reference !== undefined) {
                        next.reference = patch.reference ?? '';
                    }
                    return next;
                })
            );
        },
        []
    );

    const removePaymentAllocation = useCallback((id: string) => {
        setPaymentAllocations((entries) => {
            if (entries.length <= 1) {
                return entries;
            }
            return entries.filter((entry) => entry.id !== id);
        });
    }, []);

    const value: POSContextValue = {
        isLoading: providerState.isLoading,
        isFetching: isFetching,
        error: providerState.error,
        context: providerState.context,
        branchName: providerState.context?.branch?.name
            ?? providerState.context?.storage?.branchName
            ?? null,
        storageName: providerState.context?.storage?.name ?? null,
        priceLists: providerState.context?.priceLists ?? [],
        selectedPriceListId: providerState.selectedPriceListId,
        setSelectedPriceListId,
        cart,
        addItemToCart,
        updateItemQuantity,
        toggleItemTaxes,
        removeItem,
        clearCart,
        totals,
        isPaymentDialogOpen,
        openPaymentDialog,
        closePaymentDialog,
        selectedCustomer,
        setSelectedCustomer,
        paymentAllocations,
        addPaymentAllocation,
        updatePaymentAllocation,
        removePaymentAllocation,
        paymentSummary,
    };

    return <PointOfSaleContext.Provider value={value}>{children}</PointOfSaleContext.Provider>;
}

export function usePointOfSale() {
    const context = useContext(PointOfSaleContext);
    if (!context) {
        throw new Error('usePointOfSale debe utilizarse dentro de PointOfSaleProvider');
    }
    return context;
}
