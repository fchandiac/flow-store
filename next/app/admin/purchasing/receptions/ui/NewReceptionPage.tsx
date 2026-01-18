'use client';

import { Fragment, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Select, { type Option as SelectOption } from '@/app/baseComponents/Select/Select';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { Button } from '@/app/baseComponents/Button/Button';
import Badge from '@/app/baseComponents/Badge/Badge';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import Switch from '@/app/baseComponents/Switch/Switch';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { getSuppliers } from '@/app/actions/suppliers';
import { getInventoryFilters } from '@/app/actions/inventory';
import { getAttributes } from '@/app/actions/attributes';
import { getActiveTaxes } from '@/app/actions/taxes';
import NumberStepper from '@/baseComponents/NumberStepper/NumberStepper';
import {
    searchPurchaseOrdersForReception,
    searchProductsForReception,
    getReceptionVariantDetail,
    createReceptionFromPurchaseOrder,
    createDirectReception,
    type PurchaseOrderForReception,
    type ReceptionLineInput,
    type ReceptionProductSearchItem,
} from '@/app/actions/receptions';
import { formatDateTime } from '@/lib/dateTimeUtils';

interface SupplierOption extends SelectOption {
    value: string;
    label: string;
    defaultPaymentTermDays?: number | null;
}

interface StorageOption extends SelectOption {
    value: string;
    label: string;
}

interface ReceptionLine {
    productVariantId: string;
    productName: string;
    sku: string;
    expectedQuantity?: number;
    receivedQuantity: number;
    unitPrice: number;
    unitCost: number;
    notes?: string;
    selectedTaxIds: string[];
    taxRate: number;
    unitOfMeasure?: string | null;
    attributeValues?: Record<string, string> | null;
    variantName?: string | null;
    allowDecimals: boolean;
}

interface TaxOption {
    id: string;
    name: string;
    rate: number;
    isDefault: boolean;
    code?: string | null;
}

interface PaymentEntry {
    id: string;
    amount: number;
    dueDate: string;
}

const createPaymentId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `pay-${Math.random().toString(36).slice(2, 10)}`;
};

const addDaysToDate = (baseDate: string, days: number): string => {
    const base = DATE_ONLY_REGEX.test(baseDate) ? `${baseDate}T00:00:00` : baseDate;
    const parsed = new Date(base);
    if (Number.isNaN(parsed.getTime())) {
        return formatDateOnly(new Date());
    }
    const cloned = new Date(parsed);
    cloned.setDate(cloned.getDate() + days);
    return formatDateOnly(cloned);
};

const cascadeDueDates = (payments: PaymentEntry[], baseDate: string, termDays: number): PaymentEntry[] => {
    if (payments.length === 0) {
        return [];
    }
    const sanitizedTerm = Number.isFinite(termDays) ? Math.max(0, Math.round(termDays)) : 0;
    return payments.map((payment, index) => ({
        ...payment,
        dueDate: addDaysToDate(baseDate, sanitizedTerm * (index + 1)),
    }));
};

const normalizePositiveAmount = (value: number): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }
    const rounded = Math.round(value);
    return rounded < 0 ? 0 : rounded;
};

const distributeAmountEvenly = (total: number, count: number): number[] => {
    const sanitizedTotal = normalizePositiveAmount(total);
    if (count <= 0) {
        return [];
    }
    const base = Math.floor(sanitizedTotal / count);
    let remainder = sanitizedTotal - base * count;
    return Array.from({ length: count }, () => {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) {
            remainder -= 1;
        }
        return base + extra;
    });
};

const rebalancePayments = (payments: PaymentEntry[], total: number): PaymentEntry[] => {
    const sanitizedTotal = normalizePositiveAmount(total);
    if (payments.length === 0) {
        return [];
    }
    if (sanitizedTotal === 0) {
        return payments.map((payment) => ({ ...payment, amount: 0 }));
    }
    const weightsBase = payments.reduce((sum, payment) => sum + normalizePositiveAmount(payment.amount), 0);
    if (weightsBase === 0) {
        const distributed = distributeAmountEvenly(sanitizedTotal, payments.length);
        return payments.map((payment, index) => ({
            ...payment,
            amount: distributed[index] ?? 0,
        }));
    }

    let remainder = sanitizedTotal;
    return payments.map((payment, index) => {
        const weight = normalizePositiveAmount(payment.amount);
        let amount = Math.floor((weight / weightsBase) * sanitizedTotal);
        if (!Number.isFinite(amount) || amount < 0) {
            amount = 0;
        }
        if (index === payments.length - 1) {
            amount = remainder;
        } else {
            if (amount > remainder) {
                amount = remainder;
            }
            remainder -= amount;
        }
        return {
            ...payment,
            amount,
        };
    });
};

const parseCurrencyInput = (value: string): number => {
    if (!value) {
        return 0;
    }
    const digitsOnly = value.replace(/[^0-9]/g, '');
    if (!digitsOnly) {
        return 0;
    }
    return normalizePositiveAmount(Number(digitsOnly));
};

const quantityFormatter = new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
});

const currencyFormatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const formatAttributeKey = (key: string) => {
    const normalized = key.replace(/[_-]+/g, ' ').trim();
    if (!normalized) return key;
    return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatVariantAttributes = (
    attributes: Record<string, string> | null | undefined,
    attributeNames: Record<string, string>
) => {
    if (!attributes) return '';
    const entries = Object.entries(attributes).filter(([, value]) => Boolean(value));
    if (entries.length === 0) return '';
    return entries
        .map(([key, value]) => `${attributeNames[key] ?? formatAttributeKey(key)}: ${value}`)
        .join(' · ');
};

const MIN_PRODUCT_SEARCH_LENGTH = 2;

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDateInput = (value?: string | null): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (DATE_ONLY_REGEX.test(trimmed)) {
        return trimmed;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toISOString().split('T')[0];
};

const formatDateOnly = (date: Date) => date.toISOString().split('T')[0];

const addDaysToDateOnly = (dateString: string, days: number) => {
    const base = DATE_ONLY_REGEX.test(dateString) ? new Date(`${dateString}T00:00:00`) : new Date(dateString);
    if (Number.isNaN(base.getTime())) {
        const today = new Date();
        return formatDateOnly(today);
    }
    const safeDays = Number.isFinite(days) ? days : 0;
    const result = new Date(base);
    result.setDate(result.getDate() + safeDays);
    return formatDateOnly(result);
};

const getTodayDate = () => formatDateOnly(new Date());

interface NewReceptionPageProps {
    onSuccess?: () => void;
}

export default function NewReceptionPage({ onSuccess }: NewReceptionPageProps) {
    const router = useRouter();
    const { success, error } = useAlert();

    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [storages, setStorages] = useState<StorageOption[]>([]);
    const [attributeNames, setAttributeNames] = useState<Record<string, string>>({});
    const [activeTaxes, setActiveTaxes] = useState<TaxOption[]>([]);
    const [taxesLoaded, setTaxesLoaded] = useState(false);
    const activeTaxesMap = useMemo(() => new Map(activeTaxes.map((tax) => [tax.id, tax])), [activeTaxes]);
    const exemptTaxId = useMemo(() => {
        const match = activeTaxes.find((tax) => tax.code?.trim().toUpperCase() === 'EXENTO');
        return match?.id ?? null;
    }, [activeTaxes]);
    const nonExemptTaxIds = useMemo(
        () => activeTaxes.filter((tax) => tax.code?.trim().toUpperCase() !== 'EXENTO').map((tax) => tax.id),
        [activeTaxes]
    );
    const getDefaultTaxSelection = useCallback((): string[] => {
        if (nonExemptTaxIds.length > 0) {
            return [...nonExemptTaxIds];
        }
        return exemptTaxId ? [exemptTaxId] : [];
    }, [nonExemptTaxIds, exemptTaxId]);
    const enforceExemptRules = useCallback(
        (selection: string[]): string[] => {
            const unique = Array.from(new Set(selection.filter((id) => activeTaxesMap.has(id))));
            if (exemptTaxId && unique.includes(exemptTaxId)) {
                return [exemptTaxId];
            }
            return unique;
        },
        [activeTaxesMap, exemptTaxId]
    );
    const computeTaxRate = useCallback(
        (
            selectedIds: string[],
            fallbackRates?: { id: string; rate: number }[],
            fallbackRate?: number
        ) => {
            if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
                const sanitizedFallback = Number.isFinite(fallbackRate ?? 0) ? Number(fallbackRate ?? 0) : 0;
                return Number(sanitizedFallback.toFixed(4));
            }

            const fallbackMap = fallbackRates
                ? new Map(fallbackRates.map((item) => [item.id, item.rate]))
                : undefined;

            const totalRaw = selectedIds.reduce((sum, id) => {
                const activeTax = activeTaxesMap.get(id);
                if (activeTax) {
                    const sanitizedRate = Number.isFinite(activeTax.rate) ? Number(activeTax.rate) : 0;
                    return sum + sanitizedRate;
                }
                const fallback = fallbackMap?.get(id) ?? 0;
                return sum + (Number.isFinite(fallback) ? fallback : 0);
            }, 0);

            const normalized = Number.isFinite(totalRaw) ? Number(totalRaw.toFixed(4)) : 0;
            if (normalized === 0 && typeof fallbackRate === 'number') {
                const sanitizedFallback = Number.isFinite(fallbackRate) ? Number(fallbackRate) : 0;
                return Number(sanitizedFallback.toFixed(4));
            }
            return normalized;
        },
        [activeTaxesMap]
    );

    const resolveTaxSelection = useCallback(
        (
            candidate: string[],
            fallbackRates?: { id: string; rate: number }[],
            fallbackRate?: number
        ) => {
            if (activeTaxes.length === 0) {
                const unique = Array.from(new Set(candidate.filter((id) => typeof id === 'string' && id.trim().length > 0)));
                const sanitizedFallback = Number.isFinite(fallbackRate ?? 0) ? Number(fallbackRate ?? 0) : 0;
                return {
                    selection: unique,
                    rate: Number(sanitizedFallback.toFixed(4)),
                };
            }

            const sanitizedSelection = enforceExemptRules(candidate);
            const defaultSelection = enforceExemptRules(getDefaultTaxSelection());
            const appliedSelection = sanitizedSelection.length > 0 ? sanitizedSelection : defaultSelection;
            const rate = computeTaxRate(appliedSelection, fallbackRates, fallbackRate);
            return {
                selection: appliedSelection,
                rate,
            };
        },
        [activeTaxes, enforceExemptRules, getDefaultTaxSelection, computeTaxRate]
    );

    const areSameSelection = useCallback((current: string[] | undefined, expected: string[]) => {
        if (!Array.isArray(current)) {
            return expected.length === 0;
        }
        if (current.length !== expected.length) {
            return false;
        }
        const currentSet = new Set(current);
        return expected.every((id) => currentSet.has(id));
    }, []);

    const [supplierId, setSupplierId] = useState<string | null>(null);
    const [storageId, setStorageId] = useState<string | null>(null);
    const [receptionDate, setReceptionDate] = useState(getTodayDate);
    const [paymentDate, setPaymentDate] = useState(getTodayDate);
    const [paymentDateTouched, setPaymentDateTouched] = useState(false);
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');

    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrderForReception | null>(null);
    const [purchaseOrderResults, setPurchaseOrderResults] = useState<PurchaseOrderForReception[]>([]);
    const [loadingPurchaseOrders, setLoadingPurchaseOrders] = useState(false);
    const [showPendingOrders, setShowPendingOrders] = useState(false);

    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<ReceptionProductSearchItem[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [addingProductId, setAddingProductId] = useState<string | null>(null);

    const [lines, setLines] = useState<ReceptionLine[]>([]);
    const [payments, setPayments] = useState<PaymentEntry[]>([]);
    const [paymentDatesTouched, setPaymentDatesTouched] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const supplierMap = useMemo(() => new Map(suppliers.map((supplier) => [supplier.value, supplier])), [suppliers]);

    const calculatePaymentDate = useCallback(
        (baseDate: string, supplierIdValue: string | null) => {
            const normalizedBase = normalizeDateInput(baseDate) ?? getTodayDate();
            if (!supplierIdValue) {
                return normalizedBase;
            }
            const supplier = supplierMap.get(supplierIdValue);
            const termDaysRaw = supplier?.defaultPaymentTermDays ?? 0;
            const termDays = Number.isFinite(termDaysRaw) ? Math.round(termDaysRaw) : 0;
            const candidate = addDaysToDateOnly(normalizedBase, termDays);
            return candidate < normalizedBase ? normalizedBase : candidate;
        },
        [supplierMap]
    );

    const searchProductTimeout = useRef<NodeJS.Timeout | null>(null);
    const latestProductSearchId = useRef(0);

    const handleSupplierChange = useCallback(
        (value: string | null) => {
            const nextSupplierId = value ?? null;
            setSupplierId(nextSupplierId);
            setPaymentDatesTouched(false);
            setPaymentDateTouched(false);
            setPaymentDate(calculatePaymentDate(receptionDate, nextSupplierId));
        },
        [calculatePaymentDate, receptionDate]
    );

    const handleReceptionDateChange = useCallback(
        (value: string) => {
            setReceptionDate(value);
            setPaymentDatesTouched(false);
            if (!paymentDateTouched) {
                setPaymentDate(calculatePaymentDate(value, supplierId));
            }
        },
        [calculatePaymentDate, paymentDateTouched, supplierId]
    );

    useEffect(() => {
        if (!supplierId || paymentDateTouched) {
            return;
        }
        setPaymentDate(calculatePaymentDate(receptionDate, supplierId));
    }, [calculatePaymentDate, paymentDateTouched, receptionDate, supplierId]);

    // Cargar datos iniciales
    const loadInitialData = useCallback(async () => {
        setTaxesLoaded(false);
        try {
            const [suppliersData, filtersData, pendingOrders, taxesData] = await Promise.all([
                getSuppliers(),
                getInventoryFilters(),
                searchPurchaseOrdersForReception(), // Sin parámetro, trae las últimas órdenes
                getActiveTaxes(),
            ]);

            setSuppliers(
                suppliersData.map((s) => ({
                    id: s.id,
                    value: s.id,
                    label: s.person?.businessName ?? s.person?.firstName ?? 'Proveedor',
                    defaultPaymentTermDays:
                        typeof s.defaultPaymentTermDays === 'number' && Number.isFinite(s.defaultPaymentTermDays)
                            ? Number(s.defaultPaymentTermDays)
                            : 0,
                }))
            );

            setStorages(
                filtersData.storages.map((s) => ({
                    id: s.id,
                    value: s.id,
                    label: s.branchName ? `${s.name} · ${s.branchName}` : s.name,
                }))
            );

            setPurchaseOrderResults(pendingOrders);

            setActiveTaxes(
                taxesData.map((tax) => ({
                    id: tax.id,
                    name: tax.name,
                    rate: Number(tax.rate ?? 0),
                    isDefault: Boolean(tax.isDefault),
                    code: tax.code ?? null,
                }))
            );

            try {
                const attributesData = await getAttributes(true);
                const attributeMap = Object.fromEntries(attributesData.map((attr) => [attr.id, attr.name]));
                setAttributeNames(attributeMap);
            } catch (attrErr) {
                console.error('Error loading attributes:', attrErr);
            }
        } catch (err) {
            console.error('Error loading initial data:', err);
            error('Error al cargar datos iniciales');
        } finally {
            setTaxesLoaded(true);
        }
    }, [error]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // Búsqueda de productos
    useEffect(() => {
        const term = productSearch.trim();

        if (searchProductTimeout.current) {
            clearTimeout(searchProductTimeout.current);
            searchProductTimeout.current = null;
        }

        if (term.length < MIN_PRODUCT_SEARCH_LENGTH) {
            latestProductSearchId.current += 1;
            setProductResults([]);
            setLoadingProducts(false);
            return;
        }

        searchProductTimeout.current = setTimeout(async () => {
            const requestId = latestProductSearchId.current + 1;
            latestProductSearchId.current = requestId;
            setLoadingProducts(true);
            try {
                const results = await searchProductsForReception({ search: term, limit: 20 });
                if (latestProductSearchId.current === requestId) {
                    setProductResults(results);
                }
            } catch (err) {
                console.error('Error searching products:', err);
                if (latestProductSearchId.current === requestId) {
                    error('No fue posible cargar productos');
                }
            } finally {
                if (latestProductSearchId.current === requestId) {
                    setLoadingProducts(false);
                }
            }
        }, 350);

        return () => {
            if (searchProductTimeout.current) {
                clearTimeout(searchProductTimeout.current);
                searchProductTimeout.current = null;
            }
        };
    }, [productSearch, error]);

    // Seleccionar orden de compra
    const handleSelectPurchaseOrder = (order: PurchaseOrderForReception) => {
        setSelectedPurchaseOrder(order);
        handleSupplierChange(order.supplierId ?? null);
        if (order.storageId) {
            setStorageId(order.storageId);
        }

        setShowPendingOrders(false);

        const normalizedOrderDueDate = normalizeDateInput(order.paymentDueDate ?? null);
        const baseReceptionDate = normalizeDateInput(receptionDate) ?? getTodayDate();
        if (normalizedOrderDueDate) {
            if (normalizedOrderDueDate < baseReceptionDate) {
                setPaymentDate(baseReceptionDate);
            } else {
                setPaymentDate(normalizedOrderDueDate);
            }
            setPaymentDateTouched(false);
        } else if (typeof order.paymentTermDays === 'number' && Number.isFinite(order.paymentTermDays)) {
            const sanitizedTermDays = Math.round(order.paymentTermDays);
            const candidate = addDaysToDateOnly(baseReceptionDate, sanitizedTermDays);
            setPaymentDate(candidate < baseReceptionDate ? baseReceptionDate : candidate);
            setPaymentDateTouched(false);
        }

        // Cargar líneas de la orden
        const orderLines: ReceptionLine[] = order.lines.map((line) => {
            const originalSelection = Array.isArray(line.taxIds)
                ? line.taxIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
                : line.taxId
                ? [line.taxId]
                : [];
            const fallbackTaxRate = typeof line.taxRate === 'number' ? line.taxRate : undefined;
            const { selection: appliedSelection, rate: effectiveTaxRate } = resolveTaxSelection(
                originalSelection,
                undefined,
                fallbackTaxRate
            );
            const allowDecimals = line.allowDecimals ?? true;
            // Align default received quantity with the unit's decimal policy
            const baseQuantity = Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 0;
            const initialReceivedQuantity = allowDecimals ? baseQuantity : Math.round(baseQuantity);

            return {
                productVariantId: line.productVariantId,
                productName: line.productName,
                sku: line.sku,
                expectedQuantity: baseQuantity,
                receivedQuantity: initialReceivedQuantity,
                unitPrice: line.unitPrice,
                unitCost: line.unitCost,
                notes: '',
                selectedTaxIds: appliedSelection,
                taxRate: effectiveTaxRate,
                unitOfMeasure: line.unitOfMeasure ?? null,
                attributeValues: null,
                variantName: line.variantName ?? null,
                allowDecimals,
            };
        });

        setLines(orderLines);
        setPaymentDatesTouched(false);
    };

    // Agregar producto manualmente
    const handleAddProduct = useCallback(
        async (product: ReceptionProductSearchItem) => {
            if (lines.some((line) => line.productVariantId === product.variantId)) {
                error('El producto ya está en la lista');
                return;
            }

            setAddingProductId(product.variantId);
            try {
                const detail = await getReceptionVariantDetail(product.variantId);
                if (!detail) {
                    error('No fue posible cargar la información del producto');
                    return;
                }

                const variantTaxIds = Array.isArray(detail.taxIds)
                    ? detail.taxIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
                    : [];
                const { selection: appliedSelection, rate: effectiveTaxRate } = resolveTaxSelection(variantTaxIds);

                const defaultPrice = detail.pmp || detail.baseCost || detail.basePrice || 0;
                const variantLabel = formatVariantAttributes(detail.attributeValues, attributeNames);
                const allowDecimals = detail.allowDecimals ?? true;

                const newLine: ReceptionLine = {
                    productVariantId: detail.variantId,
                    productName: detail.productName,
                    sku: detail.sku,
                    receivedQuantity: 1,
                    unitPrice: defaultPrice,
                    unitCost: defaultPrice,
                    notes: '',
                    selectedTaxIds: appliedSelection,
                    taxRate: effectiveTaxRate,
                    unitOfMeasure: detail.unitOfMeasure ?? null,
                    attributeValues: detail.attributeValues ?? null,
                    variantName: variantLabel || null,
                    allowDecimals,
                };

                setLines((prev) => {
                    if (prev.some((line) => line.productVariantId === detail.variantId)) {
                        return prev;
                    }
                    return [...prev, newLine];
                });
                setProductSearch('');
                setProductResults([]);
            } catch (err) {
                console.error('Error adding product to reception:', err);
                error('No fue posible agregar el producto');
            } finally {
                setAddingProductId(null);
            }
        },
        [lines, error, resolveTaxSelection, attributeNames]
    );

    const handleToggleTax = useCallback(
        (variantId: string, taxId: string, enabled: boolean) => {
            setLines((currentLines) =>
                currentLines.map((line) => {
                    if (line.productVariantId !== variantId) {
                        return line;
                    }

                    const baseSelection = Array.isArray(line.selectedTaxIds) ? line.selectedTaxIds : [];
                    const isExemptToggle = exemptTaxId !== null && taxId === exemptTaxId;
                    const fallbackRate = typeof line.taxRate === 'number' ? line.taxRate : undefined;

                    let candidateSelection: string[];

                    if (isExemptToggle) {
                        candidateSelection = enabled ? [taxId] : getDefaultTaxSelection();
                    } else {
                        const selectionSet = new Set(baseSelection);
                        if (enabled) {
                            selectionSet.add(taxId);
                            if (exemptTaxId) {
                                selectionSet.delete(exemptTaxId);
                            }
                        } else {
                            selectionSet.delete(taxId);
                        }
                        candidateSelection = Array.from(selectionSet);
                    }

                    const { selection: finalSelection, rate: recalculatedRate } = resolveTaxSelection(
                        candidateSelection,
                        undefined,
                        fallbackRate
                    );

                    if (areSameSelection(baseSelection, finalSelection) && Math.abs(recalculatedRate - Number(line.taxRate ?? 0)) < 0.0001) {
                        return line;
                    }

                    return {
                        ...line,
                        selectedTaxIds: finalSelection,
                        taxRate: recalculatedRate,
                    };
                })
            );
        },
        [exemptTaxId, getDefaultTaxSelection, resolveTaxSelection, areSameSelection]
    );

    useEffect(() => {
        if (!taxesLoaded) {
            return;
        }

        setLines((currentLines) => {
            let changed = false;
            const updated = currentLines.map((line) => {
                const currentSelection = Array.isArray(line.selectedTaxIds) ? line.selectedTaxIds : [];
                const { selection: resolvedSelection, rate: resolvedRate } = resolveTaxSelection(
                    currentSelection,
                    undefined,
                    line.taxRate
                );

                if (areSameSelection(currentSelection, resolvedSelection) && Math.abs(resolvedRate - Number(line.taxRate ?? 0)) < 0.0001) {
                    return line;
                }

                changed = true;
                return {
                    ...line,
                    selectedTaxIds: resolvedSelection,
                    taxRate: resolvedRate,
                };
            });

            return changed ? updated : currentLines;
        });
    }, [taxesLoaded, resolveTaxSelection, areSameSelection]);

    // Actualizar línea
    const updateLine = (index: number, updates: Partial<ReceptionLine>) => {
        const updated = [...lines];
        updated[index] = { ...updated[index], ...updates };
        setLines(updated);
    };

    // Eliminar línea
    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    };

    // Limpiar formulario
    const resetForm = async () => {
        setSupplierId(null);
        setStorageId(null);
        const today = getTodayDate();
        setReceptionDate(today);
        setPaymentDate(today);
        setPaymentDateTouched(false);
        setReference('');
        setNotes('');
        setSelectedPurchaseOrder(null);
        setProductSearch('');
        setProductResults([]);
        setLines([]);
        setPayments([]);
        setPaymentDatesTouched(false);
        setShowPendingOrders(false);
        
        // Recargar órdenes pendientes
        try {
            const pendingOrders = await searchPurchaseOrdersForReception();
            setPurchaseOrderResults(pendingOrders);
        } catch (err) {
            console.error('Error reloading purchase orders:', err);
        }
    };

    // Calcular totales
    const totals = useMemo(() => {
        const subtotalValue = lines.reduce((sum, line) => sum + line.receivedQuantity * line.unitPrice, 0);
        const taxesValue = lines.reduce((sum, line) => {
            const base = line.receivedQuantity * line.unitPrice;
            const rate = Number(line.taxRate ?? 0);
            const sanitizedRate = Number.isFinite(rate) ? rate : 0;
            return sum + base * (sanitizedRate / 100);
        }, 0);
        return {
            subtotal: subtotalValue,
            taxes: taxesValue,
            total: subtotalValue + taxesValue,
        };
    }, [lines]);

    const totalAmount = useMemo(() => normalizePositiveAmount(totals.total), [totals.total]);

    const paymentTermDays = useMemo(() => {
        if (
            selectedPurchaseOrder &&
            typeof selectedPurchaseOrder.paymentTermDays === 'number' &&
            Number.isFinite(selectedPurchaseOrder.paymentTermDays)
        ) {
            return Math.max(0, Math.round(Number(selectedPurchaseOrder.paymentTermDays)));
        }
        if (supplierId) {
            const supplier = supplierMap.get(supplierId);
            const rawTerm = supplier?.defaultPaymentTermDays ?? 0;
            if (Number.isFinite(rawTerm)) {
                return Math.max(0, Math.round(Number(rawTerm)));
            }
        }
        return 0;
    }, [selectedPurchaseOrder, supplierId, supplierMap]);

    const paymentBaseDate = useMemo(() => normalizeDateInput(receptionDate) ?? getTodayDate(), [receptionDate]);

    const paymentTotals = useMemo(
        () => payments.reduce((sum, payment) => sum + normalizePositiveAmount(payment.amount), 0),
        [payments]
    );

    const arePaymentDatesValid = useMemo(
        () => payments.every((payment) => Boolean(payment.dueDate) && DATE_ONLY_REGEX.test(payment.dueDate)),
        [payments]
    );

    const paymentTotalsMatch = paymentTotals === totalAmount;
    const paymentDifference = paymentTotals - totalAmount;
    const paymentsValid =
        totalAmount === 0
            ? payments.length === 0
            : payments.length > 0 && paymentTotalsMatch && arePaymentDatesValid;
    const canEditPaymentAmounts = payments.length > 1;

    const handleAddPayment = useCallback(() => {
        if (totalAmount === 0) {
            return;
        }
        setPaymentDatesTouched(false);
        setPayments((prev) => {
            const count = Math.max(1, prev.length + 1);
            const distributed = distributeAmountEvenly(totalAmount, count);
            return distributed.map((amount, index) => {
                const existing = prev[index];
                if (existing) {
                    return {
                        ...existing,
                        amount,
                        dueDate:
                            existing.dueDate ?? addDaysToDate(paymentBaseDate, paymentTermDays * (index + 1)),
                    };
                }
                return {
                    id: createPaymentId(),
                    amount,
                    dueDate: addDaysToDate(paymentBaseDate, paymentTermDays * (index + 1)),
                };
            });
        });
    }, [totalAmount, paymentBaseDate, paymentTermDays]);

    const handleRemovePayment = useCallback(
        (paymentId: string) => {
            setPaymentDatesTouched(false);
            setPayments((prev) => {
                if (prev.length <= 1) {
                    return prev;
                }
                const filtered = prev.filter((payment) => payment.id !== paymentId);
                if (filtered.length === prev.length) {
                    return prev;
                }
                if (totalAmount === 0) {
                    return [];
                }
                const distributed = distributeAmountEvenly(totalAmount, filtered.length);
                return filtered.map((payment, index) => ({
                    ...payment,
                    amount: distributed[index] ?? payment.amount,
                }));
            });
        },
        [totalAmount]
    );

    const handlePaymentAmountChange = useCallback((paymentId: string, rawValue: string) => {
        const sanitized = parseCurrencyInput(rawValue);
        setPayments((prev) =>
            prev.map((payment) => (payment.id === paymentId ? { ...payment, amount: sanitized } : payment))
        );
    }, []);

    const handlePaymentDateChange = useCallback((paymentId: string, rawValue: string) => {
        const normalized = normalizeDateInput(rawValue);
        if (!normalized) {
            return;
        }
        setPaymentDatesTouched(true);
        setPayments((prev) =>
            prev.map((payment) => (payment.id === paymentId ? { ...payment, dueDate: normalized } : payment))
        );
    }, []);

    useEffect(() => {
        if (payments.length === 0) {
            if (paymentDate !== paymentBaseDate) {
                setPaymentDate(paymentBaseDate);
            }
            setPaymentDateTouched(false);
            return;
        }

        const initialDueDate = payments[0]?.dueDate ?? paymentBaseDate;
        const latestDueDate = payments.reduce((latest, payment) => {
            const candidate = payment.dueDate ?? latest;
            return candidate > latest ? candidate : latest;
        }, initialDueDate);

        if (latestDueDate && latestDueDate !== paymentDate) {
            setPaymentDate(latestDueDate);
        }
        setPaymentDateTouched(false);
    }, [payments, paymentBaseDate, paymentDate]);

    useEffect(() => {
        if (totalAmount === 0) {
            setPayments((prev) => (prev.length === 0 ? prev : []));
            setPaymentDatesTouched(false);
            return;
        }

        setPayments((prev) => {
            if (prev.length === 0) {
                const distributed = distributeAmountEvenly(totalAmount, 1);
                return distributed.map((amount, index) => ({
                    id: createPaymentId(),
                    amount,
                    dueDate: addDaysToDate(paymentBaseDate, paymentTermDays * (index + 1)),
                }));
            }

            let next = prev;
            let changed = false;

            if (prev.length === 1) {
                const currentAmount = normalizePositiveAmount(prev[0].amount);
                if (currentAmount !== totalAmount) {
                    next = [{ ...prev[0], amount: totalAmount }];
                    changed = true;
                }
            } else {
                const currentSum = prev.reduce((sum, payment) => sum + normalizePositiveAmount(payment.amount), 0);
                if (currentSum !== totalAmount) {
                    next = rebalancePayments(prev, totalAmount);
                    changed = true;
                }
            }

            if (!paymentDatesTouched) {
                const cascaded = cascadeDueDates(next, paymentBaseDate, paymentTermDays);
                const dueChanged =
                    cascaded.length !== next.length ||
                    cascaded.some((payment, index) => payment.dueDate !== next[index]?.dueDate);
                if (dueChanged) {
                    next = cascaded;
                    changed = true;
                }
            }

            return changed ? next : prev;
        });
    }, [totalAmount, paymentBaseDate, paymentTermDays, paymentDatesTouched]);

    const isSubmitDisabled = submitting || !supplierId || !storageId || lines.length === 0 || !paymentsValid;

    // Validar y confirmar recepción
    const handleConfirm = async () => {
        if (!supplierId) {
            error('Debe seleccionar un proveedor');
            return;
        }

        if (!storageId) {
            error('Debe seleccionar un almacén');
            return;
        }

        if (lines.length === 0) {
            error('Debe agregar al menos un producto');
            return;
        }

        const normalizedReceptionDate = normalizeDateInput(receptionDate);
        if (!normalizedReceptionDate) {
            error('Debe definir una fecha de recepción válida');
            return;
        }

        const normalizedPaymentDate = normalizeDateInput(paymentDate);
        if (!normalizedPaymentDate) {
            error('Debe definir una fecha de pago válida');
            return;
        }

        if (normalizedPaymentDate < normalizedReceptionDate) {
            error('La fecha de pago debe ser igual o posterior a la fecha de recepción');
            return;
        }

        if (!paymentsValid) {
            error('Distribuye el total de la recepción entre los pagos antes de confirmar.');
            return;
        }

        setSubmitting(true);

        try {
            const receptionLines: ReceptionLineInput[] = lines.map((line) => ({
                productVariantId: line.productVariantId,
                expectedQuantity: line.expectedQuantity,
                receivedQuantity: line.receivedQuantity,
                unitPrice: line.unitPrice,
                unitCost: line.unitCost,
                notes: line.notes,
                taxRate: line.taxRate,
                taxIds: line.selectedTaxIds,
                qualityStatus: 'APPROVED',
            }));

            let result;

            if (selectedPurchaseOrder) {
                // Recepción con orden de compra
                result = await createReceptionFromPurchaseOrder({
                    purchaseOrderId: selectedPurchaseOrder.id,
                    storageId,
                    receptionDate: normalizedReceptionDate,
                    paymentDueDate: normalizedPaymentDate,
                    notes,
                    lines: receptionLines,
                });
            } else {
                // Recepción directa
                result = await createDirectReception({
                    supplierId,
                    storageId,
                    receptionDate: normalizedReceptionDate,
                    paymentDueDate: normalizedPaymentDate,
                    reference,
                    notes,
                    lines: receptionLines,
                });
            }

            if (result.success) {
                success(
                    result.discrepancies
                        ? `Recepción creada con ${result.discrepancies.length} discrepancia(s)`
                        : 'Recepción creada exitosamente'
                );
                resetForm();
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                error(result.error ?? 'Error al crear la recepción');
            }
        } catch (err) {
            console.error('Error creating reception:', err);
            error('Error al crear la recepción');
        } finally {
            setSubmitting(false);
        }
    };

    // Detectar discrepancias
    const hasDiscrepancies = lines.some(
        (line) => line.expectedQuantity && line.receivedQuantity !== line.expectedQuantity
    );

    const trimmedProductSearch = productSearch.trim();

    return (
        <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px,1fr]">
                <aside className="space-y-4">
                    {!selectedPurchaseOrder && (
                        <div className="border border-border rounded-md bg-white p-4 space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase">
                                    Órdenes pendientes
                                </h2>
                                <div className="flex items-center gap-1">
                                    {loadingPurchaseOrders && <DotProgress size={12} totalSteps={3} />}
                                    <IconButton
                                        icon="arrow_drop_down"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowPendingOrders((prev) => !prev)}
                                        ariaLabel={showPendingOrders ? 'Ocultar órdenes pendientes' : 'Mostrar órdenes pendientes'}
                                        className={`transition-transform ${showPendingOrders ? 'rotate-180' : ''}`}
                                    />
                                </div>
                            </div>
                            {showPendingOrders && !loadingPurchaseOrders && purchaseOrderResults.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    No hay órdenes de compra pendientes de recepción.
                                </p>
                            )}
                            {showPendingOrders && purchaseOrderResults.length > 0 && (
                                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                    {purchaseOrderResults.map((order) => (
                                        <button
                                            key={order.id}
                                            onClick={() => handleSelectPurchaseOrder(order)}
                                            className="w-full rounded-md border border-border bg-background p-3 text-left shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:shadow"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="font-mono text-sm font-semibold text-primary-600">
                                                    {order.documentNumber}
                                                </span>
                                                <Badge variant="info">{order.lines.length} ítems</Badge>
                                            </div>
                                            <div className="mt-1 text-sm font-medium text-foreground">
                                                {order.supplierName}
                                            </div>
                                            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{formatDateTime(order.createdAt)}</span>
                                                <span className="font-semibold text-foreground">
                                                    {currencyFormatter.format(order.total)}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="border border-border rounded-md bg-white p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase">
                                {selectedPurchaseOrder ? 'Agregar productos extra' : 'Buscar productos'}
                            </h2>
                            {loadingProducts && <DotProgress size={12} totalSteps={3} />}
                        </div>
                        {selectedPurchaseOrder && (
                            <p className="text-xs text-muted-foreground">
                                Puedes sumar productos adicionales a la recepción seleccionada.
                            </p>
                        )}
                        <TextField
                            label="Buscar producto"
                            value={productSearch}
                            onChange={(event) => setProductSearch(event.target.value)}
                            placeholder="Nombre, SKU o código"
                            startIcon="search"
                        />
                        {trimmedProductSearch.length > 0 && trimmedProductSearch.length < MIN_PRODUCT_SEARCH_LENGTH && !loadingProducts && (
                            <p className="text-xs text-muted-foreground">
                                Ingresa al menos {MIN_PRODUCT_SEARCH_LENGTH} caracteres para buscar.
                            </p>
                        )}
                        {trimmedProductSearch.length >= MIN_PRODUCT_SEARCH_LENGTH && productResults.length === 0 && !loadingProducts && (
                            <p className="text-xs text-muted-foreground">
                                No se encontraron productos para "{trimmedProductSearch}".
                            </p>
                        )}
                        {productResults.length > 0 && (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {productResults.map((product) => {
                                    const variantAttributes = formatVariantAttributes(
                                        product.attributeValues,
                                        attributeNames
                                    );
                                    return (
                                        <button
                                            key={product.variantId}
                                            type="button"
                                            onClick={() => handleAddProduct(product)}
                                            className="w-full rounded-md border border-border bg-background p-3 text-left transition hover:border-primary-200 hover:bg-primary-50"
                                            disabled={addingProductId === product.variantId}
                                        >
                                            <div className="text-sm font-medium text-foreground">
                                                {product.productName}
                                            </div>
                                            <div className="text-xs text-muted-foreground">SKU {product.sku}</div>
                                            {variantAttributes && (
                                                <div className="text-xs text-muted-foreground">{variantAttributes}</div>
                                            )}
                                            {product.unitOfMeasure && (
                                                <div className="text-xs text-muted-foreground">
                                                    Unidad: {product.unitOfMeasure}
                                                </div>
                                            )}
                                            <div className="mt-2 text-xs font-semibold text-foreground">
                                                PMP {currencyFormatter.format(product.pmp)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </aside>

                <section className="border border-border rounded-md bg-white p-5 space-y-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-6">
                        <div className="flex flex-col gap-3 flex-1 xl:max-w-lg">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <IconButton
                                        icon="restart_alt"
                                        variant="ghost"
                                        size="sm"
                                        onClick={resetForm}
                                        ariaLabel="Reiniciar formulario"
                                        title="Reiniciar formulario"
                                    />
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">Detalle de recepción</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Revisa y ajusta las cantidades antes de confirmar la recepción.
                                        </p>
                                        {selectedPurchaseOrder && (
                                            <p className="text-xs text-muted-foreground">
                                                Orden origen: {selectedPurchaseOrder.documentNumber}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {hasDiscrepancies && (
                                    <div className="flex items-center gap-2">
                                        <Badge variant="warning">Con discrepancias</Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid flex-1 grid-cols-1 gap-3">
                            <Select
                                label="Proveedor *"
                                options={suppliers}
                                value={supplierId ?? null}
                                onChange={(value) => handleSupplierChange((value as string) ?? null)}
                                placeholder="Seleccionar proveedor"
                                disabled={!!selectedPurchaseOrder}
                            />
                            <Select
                                label="Almacén *"
                                options={storages}
                                value={storageId ?? null}
                                onChange={(value) => setStorageId((value as string) ?? null)}
                                placeholder="Seleccionar almacén"
                            />
                            <TextField
                                label="Fecha de recepción"
                                type="date"
                                value={receptionDate}
                                onChange={(event) => handleReceptionDateChange(event.target.value)}
                            />
                            {!selectedPurchaseOrder && (
                                <TextField
                                    label="Referencia externa"
                                    value={reference}
                                    onChange={(event) => setReference(event.target.value)}
                                    placeholder="Número de factura, guía, etc."
                                />
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                                    <th className="py-2 pr-3 w-[220px]">Producto</th>
                                    <th className="py-2 pr-3 w-[110px]">Cant. esperada</th>
                                    <th className="py-2 pr-3 w-[120px]">Cant. recibida</th>
                                    <th className="py-2 pr-3">Precio neto</th>
                                    <th className="py-2 pr-3">Impuestos</th>
                                    <th className="py-2 pr-3">Subtotal</th>
                                    <th className="py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                                            {selectedPurchaseOrder
                                                ? 'Selecciona una orden o agrega productos adicionales para comenzar.'
                                                : 'Busca y agrega productos para construir la recepción.'}
                                        </td>
                                    </tr>
                                ) : (
                                    lines.map((line, index) => {
                                        const subtotalLine = line.receivedQuantity * line.unitPrice;
                                        const difference =
                                            line.expectedQuantity !== undefined
                                                ? line.receivedQuantity - line.expectedQuantity
                                                : null;
                                        const attributeSummary = formatVariantAttributes(line.attributeValues, attributeNames);
                                        const variantLabel = attributeSummary || line.variantName || '';

                                        return (
                                            <Fragment key={`${line.productVariantId ?? line.sku}-${index}`}>
                                                <tr className="border-b border-border/70 align-top">
                                                    <td className="py-3 pr-3 w-[220px] max-w-[220px] align-top">
                                                        <div className="font-medium text-foreground break-words">
                                                            {line.productName}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">SKU {line.sku}</div>
                                                        {variantLabel && (
                                                            <div className="mt-1 text-xs text-muted-foreground break-words">
                                                                {variantLabel}
                                                            </div>
                                                        )}
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            Unidad: {line.unitOfMeasure ?? '—'}
                                                        </div>
                                                        {difference !== null && difference !== 0 && (
                                                            <div className="mt-2 inline-flex items-center gap-2">
                                                                <Badge variant="warning">
                                                                    Diferencia {quantityFormatter.format(difference)}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 pr-3 w-[110px] text-sm text-muted-foreground">
                                                        {line.expectedQuantity !== undefined
                                                            ? quantityFormatter.format(line.expectedQuantity)
                                                            : '—'}
                                                    </td>
                                                    <td className="py-3 pr-3 w-[120px]">
                                                        <div className="w-32">
                                                            <NumberStepper
                                                                value={line.receivedQuantity}
                                                                onChange={(value) => {
                                                                    if (!Number.isFinite(value)) {
                                                                        updateLine(index, { receivedQuantity: 0 });
                                                                        return;
                                                                    }
                                                                    let sanitized = value;
                                                                    if (!line.allowDecimals) {
                                                                        sanitized = Math.round(sanitized);
                                                                    } else {
                                                                        sanitized = Number(sanitized.toFixed(3));
                                                                    }
                                                                    if (sanitized < 0) {
                                                                        sanitized = 0;
                                                                    }
                                                                    updateLine(index, { receivedQuantity: sanitized });
                                                                }}
                                                                step={line.allowDecimals ? 0.001 : 1}
                                                                min={0}
                                                                allowNegative={false}
                                                                allowFloat={line.allowDecimals}
                                                                className="text-center"
                                                                data-test-id={`line-${index}-quantity`}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="py-3 pr-3">
                                                        <TextField
                                                            label="Precio neto"
                                                            type="currency"
                                                            value={String(Math.max(0, Math.round(line.unitPrice)))}
                                                            onChange={(event) => {
                                                                const raw = event.target.value ?? '';
                                                                const parsed = Number(raw.replace(/[^\d]/g, ''));
                                                                const sanitized = Number.isFinite(parsed) ? parsed : 0;
                                                                updateLine(index, {
                                                                    unitPrice: sanitized,
                                                                    unitCost: sanitized,
                                                                });
                                                            }}
                                                            currencySymbol="$"
                                                            inputMode="numeric"
                                                            className="w-24 [&>div>input]:min-w-0 [&>div>input]:w-full [&>div>input]:text-left [&_[data-test-id='text-field-label']]:hidden"
                                                        />
                                                    </td>
                                                    <td className="py-3 pr-3 align-top">
                                                        {activeTaxes.length === 0 ? (
                                                            <span className="text-xs text-muted-foreground">
                                                                {selectedPurchaseOrder
                                                                    ? 'Los impuestos de la orden original ya no están disponibles.'
                                                                    : 'Sin impuestos configurados'}
                                                            </span>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                {activeTaxes.map((tax) => {
                                                                    const isChecked = line.selectedTaxIds?.includes(tax.id) ?? false;
                                                                    return (
                                                                        <div key={tax.id} className="flex items-center justify-between gap-3">
                                                                            <Switch
                                                                                label={tax.name}
                                                                                labelPosition="right"
                                                                                checked={isChecked}
                                                                                onChange={(checked) =>
                                                                                    handleToggleTax(line.productVariantId, tax.id, checked)
                                                                                }
                                                                                disabled={!taxesLoaded}
                                                                            />
                                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                                {Number(tax.rate ?? 0)}%
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 pr-3 font-semibold text-foreground">
                                                        {currencyFormatter.format(subtotalLine)}
                                                    </td>
                                                    <td className="py-3">
                                                        <IconButton
                                                            icon="delete"
                                                            variant="text"
                                                            size="sm"
                                                            onClick={() => removeLine(index)}
                                                            title="Eliminar línea"
                                                        />
                                                    </td>
                                                </tr>
                                            </Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-4">
                        <TextField
                            label="Notas generales"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Observaciones generales de la recepción"
                            type="textarea"
                            rows={3}
                        />
                        <div className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground">Productos</span>
                                <span className="text-lg font-semibold text-foreground">{lines.length}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground">Cantidad total</span>
                                <span className="text-lg font-semibold text-foreground">
                                    {quantityFormatter.format(lines.reduce((sum, line) => sum + line.receivedQuantity, 0))} uds
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground">Subtotal neto</span>
                                <span className="text-lg font-semibold text-foreground">
                                    {currencyFormatter.format(totals.subtotal)}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground">Impuestos</span>
                                <span className="text-lg font-semibold text-foreground">
                                    {currencyFormatter.format(totals.taxes)}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground">Total</span>
                                <span className="text-lg font-semibold text-foreground">
                                    {currencyFormatter.format(totals.total)}
                                </span>
                            </div>
                        </div>
                        <div className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase">Pagos</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Distribuye el total de la recepción entre uno o más pagos y ajusta las fechas según sea necesario.
                                    </p>
                                </div>
                                <IconButton
                                    icon="add"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleAddPayment}
                                    disabled={totalAmount === 0}
                                    title="Agregar pago"
                                />
                            </div>
                            {payments.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    Agrega productos para calcular el total a pagar.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {payments.map((payment, index) => (
                                        <div
                                            key={payment.id}
                                            className="space-y-2 rounded-md border border-border bg-background p-3"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">Pago {index + 1}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {canEditPaymentAmounts
                                                            ? 'Ajusta el monto si necesitas repartir el total.'
                                                            : 'Se aplicará un pago único por el total.'}
                                                    </p>
                                                </div>
                                                {canEditPaymentAmounts && (
                                                    <IconButton
                                                        icon="delete"
                                                        variant="text"
                                                        size="xs"
                                                        onClick={() => handleRemovePayment(payment.id)}
                                                        title="Eliminar pago"
                                                    />
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                                                <TextField
                                                    label="Monto del pago"
                                                    type="currency"
                                                    value={String(normalizePositiveAmount(payment.amount))}
                                                    onChange={(event) =>
                                                        handlePaymentAmountChange(payment.id, event.target.value)
                                                    }
                                                    disabled={!canEditPaymentAmounts}
                                                    className="w-full sm:w-64"
                                                />
                                                <TextField
                                                    label="Fecha de pago"
                                                    type="date"
                                                    value={payment.dueDate ?? paymentBaseDate}
                                                    onChange={(event) =>
                                                        handlePaymentDateChange(payment.id, event.target.value)
                                                    }
                                                    className="w-full sm:w-48"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="space-y-1 rounded-md bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                                <div className="flex items-center justify-between">
                                    <span>Total de la recepción</span>
                                    <span className="font-semibold text-foreground">
                                        {currencyFormatter.format(totalAmount)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Total asignado a pagos</span>
                                    <span
                                        className={`font-semibold ${paymentsValid ? 'text-foreground' : 'text-red-500'}`}
                                    >
                                        {currencyFormatter.format(paymentTotals)}
                                    </span>
                                </div>
                                {!paymentsValid && (
                                    <div className="flex items-center justify-between text-red-500">
                                        {paymentTotalsMatch ? (
                                            <>
                                                <span>Fechas de pago pendientes</span>
                                                <span>Revisa las fechas</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Diferencia pendiente</span>
                                                <span>{currencyFormatter.format(Math.abs(paymentDifference))}</span>
                                            </>
                                        )}
                                    </div>
                                )}
                                <p className="text-[11px]">
                                    El total de los pagos debe coincidir con el total de la recepción para habilitar la confirmación.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
                            <Button
                                onClick={handleConfirm}
                                variant="primary"
                                className="w-full sm:w-auto"
                                disabled={isSubmitDisabled}
                            >
                                {submitting ? 'Confirmando…' : 'Confirmar recepción'}
                            </Button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
