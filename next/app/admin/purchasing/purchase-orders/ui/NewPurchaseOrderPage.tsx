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
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [lines, setLines] = useState<OrderLine[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [activeTaxes, setActiveTaxes] = useState<TaxOption[]>([]);
    const [taxesLoaded, setTaxesLoaded] = useState(false);

    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    const activeTaxesMap = useMemo(() => new Map(activeTaxes.map((tax) => [tax.id, tax])), [activeTaxes]);

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



    const loadProducts = useCallback(async (term: string, category: string | null) => {
        setLoadingProducts(true);
        try {
            const data = await searchProductsForPurchase({
                search: term || undefined,
                categoryId: category || undefined,
            });
            setProductResults(data);
        } catch (err) {
            console.error('Error searching products for purchase order', err);
            error('No fue posible cargar productos');
        } finally {
            setLoadingProducts(false);
        }
    }, [error]);

    useEffect(() => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }
        searchTimeout.current = setTimeout(() => {
            loadProducts(searchTerm, categoryId);
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

        const computeRate = (ids: string[], fallbackRates: { id: string; rate: number }[]) => {
            const totalRaw = ids.reduce((sum, id) => {
                const match = activeTaxesMap.get(id) ?? fallbackRates.find((tax) => tax.id === id);
                return sum + Number(match?.rate ?? 0);
            }, 0);
            return Number.isFinite(totalRaw) ? Number(totalRaw.toFixed(4)) : 0;
        };

        const activeTaxIds = Array.from(activeTaxesMap.keys());
        const productTaxIds = product.taxes.map((tax) => tax.id).filter(Boolean);
        const defaultSelectedTaxIds = (() => {
            if (productTaxIds.length > 0) {
                return taxesLoaded ? productTaxIds.filter((id) => activeTaxesMap.has(id)) : productTaxIds;
            }
            if (activeTaxIds.length > 0) {
                return activeTaxIds;
            }
            return [];
        })();

        setLines((prev) => {
            const existingIndex = prev.findIndex((line) => line.variantId === variantId);
            const defaultTaxRate = computeRate(defaultSelectedTaxIds, product.taxes);
            if (existingIndex !== -1) {
                const updated = [...prev];
                const existing = updated[existingIndex];
                const hasSelected = Array.isArray(existing.selectedTaxIds);
                const selectedTaxIds = hasSelected ? existing.selectedTaxIds : defaultSelectedTaxIds;
                const fallbackRates = existing.taxes?.map((tax) => ({ id: tax.id, rate: tax.rate })) ?? product.taxes;
                const recalculatedRate = computeRate(selectedTaxIds, fallbackRates);
                updated[existingIndex] = {
                    ...existing,
                    quantity: Number(existing.quantity + 1),
                    selectedTaxIds,
                    taxRate: recalculatedRate,
                };
                return updated;
            }

            const defaultPrice = product.pmp ?? product.baseCost ?? product.basePrice ?? 0;
            const newLine: OrderLine = {
                ...product,
                quantity: 1,
                unitPrice: defaultPrice,
                unitCost: defaultPrice,
                taxRate: defaultTaxRate,
                selectedTaxIds: defaultSelectedTaxIds,
            };
            return [...prev, newLine];
        });
    }, [productResults, activeTaxesMap, taxesLoaded]);

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
        setLines((prev) => prev.map((line) => (
            line.variantId === variantId
                ? { ...line, quantity } 
                : line
        )));
    }, []);

    const handlePriceChange = useCallback((variantId: string, value: number) => {
        setLines((prev) => prev.map((line) => (
            line.variantId === variantId
                ? { ...line, unitPrice: value }
                : line
        )));
    }, []);

    const handleToggleTax = useCallback((variantId: string, taxId: string, enabled: boolean) => {
        setLines((prev) => prev.map((line) => {
            if (line.variantId !== variantId) {
                return line;
            }

            const baseSelected = line.selectedTaxIds || [];
            const updatedSelected = enabled
                ? Array.from(new Set([...baseSelected, taxId]))
                : baseSelected.filter((id) => id !== taxId);

            const filteredSelection = updatedSelected.filter((id) => activeTaxesMap.has(id));

            const totalRateRaw = filteredSelection.reduce((sum, id) => {
                const match = activeTaxesMap.get(id);
                return sum + Number(match?.rate ?? 0);
            }, 0);
            const totalRate = Number.isFinite(totalRateRaw) ? Number(totalRateRaw.toFixed(4)) : 0;

            return {
                ...line,
                selectedTaxIds: filteredSelection,
                taxRate: totalRate,
            };
        }));
    }, [activeTaxesMap]);

    useEffect(() => {
        if (!taxesLoaded) {
            return;
        }

        setLines((prev) => {
            let changed = false;
            const updated = prev.map((line) => {
                const selected = Array.isArray(line.selectedTaxIds) ? line.selectedTaxIds : [];
                const filteredSelected = selected.filter((id) => activeTaxesMap.has(id));
                const appliedSelected = filteredSelected.length > 0 || activeTaxesMap.size === 0
                    ? filteredSelected
                    : Array.from(activeTaxesMap.keys());
                const totalRateRaw = appliedSelected.reduce((sum, id) => {
                    const match = activeTaxesMap.get(id);
                    return sum + Number(match?.rate ?? 0);
                }, 0);
                const totalRate = Number.isFinite(totalRateRaw) ? Number(totalRateRaw.toFixed(4)) : 0;
                if (
                    totalRate === line.taxRate &&
                    appliedSelected.length === (line.selectedTaxIds?.length ?? 0) &&
                    appliedSelected.every((id) => line.selectedTaxIds?.includes(id))
                ) {
                    return line;
                }
                changed = true;
                return {
                    ...line,
                    selectedTaxIds: appliedSelected,
                    taxRate: totalRate,
                };
            });
            return changed ? updated : prev;
        });
    }, [activeTaxesMap, taxesLoaded]);

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
                throw new Error(result.error || 'No se pudo crear la orden');
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
                                                    <TextField
                                                        label="Cantidad"
                                                        type="number"
                                                        value={String(line.quantity)}
                                                        placeholder=""
                                                        aria-label="Cantidad"
                                                        onChange={(event) => {
                                                            const parsed = Number(event.target.value);
                                                            const sanitized = Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
                                                            handleQuantityChange(line.variantId, sanitized);
                                                        }}
                                                        min={1}
                                                        step={1}
                                                        className="w-24 [&_[data-test-id='text-field-label']]:hidden [&_label]:hidden"
                                                    />
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
