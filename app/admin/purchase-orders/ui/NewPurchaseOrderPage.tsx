'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Select, { type Option as SelectOption } from '@/app/baseComponents/Select/Select';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import Badge from '@/app/baseComponents/Badge/Badge';
import { Button } from '@/app/baseComponents/Button/Button';
import { useAlert } from '@/app/state/hooks/useAlert';
import { getSuppliers } from '@/app/actions/suppliers';
import { getCategories } from '@/app/actions/categories';
import { getInventoryFilters } from '@/app/actions/inventory';
import {
    createPurchaseOrder,
    searchProductsForPurchase,
    type PurchaseOrderProductResult,
    type PurchaseOrderActionResult,
} from '@/app/actions/purchaseOrders';

interface SupplierOption extends SelectOption {
    paymentTermDays?: number | null;
    code?: string | null;
}

interface BranchOption extends SelectOption {
    isHeadquarters?: boolean;
}

interface StorageOption extends SelectOption {
    branchId?: string | null;
}

interface OrderLine extends PurchaseOrderProductResult {
    quantity: number;
    unitPrice: number;
    unitCost: number;
    notes?: string;
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

const attributeLabel = (attributes?: Record<string, string> | null) => {
    if (!attributes) return '';
    const values = Object.values(attributes).filter(Boolean);
    return values.length ? values.join(' · ') : '';
};

const buildSupplierLabel = (supplier: Awaited<ReturnType<typeof getSuppliers>>[number]): string => {
    const person = supplier.person;
    if (person?.businessName) return person.businessName;
    const name = [person?.firstName, person?.lastName].filter(Boolean).join(' ');
    if (name) return name;
    return supplier.code || 'Proveedor';
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
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [storages, setStorages] = useState<StorageOption[]>([]);

    const [supplierId, setSupplierId] = useState<string | null>(null);
    const [branchId, setBranchId] = useState<string | null>(null);
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

    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    const loadInitialData = useCallback(async () => {
        try {
            const [supplierData, categoryData, inventoryFilters] = await Promise.all([
                getSuppliers({ isActive: true }),
                getCategories({ isActive: true }),
                getInventoryFilters(),
            ]);

            setSuppliers(
                supplierData.map((supplier) => ({
                    id: supplier.id,
                    label: buildSupplierLabel(supplier),
                    paymentTermDays: supplier.defaultPaymentTermDays ?? null,
                    code: supplier.code ?? null,
                }))
            );

            setCategories(
                categoryData.map((category) => ({
                    id: category.id,
                    label: category.name,
                }))
            );

            setBranches(
                inventoryFilters.branches.map((branch) => ({
                    id: branch.id,
                    label: buildBranchOptionLabel(branch),
                    isHeadquarters: branch.isHeadquarters,
                }))
            );

            setStorages(
                inventoryFilters.storages.map((storage) => ({
                    id: storage.id,
                    label: buildStorageOptionLabel(storage),
                    branchId: storage.branchId ?? null,
                }))
            );
        } catch (err) {
            console.error('Error loading purchase order metadata', err);
            error('No fue posible cargar los datos iniciales');
        }
    }, [error]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const filteredStorages = useMemo(() => {
        if (!branchId) return storages;
        return storages.filter((storage) => storage.branchId === branchId);
    }, [branchId, storages]);

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

        setLines((prev) => {
            const existingIndex = prev.findIndex((line) => line.variantId === variantId);
            if (existingIndex !== -1) {
                const updated = [...prev];
                const existing = updated[existingIndex];
                updated[existingIndex] = {
                    ...existing,
                    quantity: Number(existing.quantity + 1),
                };
                return updated;
            }

            const defaultPrice = product.baseCost > 0 ? product.baseCost : product.basePrice;
            const newLine: OrderLine = {
                ...product,
                quantity: 1,
                unitPrice: defaultPrice,
                unitCost: product.baseCost,
            };
            return [...prev, newLine];
        });
    }, [productResults]);

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

    const handleRemoveLine = useCallback((variantId: string) => {
        setLines((prev) => prev.filter((line) => line.variantId !== variantId));
    }, []);

    const totals = useMemo(() => {
        const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
        return {
            subtotal,
            total: subtotal,
        };
    }, [lines]);

    const isSubmitDisabled = useMemo(() => {
        return submitting || !supplierId || !branchId || lines.length === 0;
    }, [submitting, supplierId, branchId, lines.length]);

    const handleSubmit = useCallback(async () => {
        if (!supplierId) {
            error('Selecciona un proveedor');
            return;
        }
        if (!branchId) {
            error('Selecciona una sucursal para recibir la orden');
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
                branchId,
                storageId: storageId || undefined,
                reference: reference || undefined,
                notes: notes || undefined,
                expectedDate: expectedDate || undefined,
                lines: lines.map((line) => ({
                    productVariantId: line.variantId,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    unitCost: line.unitCost,
                })),
            });

            if (!result.success) {
                throw new Error(result.error || 'No se pudo crear la orden');
            }

            success('Orden de compra creada');
            router.push('/admin/purchase-orders');
        } catch (err) {
            console.error('Error creating purchase order', err);
            error(err instanceof Error ? err.message : 'Error al crear la orden de compra');
        } finally {
            setSubmitting(false);
        }
    }, [supplierId, branchId, storageId, reference, notes, expectedDate, lines, success, error, router]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
                <aside className="space-y-4">
                    <div className="border border-border rounded-md p-4 space-y-3">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase">Proveedor</h2>
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
                                const attrLabel = attributeLabel(product.attributeValues);
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
                                            <span>Costo: {currencyFormatter.format(product.baseCost)}</span>
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
                    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Orden de compra</h2>
                            <p className="text-sm text-muted-foreground">
                                Completa los datos y confirma la solicitud al proveedor seleccionado.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Select
                                label="Sucursal destino"
                                options={branches}
                                value={branchId}
                                onChange={(value) => {
                                    const nextBranch = value ? String(value) : null;
                                    setBranchId(nextBranch);
                                    if (nextBranch && storageId) {
                                        const storageBelongs = storages.some((storage) => storage.id === storageId && storage.branchId === nextBranch);
                                        if (!storageBelongs) {
                                            setStorageId(null);
                                        }
                                    }
                                }}
                                required
                                allowClear
                                variant="default"
                            />
                            <Select
                                label="Bodega"
                                options={filteredStorages}
                                value={storageId}
                                onChange={(value) => setStorageId(value ? String(value) : null)}
                                allowClear
                                variant="default"
                                disabled={filteredStorages.length === 0}
                            />
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextField
                            label="Referencia externa"
                            value={reference}
                            onChange={(event) => setReference(event.target.value)}
                            placeholder="Número de cotización, contrato, etc."
                        />
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-muted-foreground" htmlFor="expected-date">
                                Fecha esperada
                            </label>
                            <input
                                id="expected-date"
                                type="date"
                                value={expectedDate}
                                onChange={(event) => setExpectedDate(event.target.value)}
                                className="border border-border rounded-md px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>
                    </div>

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
                                        <th className="py-2 pr-3">Precio</th>
                                        <th className="py-2 pr-3 text-right">Total</th>
                                        <th className="py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                                                Arrastra productos desde la izquierda o utiliza el botón “+” para agregarlos a la orden.
                                            </td>
                                        </tr>
                                    )}
                                    {lines.map((line) => {
                                        const totalLine = line.quantity * line.unitPrice;
                                        return (
                                            <tr key={line.variantId} className="border-b border-border/60">
                                                <td className="py-3 pr-3 align-top">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground">{line.productName}</span>
                                                        <span className="text-xs text-muted-foreground">SKU {line.sku}</span>
                                                        {attributeLabel(line.attributeValues) && (
                                                            <span className="text-xs text-muted-foreground">{attributeLabel(line.attributeValues)}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-3 align-top">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        step={1}
                                                        value={line.quantity}
                                                        onChange={(event) => handleQuantityChange(line.variantId, Math.max(1, Number(event.target.value) || 1))}
                                                        className="w-24 border border-border rounded-md px-3 py-1 text-sm bg-background"
                                                    />
                                                </td>
                                                <td className="py-3 pr-3 align-top">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={0.01}
                                                        value={line.unitPrice}
                                                        onChange={(event) => handlePriceChange(line.variantId, Math.max(0, Number(event.target.value) || 0))}
                                                        className="w-28 border border-border rounded-md px-3 py-1 text-sm bg-background"
                                                    />
                                                </td>
                                                <td className="py-3 pr-3 align-top text-right">
                                                    <span className="font-semibold text-foreground">{currencyFormatter.format(totalLine)}</span>
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
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">{currencyFormatter.format(totals.subtotal)}</span>
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
                                onClick={() => router.push('/admin/purchase-orders')}
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
