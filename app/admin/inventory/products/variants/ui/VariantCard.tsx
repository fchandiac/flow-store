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
    isDefault: boolean;
    isActive: boolean;
    priceListItems?: VariantPriceListItem[];
}

interface VariantCardProps {
    variant: VariantType;
    attributeNames?: Record<string, string>;
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
    'data-test-id': dataTestId 
}) => {
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openUpdateDialog, setOpenUpdateDialog] = useState(false);

    const attributeEntries = Object.entries(variant.attributeValues ?? {}).filter(([, value]) => Boolean(value));
    const headerTitle = attributeEntries.length > 0
        ? (variant.isDefault ? 'Variante principal' : 'Variante')
        : (variant.displayName || 'Default');

    return (
        <>
            <div 
                className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-sm transition-shadow"
                data-test-id={dataTestId}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="font-medium text-neutral-800">
                                {headerTitle}
                            </h4>
                            {variant.isDefault && (
                                <Badge variant="info-outlined">
                                    Default
                                </Badge>
                            )}
                            <Badge variant={variant.isActive ? 'success-outlined' : 'secondary-outlined'}>
                                {variant.isActive ? 'Activa' : 'Inactiva'}
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
                        {!variant.isDefault && (
                            <IconButton
                                icon="delete"
                                variant="basicSecondary"
                                size="xs"
                                onClick={() => setOpenDeleteDialog(true)}
                                data-test-id={`delete-variant-${variant.id}`}
                            />
                        )}
                    </div>
                </div>

                {/* Precios */}
                <div className="flex items-center gap-6 mt-4 pt-3 border-t border-neutral-100">
                    <div>
                        <span className="text-xs text-neutral-500">Precio</span>
                        <p className="font-semibold text-neutral-800">{formatCurrency(variant.basePrice)}</p>
                    </div>
                    <div>
                        <span className="text-xs text-neutral-500">Unidad</span>
                        <p className="font-medium text-neutral-600">{variant.unitOfMeasure}</p>
                    </div>
                    <div>
                        <span className="text-xs text-neutral-500">Costo</span>
                        <p className="text-sm text-neutral-400">(PMP por desarrollar)</p>
                    </div>
                </div>

                {variant.priceListItems && variant.priceListItems.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-neutral-100">
                        <span className="text-xs text-neutral-500">Listas de precios</span>
                        <div className="mt-2 flex flex-col gap-2">
                            {variant.priceListItems.map((item) => (
                                <div key={`${variant.id}-${item.priceListId}`} className="flex flex-col text-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-medium text-neutral-700 truncate">{item.priceListName}</span>
                                        <span className="font-semibold text-neutral-800 whitespace-nowrap">
                                            {formatCurrency(item.grossPrice, item.currency)}
                                        </span>
                                    </div>
                                    <span className="text-xs text-neutral-500">
                                        Neto {formatCurrency(item.netPrice, item.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <UpdateVariantDialog
                open={openUpdateDialog}
                onClose={() => setOpenUpdateDialog(false)}
                variant={variant}
                data-test-id={`update-variant-dialog-${variant.id}`}
            />

            <DeleteVariantDialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                variant={variant}
                data-test-id={`delete-variant-dialog-${variant.id}`}
            />
        </>
    );
};

export default VariantCard;
