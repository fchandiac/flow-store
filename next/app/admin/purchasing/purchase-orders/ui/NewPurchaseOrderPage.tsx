'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Select, { type Option as SelectOption } from '@/app/baseComponents/Select/Select';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import Badge from '@/app/baseComponents/Badge/Badge';
import { Button } from '@/app/baseComponents/Button/Button';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { getSuppliers } from '@/app/actions/suppliers';
import { getCategories } from '@/app/actions/categories';
import { getInventoryFilters } from '@/app/actions/inventory';
import { getActiveTaxes } from '@/app/actions/taxes';
import { getAttributes } from '@/app/actions/attributes';
import Switch from '@/app/baseComponents/Switch/Switch';
import NumberStepper from '@/baseComponents/NumberStepper/NumberStepper';
import {
    createPurchaseOrder,
    searchProductsForPurchase,
    type PurchaseOrderProductResult,
    type PurchaseOrderActionResult,
} from '@/app/actions/purchaseOrders';

interface SupplierOption extends SelectOption {
    paymentTermDays?: number | null;
}



interface StorageOption extends SelectOption {
    branchId?: string | null;
}

interface OrderLine extends PurchaseOrderProductResult {
    quantity: number;
    unitPrice: number;
    unitCost: number;
    taxRate: number;
    selectedTaxIds: string[];
    notes?: string;
}

interface TaxOption {
    id: string;
    name: string;
    rate: number;
    code: string;
}

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

const DECIMAL_STEP = 0.001;

const sanitizeLineQuantity = (value: number, allowDecimals: boolean): number => {
    if (!Number.isFinite(value)) {
        return allowDecimals ? DECIMAL_STEP : 1;
    }

    if (allowDecimals) {
        const clamped = Math.max(DECIMAL_STEP, value);
        return Number(clamped.toFixed(3));
    }

    const rounded = Math.round(value);
    return Math.max(1, rounded);
};

const formatAttributeKey = (key: string) => {
    const normalized = key.replace(/[_-]+/g, ' ').trim();
    if (!normalized) return key;
    return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const attributeLabel = (
    attributes?: Record<string, string> | null,
    attributeNames?: Record<string, string>
) => {
    if (!attributes) return '';
    const entries = Object.entries(attributes).filter(([, value]) => Boolean(value));
    if (entries.length === 0) return '';
    return entries
        .map(([key, value]) => `${attributeNames?.[key] ?? formatAttributeKey(key)}: ${value}`)
        .join(' · ');
};

const buildSupplierLabel = (supplier: Awaited<ReturnType<typeof getSuppliers>>[number]): string => {
    const person = supplier.person;
    if (person?.businessName) return person.businessName;
    const name = [person?.firstName, person?.lastName].filter(Boolean).join(' ');
    if (name) return name;
    return 'Proveedor';
};

const buildBranchOptionLabel = (branch: Awaited<ReturnType<typeof getInventoryFilters>>['branches'][number]) => {
    return branch.isHeadquarters ? `${branch.name} (Casa matriz)` : branch.name;
};

const buildStorageOptionLabel = (storage: Awaited<ReturnType<typeof getInventoryFilters>>['storages'][number]) => {
    if (storage.branchName) {
        return `${storage.name} · ${storage.branchName}`;
    }
    return storage.name;
};

const NewPurchaseOrderPage = () => {
    const router = useRouter();
    const { success, error } = useAlert();

    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [categories, setCategories] = useState<SelectOption[]>([]);
    const [storages, setStorages] = useState<StorageOption[]>([]);
    const [attributeNames, setAttributeNames] = useState<Record<string, string>>({});

    const [supplierId, setSupplierId] = useState<string | null>(null);
    const [storageId, setStorageId] = useState<string | null>(null);
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [expectedDate, setExpectedDate] = useState('');

    const [productResults, setProductResults] = useState<PurchaseOrderProductResult[]>([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [lines, setLines] = useState<OrderLine[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [activeTaxes, setActiveTaxes] = useState<TaxOption[]>([]);
    const [taxesLoaded, setTaxesLoaded] = useState(false);

    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    const activeTaxesMap = useMemo(() => new Map(activeTaxes.map((tax) => [tax.id, tax])), [activeTaxes]);

    const exemptTaxId = useMemo(() => {
        const match = activeTaxes.find((tax) => tax.code?.trim().toUpperCase() === 'EXENTO');
        return match?.id ?? null;
    }, [activeTaxes]);

    const nonExemptTaxIds = useMemo(() => {
        return activeTaxes
            .filter((tax) => tax.code?.trim().toUpperCase() !== 'EXENTO')
            .map((tax) => tax.id);
    }, [activeTaxes]);

    const getDefaultTaxSelection = useCallback((): string[] => {
        if (nonExemptTaxIds.length > 0) {
            return [...nonExemptTaxIds];
        }
        return [];
    }, [nonExemptTaxIds]);

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

    const computeCombinedRate = useCallback(
        (taxIds: string[], fallbackRates: { id: string; rate: number }[] = []) => {
            const fallbackMap = new Map(
                fallbackRates.map((tax) => [tax.id, Number.isFinite(Number(tax.rate)) ? Number(tax.rate) : 0])
            );

            const total = taxIds.reduce((sum, id) => {
                const active = activeTaxesMap.get(id);
                const rate = Number.isFinite(Number(active?.rate)) ? Number(active?.rate) : fallbackMap.get(id) ?? 0;
                return sum + (Number.isFinite(rate) ? rate : 0);
            }, 0);

            return Number.isFinite(total) ? Number(total.toFixed(4)) : 0;
        },
        [activeTaxesMap]
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

    const loadInitialData = useCallback(async () => {
        try {
            const attributesPromise = getAttributes(true).catch((attrErr) => {
                console.error('Error loading attributes', attrErr);
                return [];
            });

            const [supplierData, categoryData, inventoryFilters, taxData, attributesData] = await Promise.all([
                getSuppliers({ isActive: true }),
                getCategories({ isActive: true }),
                getInventoryFilters(),
                getActiveTaxes(),
                attributesPromise,
            ]);

            setSuppliers(
                supplierData.map((supplier) => ({
                    id: supplier.id,
                    label: buildSupplierLabel(supplier),
                    paymentTermDays: supplier.defaultPaymentTermDays ?? null,
                }))
            );

            setCategories(
                categoryData.map((category) => ({
                    id: category.id,
                    label: category.name,
                }))
            );



            setStorages(
                inventoryFilters.storages.map((storage) => ({
                    id: storage.id,
                    label: buildStorageOptionLabel(storage),
                    branchId: storage.branchId ?? null,
                }))
            );

            setActiveTaxes(
                taxData.map((tax) => ({
                    id: tax.id,
                    name: tax.name,
                    rate: Number(tax.rate ?? 0),
                    code: tax.code,
                }))
            );

            const attributeMap = Array.isArray(attributesData)
                ? Object.fromEntries(attributesData.map((attribute) => [attribute.id, attribute.name]))
                : {};
            setAttributeNames(attributeMap);
        } catch (err) {
            console.error('Error loading purchase order metadata', err);
            error('No fue posible cargar los datos iniciales');
        } finally {
            setTaxesLoaded(true);
        }
    }, [error]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);



    const loadProducts = useCallback(async (term: string, category: string | null, page: number = 1) => {
        setLoadingProducts(true);
        try {
            const data = await searchProductsForPurchase({
                search: term || undefined,
                categoryId: category || undefined,
                page,
                pageSize,
            });
            setProductResults(data.items);
            setTotalProducts(data.total);
            setCurrentPage(page);
        } catch (err) {
            console.error('Error searching products for purchase order', err);
            error('No fue posible cargar productos');
        } finally {
            setLoadingProducts(false);
        }
    }, [error, pageSize]);

    useEffect(() => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }
        searchTimeout.current = setTimeout(() => {
            loadProducts(searchTerm, categoryId, 1);
        }, 300);

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchTerm, categoryId, loadProducts]);

    const handleAddProduct = useCallback((variantId: string) => {
        const product = productResults.find((item) => item.variantId === variantId);
        if (!product) return;

        const fallbackRates = product.taxes ?? [];
        const defaultSelection = getDefaultTaxSelection();
        const defaultSelectedTaxIds = enforceExemptRules(defaultSelection);
        const defaultTaxRate = computeCombinedRate(defaultSelectedTaxIds, fallbackRates);

        setLines((prev) => {
            const existingIndex = prev.findIndex((line) => line.variantId === variantId);
            if (existingIndex !== -1) {
                const updated = [...prev];
                const existing = updated[existingIndex];
                const enforcedSelection = enforceExemptRules(existing.selectedTaxIds ?? []);
                const appliedSelection = enforcedSelection.length > 0 ? enforcedSelection : enforceExemptRules(getDefaultTaxSelection());
                const lineFallbackRates = existing.taxes?.map((tax) => ({ id: tax.id, rate: tax.rate })) ?? fallbackRates;
                const allowDecimals = existing.allowDecimals ?? true;
                const nextQuantity = sanitizeLineQuantity(existing.quantity + 1, allowDecimals);
                updated[existingIndex] = {
                    ...existing,
                    quantity: nextQuantity,
                    selectedTaxIds: appliedSelection,
                    taxRate: computeCombinedRate(appliedSelection, lineFallbackRates),
                };
                return updated;
            }

            const defaultPrice = product.pmp ?? product.baseCost ?? product.basePrice ?? 0;
            const allowDecimals = product.allowDecimals ?? true;
            const newLine: OrderLine = {
                ...product,
                quantity: sanitizeLineQuantity(1, allowDecimals),
                unitPrice: defaultPrice,
                unitCost: defaultPrice,
                taxRate: defaultTaxRate,
                selectedTaxIds: defaultSelectedTaxIds,
            };
            return [...prev, newLine];
        });
    }, [productResults, getDefaultTaxSelection, enforceExemptRules, computeCombinedRate]);

    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragOver(false);
        const variantId = event.dataTransfer.getData('text/plain');
        if (variantId) {
            handleAddProduct(variantId);
        }
    }, [handleAddProduct]);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleQuantityChange = useCallback((variantId: string, quantity: number) => {
        setLines((prev) =>
            prev.map((line) => {
                if (line.variantId !== variantId) {
                    return line;
                }
                const allowDecimals = line.allowDecimals ?? true;
                return {
                    ...line,
                    quantity: sanitizeLineQuantity(quantity, allowDecimals),
                };
            })
        );
    }, []);

    const handlePriceChange = useCallback((variantId: string, value: number) => {
        setLines((prev) => prev.map((line) => (
            line.variantId === variantId
                ? { ...line, unitPrice: value }
                : line
        )));
    }, []);

    const handleToggleTax = useCallback((variantId: string, taxId: string, enabled: boolean) => {
        const isExemptToggle = exemptTaxId !== null && taxId === exemptTaxId;

        setLines((prev) => prev.map((line) => {
            if (line.variantId !== variantId) {
                return line;
            }

            let nextSelection: string[];

            if (isExemptToggle) {
                nextSelection = enabled ? [taxId] : getDefaultTaxSelection();
            } else {
                const selectionSet = new Set(line.selectedTaxIds ?? []);
                if (enabled) {
                    selectionSet.add(taxId);
                    if (exemptTaxId) {
                        selectionSet.delete(exemptTaxId);
                    }
                } else {
                    selectionSet.delete(taxId);
                }
                nextSelection = Array.from(selectionSet);
            }

            const enforcedSelection = enforceExemptRules(nextSelection);
            const finalSelection = enforcedSelection.length > 0
                ? enforcedSelection
                : enforceExemptRules(getDefaultTaxSelection());

            const fallbackRates = line.taxes?.map((tax) => ({ id: tax.id, rate: tax.rate })) ?? [];
            const recalculatedRate = computeCombinedRate(finalSelection, fallbackRates);

            return {
                ...line,
                selectedTaxIds: finalSelection,
                taxRate: recalculatedRate,
            };
        }));
    }, [exemptTaxId, getDefaultTaxSelection, enforceExemptRules, computeCombinedRate]);

    useEffect(() => {
        if (!taxesLoaded) {
            return;
        }

        setLines((prev) => {
            let changed = false;
            const updated = prev.map((line) => {
                const selected = Array.isArray(line.selectedTaxIds) ? line.selectedTaxIds : [];
                const enforced = enforceExemptRules(selected);
                const appliedSelection = enforced.length > 0
                    ? enforced
                    : enforceExemptRules(getDefaultTaxSelection());
                const fallbackRates = line.taxes?.map((tax) => ({ id: tax.id, rate: tax.rate })) ?? [];
                const totalRate = computeCombinedRate(appliedSelection, fallbackRates);

                if (areSameSelection(line.selectedTaxIds, appliedSelection) && totalRate === line.taxRate) {
                    return line;
                }

                changed = true;
                return {
                    ...line,
                    selectedTaxIds: appliedSelection,
                    taxRate: totalRate,
                };
            });
            return changed ? updated : prev;
        });
    }, [taxesLoaded, enforceExemptRules, getDefaultTaxSelection, computeCombinedRate, areSameSelection]);

    const handleRemoveLine = useCallback((variantId: string) => {
        setLines((prev) => prev.filter((line) => line.variantId !== variantId));
    }, []);

    const totals = useMemo(() => {
        const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
        const taxes = lines.reduce((sum, line) => {
            const base = line.quantity * line.unitPrice;
            const rate = Number(line.taxRate ?? 0);
            const sanitizedRate = Number.isFinite(rate) ? rate : 0;
            return sum + base * (sanitizedRate / 100);
        }, 0);
        return {
            subtotal,
            taxes,
            total: subtotal + taxes,
        };
    }, [lines]);

    const isSubmitDisabled = useMemo(() => {
        return submitting || !supplierId || !storageId || lines.length === 0;
    }, [submitting, supplierId, storageId, lines.length]);

    const handleSubmit = useCallback(async () => {
        if (!supplierId) {
            error('Selecciona un proveedor');
            return;
        }
        if (!storageId) {
            error('Selecciona un almacén de destino');
            return;
        }
        if (lines.length === 0) {
            error('Agrega al menos un producto');
            return;
        }

        setSubmitting(true);
        try {
            const result: PurchaseOrderActionResult = await createPurchaseOrder({
                supplierId,
                storageId,
                reference: reference || undefined,
                notes: notes || undefined,
                expectedDate: expectedDate || undefined,
                lines: lines.map((line) => ({
                    productVariantId: line.variantId,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    unitCost: line.unitCost,
                    taxRate: line.taxRate,
                })),
            });

            if (!result.success) {
                if (result.error && result.error.toLowerCase().includes('no autenticado')) {
                    error('Tu sesión ha expirado. Inicia sesión nuevamente para crear órdenes.');
                    router.push('/');
                    return;
                }

                error(result.error || 'No se pudo crear la orden de compra');
                return;
            }

            success('Orden de compra creada');
            router.push('/admin/purchasing/purchase-orders');
        } catch (err) {
            console.error('Error creating purchase order', err);
            error(err instanceof Error ? err.message : 'Error al crear la orden de compra');
        } finally {
            setSubmitting(false);
        }
    }, [supplierId, storageId, reference, notes, expectedDate, lines, success, error, router]);

    return (
        <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
                <aside className="space-y-4">
                    <div className="border border-border rounded-md p-4 space-y-3">
                        <Select
                            label="Categoría"
                            options={categories}
                            value={categoryId}
                            onChange={(value) => setCategoryId(value ? String(value) : null)}
                            allowClear
                            variant="default"
                        />
                        <TextField
                            label="Buscar productos"
                            placeholder="Nombre, SKU o marca"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            startIcon="search"
                        />
                    </div>

                    <div className="border border-border rounded-md p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase">Catálogo</h2>
                            {loadingProducts && <DotProgress size={12} totalSteps={3} />}
                        </div>

                        {totalProducts > pageSize && (
                            <div className="flex items-center justify-between py-2 border-b border-border">
                                <span className="text-[11px] text-muted-foreground">
                                    {currentPage} de {Math.ceil(totalProducts / pageSize)}
                                </span>
                                <div className="flex gap-1">
                                    <IconButton
                                        icon="chevron_left"
                                        variant="basicSecondary"
                                        size="xs"
                                        onClick={() => loadProducts(searchTerm, categoryId, currentPage - 1)}
                                        disabled={currentPage <= 1 || loadingProducts}
                                    />
                                    <IconButton
                                        icon="chevron_right"
                                        variant="basicSecondary"
                                        size="xs"
                                        onClick={() => loadProducts(searchTerm, categoryId, currentPage + 1)}
                                        disabled={currentPage >= Math.ceil(totalProducts / pageSize) || loadingProducts}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                            {productResults.length === 0 && !loadingProducts && (
                                <p className="text-xs text-muted-foreground">
                                    No se encontraron productos. Ajusta los filtros o busca por nombre/SKU.
                                </p>
                            )}
                            {productResults.map((product) => {
                                const attrLabel = attributeLabel(product.attributeValues, attributeNames);
                                return (
                                    <div
                                        key={product.variantId}
                                        className="border border-border rounded-md p-3 flex flex-col gap-2 hover:shadow-sm transition cursor-grab"
                                        draggable
                                        onDragStart={(event) => {
                                            event.dataTransfer.setData('text/plain', product.variantId);
                                            event.dataTransfer.effectAllowed = 'move';
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{product.productName}</p>
                                                <p className="text-xs text-muted-foreground">SKU {product.sku}</p>
                                                {attrLabel && (
                                                    <p className="text-xs text-muted-foreground">{attrLabel}</p>
                                                )}
                                            </div>
                                            <IconButton
                                                icon="add"
                                                variant="basicSecondary"
                                                size="xs"
                                                onClick={() => handleAddProduct(product.variantId)}
                                                title="Agregar a la orden"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>PMP: {currencyFormatter.format(product.pmp)}</span>
                                            <span>UM: {product.unitOfMeasure}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <p className="text-[11px] text-muted-foreground italic">
                            Puedes arrastrar un producto al panel de la derecha o utilizar el botón “+”.
                        </p>
                    </div>
                </aside>

                <section
                    className={`border border-border rounded-md bg-background p-5 space-y-5 transition-colors ${
                        isDragOver ? 'ring-2 ring-primary/50' : ''
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Orden de compra</h2>
                            <p className="text-sm text-muted-foreground">
                                Completa los datos y confirma la solicitud al proveedor seleccionado.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Select
                                label="Proveedor"
                                options={suppliers}
                                value={supplierId}
                                onChange={(value) => setSupplierId(value ? String(value) : null)}
                                allowClear
                                variant="default"
                                required
                            />
                            <Select
                                label="Almacén destino"
                                options={storages}
                                value={storageId}
                                onChange={(value) => setStorageId(value ? String(value) : null)}
                                allowClear
                                variant="default"
                                required
                                disabled={storages.length === 0}
                            />
                            <TextField
                                label="Referencia externa"
                                value={reference}
                                onChange={(event) => setReference(event.target.value)}
                                placeholder="Referencia externa - número de cotización, contrato, etc."
                            />
                            <TextField
                                label="Fecha esperada"
                                type="date"
                                value={expectedDate}
                                onChange={(event) => setExpectedDate(event.target.value)}
                                className="ml-auto w-full sm:w-48 [&_input]:text-right"
                            />
                        </div>
                    </header>

                    {/* Se eliminó la fila extra de fecha esperada, ahora está junto a proveedor, almacén y referencia */}

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Detalle</h3>
                            <Badge variant={lines.length > 0 ? 'primary' : 'secondary'}>
                                {lines.length} productos
                            </Badge>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                                        <th className="py-2 pr-3">Producto</th>
                                        <th className="py-2 pr-3">Cantidad</th>
                                        <th className="py-2 pr-3">Precio neto</th>
                                        <th className="py-2 pr-3">Impuestos</th>
                                        <th className="py-2 pr-3 text-right">Subtotal neto</th>
                                        <th className="py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                                                Arrastra productos desde la izquierda o utiliza el botón “+” para agregarlos a la orden.
                                            </td>
                                        </tr>
                                    )}
                                    {lines.map((line) => {
                                        const totalLine = line.quantity * line.unitPrice;
                                        const rate = Number(line.taxRate ?? 0);
                                        const sanitizedRate = Number.isFinite(rate) ? rate : 0;
                                        const attributeEntries = Object.entries(line.attributeValues ?? {}).filter(([, value]) => Boolean(value));
                                        const allowDecimals = line.allowDecimals ?? true;
                                        return (
                                            <tr key={line.variantId} className="border-b border-border/60">
                                                <td className="py-3 pr-3 align-top">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground">{line.productName}</span>
                                                        <span className="text-xs text-muted-foreground">SKU {line.sku}</span>
                                                        {attributeEntries.length > 0 && (
                                                            <ul className="mt-1 space-y-0.5">
                                                                {attributeEntries.map(([key, value]) => (
                                                                    <li key={key} className="text-xs text-muted-foreground">
                                                                        <span className="font-medium text-foreground/80">
                                                                            {attributeNames[key] ?? formatAttributeKey(key)}:
                                                                        </span>{' '}
                                                                        {value}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-3 align-top">
                                                    <div className="w-32">
                                                        <NumberStepper
                                                            value={line.quantity}
                                                            onChange={(value) => handleQuantityChange(line.variantId, value)}
                                                            step={allowDecimals ? DECIMAL_STEP : 1}
                                                            min={allowDecimals ? DECIMAL_STEP : 1}
                                                            allowNegative={false}
                                                            allowFloat={allowDecimals}
                                                            className="text-center"
                                                            data-test-id={`purchase-order-line-${line.variantId}-quantity`}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-3 align-top">
                                                    <TextField
                                                        label="Precio"
                                                        type="currency"
                                                        value={String(Math.max(0, Math.floor(line.unitPrice)))}
                                                        placeholder=""
                                                        aria-label="Precio"
                                                        currencySymbol="$"
                                                        inputMode="numeric"
                                                        onChange={(event) => {
                                                            const raw = event.target.value ?? '';
                                                            const parsed = Number(raw.replace(/[^\d]/g, ''));
                                                            const sanitized = Number.isFinite(parsed) ? parsed : 0;
                                                            handlePriceChange(line.variantId, sanitized);
                                                        }}
                                                        className="w-32 [&_[data-test-id='text-field-label']]:hidden [&_label]:hidden"
                                                    />
                                                </td>
                                                <td className="py-3 pr-3 align-top">
                                                    {activeTaxes.length === 0 ? (
                                                        <span className="text-xs text-muted-foreground">Sin impuestos configurados</span>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {activeTaxes.map((tax) => {
                                                                const isChecked = line.selectedTaxIds?.includes(tax.id) ?? false;
                                                                return (
                                                                    <div key={tax.id} className="flex items-center justify-between gap-3">
                                                                        <Switch
                                                                            checked={isChecked}
                                                                            onChange={(checked) => handleToggleTax(line.variantId, tax.id, checked)}
                                                                            label={tax.name}
                                                                            labelPosition="right"
                                                                        />
                                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">{Number(tax.rate ?? 0)}%</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 pr-3 align-top text-right">
                                                    <span className="font-semibold text-foreground">
                                                        {currencyFormatter.format(totalLine)}
                                                    </span>
                                                </td>
                                                <td className="py-3 align-top text-right">
                                                    <IconButton
                                                        icon="delete"
                                                        variant="basicSecondary"
                                                        size="xs"
                                                        onClick={() => handleRemoveLine(line.variantId)}
                                                        title="Quitar producto"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-medium text-muted-foreground" htmlFor="order-notes">
                            Notas para el proveedor
                        </label>
                        <textarea
                            id="order-notes"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            rows={4}
                            className="w-full border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="Condiciones de entrega, observaciones, etc."
                        />
                    </div>

                    <footer className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between gap-12">
                                <span className="text-muted-foreground">Subtotal neto</span>
                                <span className="font-medium">{currencyFormatter.format(totals.subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-12">
                                <span className="text-muted-foreground">Impuestos</span>
                                <span className="font-medium">{currencyFormatter.format(totals.taxes)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-12 text-base font-semibold">
                                <span>Total</span>
                                <span>{currencyFormatter.format(totals.total)}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Los impuestos y descuentos se aplicarán según la configuración del producto al registrar la orden.
                            </p>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => router.push('/admin/purchasing/purchase-orders')}
                                type="button"
                                disabled={submitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSubmit}
                                disabled={isSubmitDisabled}
                                loading={submitting}
                                type="button"
                            >
                                Guardar orden
                            </Button>
                        </div>
                    </footer>
                </section>
            </div>
        </div>
    );
};

export default NewPurchaseOrderPage;
