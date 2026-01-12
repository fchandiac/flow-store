'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
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
        <div className="h-full flex bg-gray-50">
            {/* COLUMNA IZQUIERDA - Búsqueda */}
            <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Nueva Recepción</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Datos generales */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase">Datos Generales</h3>

                        <Select
                            label="Proveedor *"
                            options={suppliers}
                            value={supplierId ?? ''}
                            onChange={(value) => setSupplierId(value as string)}
                            placeholder="Seleccionar proveedor"
                            disabled={!!selectedPurchaseOrder}
                        />

                        <Select
                            label="Almacén *"
                            options={storages}
                            value={storageId ?? ''}
                            onChange={(value) => setStorageId(value as string)}
                            placeholder="Seleccionar almacén"
                        />

                        <TextField
                            label="Fecha de Recepción"
                            type="date"
                            value={receptionDate}
                            onChange={(e) => setReceptionDate(e.target.value)}
                        />

                        {!selectedPurchaseOrder && (
                            <TextField
                                label="Referencia"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="Número de factura, guía, etc."
                            />
                        )}
                    </div>

                    {/* Lista de órdenes de compra pendientes */}
                    {!selectedPurchaseOrder && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase">
                                Órdenes de Compra Pendientes
                            </h3>

                            {loadingPurchaseOrders && (
                                <div className="flex justify-center py-4">
                                    <DotProgress size={16} />
                                </div>
                            )}

                            {!loadingPurchaseOrders && purchaseOrderResults.length === 0 && (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    No hay órdenes pendientes
                                </div>
                            )}

                            {purchaseOrderResults.length > 0 && (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {purchaseOrderResults.map((order) => (
                                        <button
                                            key={order.id}
                                            onClick={() => handleSelectPurchaseOrder(order)}
                                            className="w-full p-4 bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-lg text-left transition-all shadow-sm hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="font-mono text-sm font-bold text-blue-600">
                                                    {order.documentNumber}
                                                </div>
                                                <Badge variant="info">
                                                    {order.lines.length} items
                                                </Badge>
                                            </div>
                                            <div className="text-sm font-medium text-gray-900 mb-1">
                                                {order.supplierName}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-gray-500">
                                                    {new Date(order.createdAt).toLocaleDateString('es-CL')}
                                                </div>
                                                <div className="text-sm font-semibold text-gray-900">
                                                    {currencyFormatter.format(order.total)}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Buscar productos - siempre habilitado */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase">
                            {selectedPurchaseOrder ? 'Agregar Productos Extras' : 'Buscar Productos'}
                        </h3>
                        {selectedPurchaseOrder && (
                            <p className="text-xs text-gray-500">
                                Puedes agregar productos adicionales a la recepción
                            </p>
                        )}
                        <TextField
                            label="Buscar Producto"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Nombre, SKU, código de barras..."
                        />

                        {loadingProducts && (
                            <div className="flex justify-center py-4">
                                <DotProgress size={16} />
                            </div>
                        )}

                        {productResults.length > 0 && (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {productResults.map((product) => {
                                    const variantAttributes = formatVariantAttributes(
                                        product.attributeValues,
                                        attributeNames
                                    );
                                    return (
                                        <button
                                            key={product.variantId}
                                            onClick={() => handleAddProduct(product)}
                                            className="w-full p-3 bg-gray-50 hover:bg-green-50 border border-gray-200 rounded text-left transition-colors"
                                        >
                                            <div className="font-medium text-sm text-gray-900">
                                                {product.productName}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                SKU: {product.sku}
                                            </div>
                                            {variantAttributes && (
                                                <div className="text-xs text-gray-500">
                                                    {variantAttributes}
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-1">
                                                {currencyFormatter.format(product.baseCost)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* COLUMNA DERECHA - Recepción */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 bg-white border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Productos a Recibir</h2>
                            {selectedPurchaseOrder && (
                                <div className="text-sm text-gray-600 mt-1">
                                    Orden: {selectedPurchaseOrder.documentNumber}
                                </div>
                            )}
                        </div>
                        {hasDiscrepancies && (
                            <Badge variant="warning">Con Discrepancias</Badge>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {lines.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            {selectedPurchaseOrder
                                ? 'Selecciona una orden de compra'
                                : 'Agrega productos para comenzar'}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {lines.map((line, index) => (
                                <div
                                    key={index}
                                    className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">
                                                {line.productName}
                                            </div>
                                            <div className="text-sm text-gray-600">SKU: {line.sku}</div>
                                        </div>
                                        <IconButton
                                            icon="delete"
                                            onClick={() => removeLine(index)}
                                            variant="ghost"
                                            size="sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {line.expectedQuantity !== undefined && (
                                            <TextField
                                                label="Cantidad Esperada"
                                                type="number"
                                                value={line.expectedQuantity.toString()}
                                                onChange={() => {}}
                                                disabled
                                            />
                                        )}
                                        <TextField
                                            label="Cantidad Recibida *"
                                            type="number"
                                            value={line.receivedQuantity.toString()}
                                            onChange={(e) =>
                                                updateLine(index, {
                                                    receivedQuantity: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                        />
                                        <TextField
                                            label="Precio Unitario"
                                            type="number"
                                            value={line.unitPrice.toString()}
                                            onChange={(e) =>
                                                updateLine(index, {
                                                    unitPrice: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                        />
                                    </div>

                                    {line.expectedQuantity !== undefined &&
                                        line.receivedQuantity !== line.expectedQuantity && (
                                            <Badge variant="warning">
                                                Diferencia:{' '}
                                                {quantityFormatter.format(
                                                    line.receivedQuantity - line.expectedQuantity
                                                )}
                                            </Badge>
                                        )}

                                    <TextField
                                        label="Notas"
                                        value={line.notes ?? ''}
                                        onChange={(e) => updateLine(index, { notes: e.target.value })}
                                        placeholder="Observaciones de calidad, estado, etc."
                                    />

                                    <div className="text-right text-sm font-semibold text-gray-900">
                                        Subtotal: {currencyFormatter.format(line.receivedQuantity * line.unitPrice)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Resumen y acciones */}
                <div className="bg-white border-t border-gray-200 p-4">
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notas Generales
                        </label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="Observaciones generales de la recepción"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>

                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Productos:</span>
                            <span className="font-medium">{lines.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Cantidad total:</span>
                            <span className="font-medium">
                                {quantityFormatter.format(
                                    lines.reduce((sum, l) => sum + l.receivedQuantity, 0)
                                )}{' '}
                                uds
                            </span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                            <span>Total:</span>
                            <span>{currencyFormatter.format(total)}</span>
                        </div>
                    </div>

                    <div className="mt-4 flex gap-3">
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
                            {submitting ? 'Confirmando...' : 'Confirmar Recepción'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
