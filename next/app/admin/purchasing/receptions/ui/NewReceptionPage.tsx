'use client';

import { Fragment, useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Select, { type Option as SelectOption } from '@/app/baseComponents/Select/Select';
import { TextField } from '@/app/baseComponents/TextField/TextField';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import { Button } from '@/app/baseComponents/Button/Button';
import Badge from '@/app/baseComponents/Badge/Badge';
import DotProgress from '@/app/baseComponents/DotProgress/DotProgress';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { getSuppliers } from '@/app/actions/suppliers';
import { getInventoryFilters } from '@/app/actions/inventory';
import { searchProductsForPurchase, type PurchaseOrderProductResult } from '@/app/actions/purchaseOrders';
import { getAttributes } from '@/app/actions/attributes';
import {
    searchPurchaseOrdersForReception,
    createReceptionFromPurchaseOrder,
    createDirectReception,
    type PurchaseOrderForReception,
    type ReceptionLineInput,
} from '@/app/actions/receptions';

interface SupplierOption extends SelectOption {
    value: string;
    label: string;
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

interface NewReceptionPageProps {
    onSuccess?: () => void;
}

export default function NewReceptionPage({ onSuccess }: NewReceptionPageProps) {
    const router = useRouter();
    const { success, error } = useAlert();

    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
    const [storages, setStorages] = useState<StorageOption[]>([]);
    const [attributeNames, setAttributeNames] = useState<Record<string, string>>({});

    const [supplierId, setSupplierId] = useState<string | null>(null);
    const [storageId, setStorageId] = useState<string | null>(null);
    const [receptionDate, setReceptionDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD
    });
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');

    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrderForReception | null>(null);
    const [purchaseOrderResults, setPurchaseOrderResults] = useState<PurchaseOrderForReception[]>([]);
    const [loadingPurchaseOrders, setLoadingPurchaseOrders] = useState(false);

    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<PurchaseOrderProductResult[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    const [lines, setLines] = useState<ReceptionLine[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const searchProductTimeout = useRef<NodeJS.Timeout | null>(null);

    // Cargar datos iniciales
    const loadInitialData = useCallback(async () => {
        try {
            const [suppliersData, filtersData, pendingOrders] = await Promise.all([
                getSuppliers(),
                getInventoryFilters(),
                searchPurchaseOrdersForReception(), // Sin parámetro, trae las últimas órdenes
            ]);

            setSuppliers(
                suppliersData.map((s) => ({
                    id: s.id,
                    value: s.id,
                    label: s.person?.businessName ?? s.person?.firstName ?? 'Proveedor',
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
        }
    }, [error]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // Búsqueda de productos
    useEffect(() => {
        if (searchProductTimeout.current) {
            clearTimeout(searchProductTimeout.current);
        }

        if (!productSearch.trim()) {
            setProductResults([]);
            return;
        }

        searchProductTimeout.current = setTimeout(async () => {
            setLoadingProducts(true);
            try {
                const results = await searchProductsForPurchase({ search: productSearch, limit: 20 });
                setProductResults(results);
            } catch (err) {
                console.error('Error searching products:', err);
            } finally {
                setLoadingProducts(false);
            }
        }, 300);
    }, [productSearch]);

    // Seleccionar orden de compra
    const handleSelectPurchaseOrder = (order: PurchaseOrderForReception) => {
        setSelectedPurchaseOrder(order);
        setSupplierId(order.supplierId);
        if (order.storageId) {
            setStorageId(order.storageId);
        }

        // Cargar líneas de la orden
        const orderLines: ReceptionLine[] = order.lines.map((line) => ({
            productVariantId: line.productVariantId,
            productName: line.productName,
            sku: line.sku,
            expectedQuantity: line.quantity,
            receivedQuantity: line.quantity, // Por defecto, recibir la cantidad esperada
            unitPrice: line.unitPrice,
            unitCost: line.unitCost,
            notes: '',
        }));

        setLines(orderLines);
    };

    // Agregar producto manualmente
    const handleAddProduct = (product: PurchaseOrderProductResult) => {
        const exists = lines.find((l) => l.productVariantId === product.variantId);
        if (exists) {
            error('El producto ya está en la lista');
            return;
        }

        const newLine: ReceptionLine = {
            productVariantId: product.variantId,
            productName: product.productName,
            sku: product.sku,
            receivedQuantity: 1,
            unitPrice: product.baseCost,
            unitCost: product.baseCost,
            notes: '',
        };

        setLines([...lines, newLine]);
        setProductSearch('');
        setProductResults([]);
    };

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
        const today = new Date();
        setReceptionDate(today.toISOString().split('T')[0]);
        setReference('');
        setNotes('');
        setSelectedPurchaseOrder(null);
        setProductSearch('');
        setProductResults([]);
        setLines([]);
        
        // Recargar órdenes pendientes
        try {
            const pendingOrders = await searchPurchaseOrdersForReception();
            setPurchaseOrderResults(pendingOrders);
        } catch (err) {
            console.error('Error reloading purchase orders:', err);
        }
    };

    // Calcular totales
    const subtotal = lines.reduce((sum, line) => sum + line.receivedQuantity * line.unitPrice, 0);
    const total = subtotal;

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

        setSubmitting(true);

        try {
            const receptionLines: ReceptionLineInput[] = lines.map((line) => ({
                productVariantId: line.productVariantId,
                expectedQuantity: line.expectedQuantity,
                receivedQuantity: line.receivedQuantity,
                unitPrice: line.unitPrice,
                unitCost: line.unitCost,
                notes: line.notes,
                qualityStatus: 'APPROVED',
            }));

            let result;

            if (selectedPurchaseOrder) {
                // Recepción con orden de compra
                result = await createReceptionFromPurchaseOrder({
                    purchaseOrderId: selectedPurchaseOrder.id,
                    storageId,
                    receptionDate,
                    notes,
                    lines: receptionLines,
                });
            } else {
                // Recepción directa
                result = await createDirectReception({
                    supplierId,
                    storageId,
                    receptionDate,
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
                } else {
                    router.push('/admin/purchasing/receptions');
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

    return (
        <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 xl:grid-cols-[320px,1fr,360px] gap-6">
                <aside className="space-y-4">
                    <div className="border border-border rounded-md bg-white p-4 space-y-4">
                        <div>
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase">Datos generales</h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Define el proveedor, almacén y fecha para la recepción.
                            </p>
                        </div>
                        <Select
                            label="Proveedor *"
                            options={suppliers}
                            value={supplierId ?? null}
                            onChange={(value) => setSupplierId((value as string) ?? null)}
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
                            onChange={(event) => setReceptionDate(event.target.value)}
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

                    {!selectedPurchaseOrder && (
                        <div className="border border-border rounded-md bg-white p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase">
                                    Órdenes pendientes
                                </h2>
                                {loadingPurchaseOrders && <DotProgress size={12} totalSteps={3} />}
                            </div>
                            {!loadingPurchaseOrders && purchaseOrderResults.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    No hay órdenes de compra pendientes de recepción.
                                </p>
                            )}
                            {purchaseOrderResults.length > 0 && (
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
                                                <span>{new Date(order.createdAt).toLocaleDateString('es-CL')}</span>
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
                        {productResults.length === 0 && productSearch && !loadingProducts && (
                            <p className="text-xs text-muted-foreground">
                                No se encontraron productos para "{productSearch}".
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
                                        >
                                            <div className="text-sm font-medium text-foreground">
                                                {product.productName}
                                            </div>
                                            <div className="text-xs text-muted-foreground">SKU {product.sku}</div>
                                            {variantAttributes && (
                                                <div className="text-xs text-muted-foreground">{variantAttributes}</div>
                                            )}
                                            <div className="mt-1 text-xs font-semibold text-foreground">
                                                {currencyFormatter.format(product.baseCost)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </aside>

                <section className="border border-border rounded-md bg-white p-5 space-y-5">
                    <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
                        {hasDiscrepancies && <Badge variant="warning">Con discrepancias</Badge>}
                    </header>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                                    <th className="py-2 pr-3">Producto</th>
                                    <th className="py-2 pr-3 text-right">Cant. esperada</th>
                                    <th className="py-2 pr-3 text-right">Cant. recibida</th>
                                    <th className="py-2 pr-3 text-right">Precio unitario</th>
                                    <th className="py-2 pr-3 text-right">Subtotal</th>
                                    <th className="py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
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

                                        return (
                                            <Fragment key={`${line.productVariantId ?? line.sku}-${index}`}>
                                                <tr className="border-b border-border/70 align-top">
                                                    <td className="py-3 pr-3">
                                                        <div className="font-medium text-foreground">
                                                            {line.productName}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">SKU {line.sku}</div>
                                                        {difference !== null && difference !== 0 && (
                                                            <div className="mt-2 inline-flex items-center gap-2">
                                                                <Badge variant="warning">
                                                                    Diferencia {quantityFormatter.format(difference)}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 pr-3 text-right text-sm text-muted-foreground">
                                                        {line.expectedQuantity !== undefined
                                                            ? quantityFormatter.format(line.expectedQuantity)
                                                            : '—'}
                                                    </td>
                                                    <td className="py-3 pr-3 text-right">
                                                        <TextField
                                                            label="Cantidad recibida"
                                                            type="number"
                                                            value={String(line.receivedQuantity)}
                                                            onChange={(event) => {
                                                                const parsed = Number(event.target.value);
                                                                const sanitized = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                                                                updateLine(index, { receivedQuantity: sanitized });
                                                            }}
                                                            min="0"
                                                            step="0.01"
                                                            className="ml-auto w-28 [&_[data-test-id='text-field-label']]:hidden"
                                                        />
                                                    </td>
                                                    <td className="py-3 pr-3 text-right">
                                                        <TextField
                                                            label="Precio unitario"
                                                            type="number"
                                                            value={String(line.unitPrice)}
                                                            onChange={(event) => {
                                                                const parsed = Number(event.target.value);
                                                                const sanitized = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                                                                updateLine(index, { unitPrice: sanitized });
                                                            }}
                                                            min="0"
                                                            step="0.01"
                                                            className="ml-auto w-28 [&_[data-test-id='text-field-label']]:hidden"
                                                        />
                                                    </td>
                                                    <td className="py-3 pr-3 text-right font-semibold text-foreground">
                                                        {currencyFormatter.format(subtotalLine)}
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <IconButton
                                                            icon="delete"
                                                            variant="text"
                                                            size="sm"
                                                            onClick={() => removeLine(index)}
                                                            title="Eliminar línea"
                                                        />
                                                    </td>
                                                </tr>
                                                <tr className="border-b border-border/40">
                                                    <td colSpan={6} className="pb-4 pr-3">
                                                        <TextField
                                                            label="Notas"
                                                            value={line.notes ?? ''}
                                                            onChange={(event) => updateLine(index, { notes: event.target.value })}
                                                            placeholder="Observaciones de calidad, estado, etc."
                                                            type="textarea"
                                                            rows={2}
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
                </section>

                <aside className="space-y-4">
                    <div className="border border-border rounded-md bg-white p-5 space-y-5">
                        <div>
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase">Resumen</h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Revisa el total y confirma la recepción cuando estés listo.
                            </p>
                        </div>
                        <TextField
                            label="Notas generales"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Observaciones generales de la recepción"
                            type="textarea"
                            rows={3}
                        />
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>Productos</span>
                                <span className="font-medium text-foreground">{lines.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>Cantidad total</span>
                                <span className="font-medium text-foreground">
                                    {quantityFormatter.format(lines.reduce((sum, line) => sum + line.receivedQuantity, 0))} uds
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold text-foreground">
                                <span>Total</span>
                                <span>{currencyFormatter.format(total)}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button
                                onClick={() => router.push('/admin/purchasing/receptions')}
                                variant="outlined"
                                className="flex-1"
                                disabled={submitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                variant="primary"
                                className="flex-1"
                                disabled={submitting || lines.length === 0}
                            >
                                {submitting ? 'Confirmando…' : 'Confirmar recepción'}
                            </Button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
