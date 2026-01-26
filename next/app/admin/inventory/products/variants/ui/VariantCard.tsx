'use client';

import React, { useState } from 'react';
import Badge from '@/app/baseComponents/Badge/Badge';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import DeleteVariantDialog from './DeleteVariantDialog';
import UpdateVariantDialog from './UpdateVariantDialog';

export interface VariantPriceListItem {
    priceListId: string;
    priceListName: string;
    currency: string;
    netPrice: number;
    grossPrice: number;
    taxIds?: string[];
}

export interface VariantType {
    id: string;
    productId?: string;
    sku: string;
    barcode?: string;
    basePrice: number;
    baseCost: number;
    unitId: string;
    unitOfMeasure: string;
    /** Valores de atributos: { "attributeId": "opción" } */
    attributeValues?: Record<string, string>;
    /** Nombre generado para mostrar (ej: "Color: Rojo, Talla: M") */
    displayName: string;
    trackInventory: boolean;
    allowNegativeStock: boolean;
    isActive: boolean;
    weight?: number | null;
    weightUnit?: string | null;
    priceListItems?: VariantPriceListItem[];
}

interface VariantCardProps {
    variant: VariantType;
    attributeNames?: Record<string, string>;
    onVariantChange?: () => void;
    'data-test-id'?: string;
}

const formatCurrency = (value: number, currency = 'CLP') => {
    try {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(value);
    } catch {
        const formatted = Number.isFinite(value) ? value.toFixed(2) : String(value);
        return `${currency} ${formatted}`;
    }
};

const VariantCard: React.FC<VariantCardProps> = ({ 
    variant,
    attributeNames = {},
    onVariantChange,
    'data-test-id': dataTestId 
}) => {
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openUpdateDialog, setOpenUpdateDialog] = useState(false);

    const attributeEntries = Object.entries(variant.attributeValues ?? {}).filter(([, value]) => Boolean(value));

    return (
        <>
            <div 
                className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-sm transition-shadow"
                data-test-id={dataTestId}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Badge variant={variant.isActive ? 'success-outlined' : 'secondary-outlined'}>
                                {variant.isActive ? 'Variante activa' : 'Variante inactiva'}
                            </Badge>
                        </div>
                        <p className="text-sm text-neutral-500 mt-1">
                            SKU: {variant.sku}
                            {variant.barcode && <span className="ml-3">Código: {variant.barcode}</span>}
                        </p>
                        {attributeEntries.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {attributeEntries.map(([attrId, value]) => (
                                    <Badge key={attrId} variant="info-outlined">
                                        {attributeNames[attrId] ?? attrId}: {String(value)}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <IconButton
                            icon="edit"
                            variant="basicSecondary"
                            size="xs"
                            onClick={() => setOpenUpdateDialog(true)}
                            data-test-id={`edit-variant-${variant.id}`}
                        />
                        <IconButton
                            icon="delete"
                            variant="basicSecondary"
                            size="xs"
                            onClick={() => setOpenDeleteDialog(true)}
                            data-test-id={`delete-variant-${variant.id}`}
                        />
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 space-y-4">
                    <div className="flex flex-wrap items-start gap-6 text-sm text-neutral-600">
                        <div>
                            <span className="text-xs uppercase tracking-wide text-neutral-500 block">Unidad</span>
                            <span className="font-medium text-neutral-700">{variant.unitOfMeasure}</span>
                        </div>
                        <div>
                            <span className="text-xs uppercase tracking-wide text-neutral-500 block">Inventario</span>
                            <span>
                                {variant.trackInventory ? 'Controlado' : 'Sin control'}
                                {variant.trackInventory && variant.allowNegativeStock ? ' · Permite negativos' : ''}
                            </span>
                        </div>
                        {variant.weight && (
                            <div>
                                <span className="text-xs uppercase tracking-wide text-neutral-500 block">Peso</span>
                                <span className="font-medium text-neutral-700">{variant.weight} {variant.weightUnit || 'kg'}</span>
                            </div>
                        )}
                    </div>

                    {variant.priceListItems && variant.priceListItems.length > 0 ? (
                        <div className="space-y-2">
                            <span className="text-xs uppercase tracking-wide text-neutral-500">Precios por lista</span>
                            <div className="flex flex-col gap-2">
                                {variant.priceListItems.map((item) => (
                                    <div
                                        key={`${variant.id}-${item.priceListId}`}
                                        className="rounded-md border border-neutral-200 px-3 py-2 text-sm bg-neutral-50"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-medium text-neutral-800 truncate">
                                                {item.priceListName || 'Lista sin nombre'}
                                            </span>
                                            <span className="font-semibold text-neutral-900 whitespace-nowrap">
                                                {formatCurrency(item.grossPrice, item.currency)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-neutral-500 mt-1">
                                            <span>Neto</span>
                                            <span>{formatCurrency(item.netPrice, item.currency)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-md border border-dashed border-neutral-200 px-3 py-3 bg-neutral-50">
                            <p className="text-sm text-neutral-600">
                                Esta variante aún no tiene precios asignados a listas. Precio base actual:{' '}
                                <span className="font-medium text-neutral-800">
                                    {formatCurrency(variant.basePrice)}
                                </span>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <UpdateVariantDialog
                open={openUpdateDialog}
                onClose={() => setOpenUpdateDialog(false)}
                variant={variant}
                onUpdated={onVariantChange}
                data-test-id={`update-variant-dialog-${variant.id}`}
            />

            <DeleteVariantDialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                variant={variant}
                onDeleted={onVariantChange}
                data-test-id={`delete-variant-dialog-${variant.id}`}
            />
        </>
    );
};

export default VariantCard;
